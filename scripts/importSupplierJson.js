import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMPORTS_DIR = path.join(ROOT_DIR, 'data/imports');
const FALLBACK_INPUT_FILE = path.join(ROOT_DIR, 'data/supplier-products.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/products.js');
const REPORT_FILE = path.join(ROOT_DIR, 'supplier-refresh-report.json');
const INTERNAL_OUTPUT_FILE = path.join(ROOT_DIR, 'data/imports/raw/supplier-refresh-internal.json');
const LOG_PREFIX = '[LAZULE import]';
const GENERIC_CATEGORIES = new Set(['', 'catalogo', 'catálogo', 'todos', 'tudo', 'all', 'catalog']);

function createImportMetrics() {
  return {
    raw: 0,
    valid: 0,
    discarded: 0,
    promotionalNameFixed: 0,
    olfactoryReferenceExtracted: 0,
    withoutImage: 0,
  };
}

const UPDATABLE_FIELDS = new Set([
  'salePrice',
  'retailLine',
  'image',
  'sourceUrl',
  'category',
  'available',
  'stockIndicators',
  'supplierMetadata',
]);

const PRIVATE_FIELD_KEYS = new Set([
  'sourceUrl',
  'supplierUrl',
  'extractionSource',
  'rawExtraction',
  'supplierMetadata',
  'stockIndicators',
  'costPrice',
  'supplierCost',
  'supplierRetailPrice',
  'wholesalePrice',
  'margin',
  'margem',
  'profit',
]);

const PRIVATE_FIELD_PATTERNS = [/^supplier/i, /^private/i, /^debug/i, /^internal/i, /^raw/i, /source/i, /extract/i];

const PROTECTED_FIELDS = [
  'enrichedDescription',
  'aiSummary',
  'dna_vector',
  'semanticTags',
  'relationshipHints',
  'recommendationHints',
  'clusterAssignments',
  'editorialCopy',
  'manualCuration',
];

function log(message) {
  console.log(`${LOG_PREFIX} ${message}`);
}

function warn(message) {
  console.warn(`${LOG_PREFIX} [warn] ${message}`);
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 |.-]/g, '')
    .trim();
}

function normalizeTokenSet(value) {
  return new Set(normalizeComparisonText(value).split(' ').filter(Boolean));
}

function tokenOverlapScore(left, right) {
  if (!left.size || !right.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(left.size, right.size);
}

function normalizeComparisonText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:ref\.?\s*olfativa|referencia\s*olfativa|ref\.?|referencia)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isPromotionalName(value) {
  return /^-?\s*\d+\s*%\s*off$/i.test(normalizeWhitespace(value));
}

function normalizeRetailLine(value) {
  return normalizeWhitespace(value).replace(/(R\$\s*){2,}/gi, 'R$ ');
}

function stripReferenceFromText(value) {
  return removeOlfactoryReferenceSegments(value);
}

function removeOlfactoryReferenceSegments(value) {
  const description = normalizeWhitespace(value);
  const cleanedDescription = description.replace(
    /\b(?:ref(?:\.|\b)(?:\s*olfativa)?|refer[eê]ncia(?:\s*olfativa)?)\s*:?\s*[^\n\r]*/gi,
    ' ',
  );

  if (cleanedDescription === description) {
    return description;
  }

  return cleanedDescription
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,.;:!?|/-]+|[\s,.;:!?|/-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createComparisonIndex(value) {
  const source = String(value || '');
  let normalized = '';
  const positions = [];

  for (let index = 0; index < source.length; index += 1) {
    const normalizedCharacter = source[index]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (/^[a-z0-9]$/.test(normalizedCharacter)) {
      normalized += normalizedCharacter;
      positions.push({ start: index, end: index + 1 });
      continue;
    }

    if (normalized && !normalized.endsWith(' ')) {
      normalized += ' ';
      positions.push({ start: index, end: index + 1 });
    }
  }

  while (normalized.endsWith(' ')) {
    normalized = normalized.slice(0, -1);
    positions.pop();
  }

  return { normalized, positions, source };
}

function removeNormalizedTextSpan(value, normalizedNeedle) {
  const comparisonIndex = createComparisonIndex(value);
  const matchIndex = comparisonIndex.normalized.indexOf(normalizedNeedle);

  if (matchIndex === -1) {
    return value;
  }

  const start = comparisonIndex.positions[matchIndex]?.start;
  const end = comparisonIndex.positions[matchIndex + normalizedNeedle.length - 1]?.end;

  if (start === undefined || end === undefined) {
    return value;
  }

  return comparisonIndex.source.slice(0, start) + comparisonIndex.source.slice(end);
}

function removeDuplicateReferenceText(description, olfactoryReference) {
  let cleanedDescription = normalizeWhitespace(description);
  const normalizedDescription = normalizeComparisonText(cleanedDescription);
  const normalizedReference = normalizeComparisonText(olfactoryReference);

  if (!cleanedDescription || !normalizedDescription) {
    return '';
  }

  if (!normalizedReference) {
    return cleanedDescription;
  }

  if (normalizedDescription === normalizedReference || normalizedReference.includes(normalizedDescription)) {
    return '';
  }

  if (normalizedDescription.includes(normalizedReference)) {
    cleanedDescription = normalizeWhitespace(
      removeNormalizedTextSpan(cleanedDescription, normalizedReference)
        .replace(/\s+([,.;:!?])/g, '$1')
        .replace(/^[\s,.;:!?|/-]+|[\s,.;:!?|/-]+$/g, ''),
    );
  }

  return normalizeComparisonText(cleanedDescription) === normalizedReference ? '' : cleanedDescription;
}

function cleanProductDescription(description, name, olfactoryReference) {
  let cleanedDescription = removeOlfactoryReferenceSegments(description);
  cleanedDescription = removeDuplicateReferenceText(cleanedDescription, olfactoryReference);

  const normalizedDescription = normalizeComparisonText(cleanedDescription);

  if (!normalizedDescription || normalizedDescription === normalizeComparisonText(name) || normalizedDescription === normalizeComparisonText(olfactoryReference)) {
    return '';
  }

  return cleanedDescription;
}

function normalizeCategoryKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleCaseCategory(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1).toLocaleLowerCase('pt-BR'))
    .join(' ');
}

function inferCategoryFromFileName(filePath) {
  const baseName = path.basename(filePath, '.json');
  const normalized = normalizeCategoryKey(baseName)
    .replace(/^(supplier|produtos|products|catalogo|catalog|categoria|category)\s+/, '')
    .replace(/\s+(supplier|produtos|products|catalogo|catalog|categoria|category)$/, '')
    .trim();

  if (!normalized || GENERIC_CATEGORIES.has(normalized)) {
    return '';
  }

  const aliases = new Map([
    ['arabes', 'Árabe'],
    ['arabe', 'Árabe'],
    ['masculino', 'Masculinos'],
    ['masculinos', 'Masculinos'],
    ['feminino', 'Femininos'],
    ['femininos', 'Femininos'],
    ['kits', 'Kit'],
    ['kit', 'Kit'],
    ['nicho', 'Nicho'],
    ['pastas isabelle', 'Pastas Isabelle'],
  ]);

  return aliases.get(normalized) || titleCaseCategory(normalized);
}

function getEffectiveCategory(rawCategory, fallbackCategory) {
  const category = String(rawCategory || '').trim();
  const normalizedCategory = normalizeCategoryKey(category);

  if (GENERIC_CATEGORIES.has(normalizedCategory)) {
    return fallbackCategory || 'Catálogo';
  }

  return category || fallbackCategory || 'Catálogo';
}

function parseMoneyToNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value || '').replace(/R\$|\s/g, '').trim();

  if (!raw) {
    return null;
  }

  if (raw.includes(',')) {
    return Number(raw.replace(/\./g, '').replace(',', '.'));
  }

  const parts = raw.split('.');

  if (parts.length > 2) {
    const decimals = parts.at(-1);
    const integer = parts.slice(0, -1).join('');
    return Number(`${integer}.${decimals}`);
  }

  return Number(raw);
}

function extractMoneyValues(text) {
  return normalizeRetailLine(text)
    .match(/R\$\s*\d+(?:\.\d{3})*(?:[.,]\d{2})?/gi)
    ?.map((match) => parseMoneyToNumber(match))
    ?.filter((price) => Number.isFinite(price)) ?? [];
}

function inferBrand(name) {
  if (name.includes('|')) {
    return name.split('|')[0].trim();
  }

  return name.split(/\s+/)[0]?.trim() || 'LAZULE';
}

function inferGender(category) {
  if (/masculin/i.test(category)) {
    return 'Masculino';
  }

  if (/feminin/i.test(category)) {
    return 'Feminino';
  }

  return 'Unissex';
}

function getPublicBadges(category, gender, available) {
  const badges = [];

  if (/árabe|arabe/i.test(category)) {
    badges.push('Árabes');
  }

  if (/nicho/i.test(category)) {
    badges.push('Nicho');
  }

  if (/kit|presente/i.test(category)) {
    badges.push('Presente');
  }

  if (gender === 'Masculino') {
    badges.push('Masculino');
  }

  if (gender === 'Feminino') {
    badges.push('Feminino');
  }

  if (available) {
    badges.push('Pronta entrega');
  }

  return [...new Set(badges)].slice(0, 3);
}

function extractOlfactoryReference(...sources) {
  for (const source of sources) {
    const match = String(source || '').match(
      /\b(?:ref(?:\.|\b)(?:\s*olfativa)?|refer[eê]ncia(?:\s*olfativa)?)\s*:?\s*([^\n\r]+)/i,
    );

    if (match?.[1]) {
      return normalizeWhitespace(match[1])
        .replace(/\s*(?:R\$|Varejo\b).+$/i, '')
        .replace(/[.;,\s]+$/g, '')
        .trim();
    }
  }

  return '';
}

function getNameCandidates(rawProduct, originalName) {
  const candidates = [rawProduct.description];
  const rawTextLines = String(rawProduct.rawText || '').split(/\r?\n/);

  for (const line of rawTextLines) {
    candidates.push(line);
  }

  return candidates
    .map((candidate) => stripReferenceFromText(candidate))
    .map((candidate) => normalizeWhitespace(candidate))
    .filter((candidate) => {
      if (!candidate || candidate === originalName || isPromotionalName(candidate)) {
        return false;
      }

      if (/^(?:varejo|cat[aá]logo|todos?|all|masculinos?|femininos?|nicho|[aá]rabes?|kit)$/i.test(candidate)) {
        return false;
      }

      if (extractMoneyValues(candidate).length > 0) {
        return false;
      }

      return /[\p{L}]/u.test(candidate);
    });
}

function resolveProductName(rawProduct) {
  const originalName = normalizeWhitespace(rawProduct.name);

  if (originalName && !isPromotionalName(originalName)) {
    return { name: originalName, wasPromotionalNameFixed: false };
  }

  const replacementName = getNameCandidates(rawProduct, originalName)[0] || '';

  return {
    name: replacementName,
    wasPromotionalNameFixed: Boolean(originalName && replacementName && isPromotionalName(originalName)),
  };
}

function getCostPrice(rawProduct) {
  const pricesBeforeRetail = Array.isArray(rawProduct.pricesBeforeRetail)
    ? rawProduct.pricesBeforeRetail.map(parseMoneyToNumber).filter((price) => Number.isFinite(price))
    : [];

  if (pricesBeforeRetail.length > 0) {
    return pricesBeforeRetail[0];
  }

  const rawTextPrices = String(rawProduct.rawText || '')
    .split('\n')
    .filter((line) => !/varejo/i.test(line))
    .flatMap((line) => extractMoneyValues(line));

  return rawTextPrices[0] ?? parseMoneyToNumber(rawProduct.costPrice);
}

function getSupplierRetailPrice(rawProduct) {
  const retailLinePrices = extractMoneyValues(normalizeRetailLine(rawProduct.retailLine));

  if (retailLinePrices.length > 0) {
    return retailLinePrices.at(-1);
  }

  return parseMoneyToNumber(rawProduct.supplierRetailPrice);
}

function normalizeProduct(rawProduct, fallbackCategory = '', metrics = createImportMetrics()) {
  metrics.raw += 1;

  const { name, wasPromotionalNameFixed } = resolveProductName(rawProduct);
  const originalDescription = normalizeWhitespace(rawProduct.description);
  const explicitReference = normalizeWhitespace(rawProduct.olfactoryReference);
  const extractedReference = extractOlfactoryReference(originalDescription, rawProduct.retailLine, rawProduct.rawText);
  const olfactoryReference = explicitReference || extractedReference;
  const description = cleanProductDescription(originalDescription, name, olfactoryReference);
  const category = getEffectiveCategory(rawProduct.category, fallbackCategory);
  const costPrice = getCostPrice(rawProduct);
  const supplierRetailPrice = getSupplierRetailPrice(rawProduct);

  if (!name) {
    metrics.discarded += 1;
    warn('Produto ignorado sem nome válido.');
    return null;
  }

  if (wasPromotionalNameFixed) {
    metrics.promotionalNameFixed += 1;
    log(`Nome promocional "${normalizeWhitespace(rawProduct.name)}" substituído por nome real: "${name}".`);
  }

  if (!Number.isFinite(costPrice)) {
    metrics.discarded += 1;
    warn(`Produto ignorado sem preço de atacado: "${name}".`);
    return null;
  }

  if (!Number.isFinite(supplierRetailPrice)) {
    metrics.discarded += 1;
    warn(`Produto ignorado sem varejo sugerido: "${name}".`);
    return null;
  }

  const gender = inferGender(category);
  const available = rawProduct.available ?? true;
  const image = String(rawProduct.image || '').trim();

  metrics.valid += 1;

  if (!explicitReference && extractedReference) {
    metrics.olfactoryReferenceExtracted += 1;
  }

  if (!image) {
    metrics.withoutImage += 1;
  }

  return {
    id: slugify(name),
    name,
    brand: inferBrand(name),
    category,
    gender,
    salePrice: supplierRetailPrice,
    image,
    badges: getPublicBadges(category, gender, available),
    description,
    olfactoryReference,
    available,
    featured: false,
    retailLine: normalizeRetailLine(rawProduct.retailLine || ''),
    sourceUrl: String(rawProduct.sourceUrl || '').trim(),
    stockIndicators: rawProduct.stockIndicators ?? null,
    supplierMetadata: rawProduct.supplierMetadata ?? null,
  };
}

function chooseBetterDuplicate(currentProduct, nextProduct) {
  const currentScore = [Boolean(currentProduct.image), Boolean(currentProduct.description), currentProduct.category !== 'Catálogo'].filter(Boolean).length;
  const nextScore = [Boolean(nextProduct.image), Boolean(nextProduct.description), nextProduct.category !== 'Catálogo'].filter(Boolean).length;

  return nextScore > currentScore ? nextProduct : currentProduct;
}

function deduplicateByName(products) {
  const productsByName = new Map();

  for (const product of products) {
    const key = normalizeName(product.name);
    const currentProduct = productsByName.get(key);
    productsByName.set(key, currentProduct ? chooseBetterDuplicate(currentProduct, product) : product);
  }

  return [...productsByName.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function countByCategory(products) {
  return products.reduce((totals, product) => {
    totals.set(product.category, (totals.get(product.category) ?? 0) + 1);
    return totals;
  }, new Map());
}



function serializeValue(value, indentLevel = 2) {
  const indent = ' '.repeat(indentLevel);
  const nextIndent = ' '.repeat(indentLevel + 2);

  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeValue(item, 0)).join(', ')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, entryValue]) => `${nextIndent}${key}: ${serializeValue(entryValue, indentLevel + 2)}`)
      .join(',\n');
    return `{\n${entries},\n${indent}}`;
  }

  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }

  return String(value);
}

async function loadExistingProducts() {
  const moduleUrl = new URL('../src/data/products.js', import.meta.url);
  const module = await import(moduleUrl);
  return Array.isArray(module.products) ? module.products : [];
}

function classifyMatchConfidence(supplierProduct, existingProduct) {
  const nameA = normalizeComparisonText(supplierProduct.name);
  const nameB = normalizeComparisonText(existingProduct.name);
  const brandA = normalizeComparisonText(supplierProduct.brand);
  const brandB = normalizeComparisonText(existingProduct.brand);
  const categoryA = normalizeComparisonText(supplierProduct.category);
  const categoryB = normalizeComparisonText(existingProduct.category);
  const imageSame = Boolean(supplierProduct.image && existingProduct.image && supplierProduct.image === existingProduct.image);
  const urlSame = Boolean(supplierProduct.sourceUrl && existingProduct.sourceUrl && supplierProduct.sourceUrl === existingProduct.sourceUrl);
  const nameScore = tokenOverlapScore(normalizeTokenSet(nameA), normalizeTokenSet(nameB));
  const categoryScore = tokenOverlapScore(normalizeTokenSet(categoryA), normalizeTokenSet(categoryB));
  const brandSame = Boolean(brandA && brandB && brandA === brandB);

  if (nameA && nameA === nameB && (brandSame || imageSame || urlSame)) {
    return 'exact';
  }

  if ((nameScore >= 0.85 && brandSame) || (nameScore >= 0.9 && (imageSame || urlSame))) {
    return 'strong';
  }

  if (nameScore >= 0.65 || (nameScore >= 0.55 && (brandSame || categoryScore >= 0.7))) {
    return 'weak';
  }

  return 'uncertain';
}

function buildRefreshReport() {
  return {
    generatedAt: new Date().toISOString(),
    dryRun: false,
    summary: {},
    newProducts: [],
    updatedProducts: [],
    unavailableProducts: [],
    imageChanges: [],
    priceChanges: [],
    mergeConflicts: [],
    preservedEnrichedFields: [],
  };
}

function mergeProducts(existingProducts, importedProducts, { dryRun }) {
  const now = new Date().toISOString();
  const report = buildRefreshReport();
  report.dryRun = dryRun;
  const existingById = new Map(existingProducts.map((item) => [item.id, item]));
  const existingByName = new Map(existingProducts.map((item) => [normalizeName(item.name), item]));
  const consumedIds = new Set();
  const mergedCatalog = [];

  for (const imported of importedProducts) {
    const directMatch = existingById.get(imported.id);
    const nameMatch = existingByName.get(normalizeName(imported.name));
    const match = directMatch || nameMatch || null;

    if (!match) {
      const created = { ...imported, firstSeenAt: now, supplierLastSeenAt: now, updatedAt: now };
      mergedCatalog.push(created);
      report.newProducts.push({ id: created.id, name: created.name });
      continue;
    }

    const confidence = classifyMatchConfidence(imported, match);
    if (confidence === 'weak' || confidence === 'uncertain') {
      report.mergeConflicts.push({
        supplierProduct: { id: imported.id, name: imported.name },
        existingProduct: { id: match.id, name: match.name },
        confidence,
        needsReview: true,
      });
      mergedCatalog.push(match);
      consumedIds.add(match.id);
      continue;
    }

    consumedIds.add(match.id);
    const merged = { ...match };
    for (const [key, value] of Object.entries(imported)) {
      if (UPDATABLE_FIELDS.has(key)) {
        if (key === 'salePrice' && match.salePrice !== value) {
          report.priceChanges.push({ id: match.id, name: match.name, from: match.salePrice, to: value });
        }
        if (key === 'image' && match.image !== value) {
          report.imageChanges.push({ id: match.id, name: match.name, from: match.image || null, to: value || null });
        }
        merged[key] = value;
      }
    }
    merged.available = imported.available;
    merged.updatedAt = now;
    merged.supplierLastSeenAt = now;
    merged.firstSeenAt = match.firstSeenAt || now;

    const preserved = PROTECTED_FIELDS.filter((field) => Object.hasOwn(match, field));
    if (preserved.length > 0) {
      report.preservedEnrichedFields.push({ id: match.id, name: match.name, fields: preserved });
    }
    report.updatedProducts.push({ id: match.id, name: match.name, confidence });
    mergedCatalog.push(merged);
  }

  for (const existing of existingProducts) {
    if (consumedIds.has(existing.id)) {
      continue;
    }

    const markedUnavailable = { ...existing, available: false, updatedAt: now };
    mergedCatalog.push(markedUnavailable);
    report.unavailableProducts.push({ id: existing.id, name: existing.name });
  }

  report.summary = {
    newProducts: report.newProducts.length,
    updatedProducts: report.updatedProducts.length,
    unavailableProducts: report.unavailableProducts.length,
    imageChanges: report.imageChanges.length,
    priceChanges: report.priceChanges.length,
    mergeConflicts: report.mergeConflicts.length,
    preservedEnrichedFields: report.preservedEnrichedFields.length,
  };

  return { mergedCatalog: deduplicateByName(mergedCatalog), report };
}

async function pathExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getImportFiles() {
  try {
    const entries = await readdir(IMPORTS_DIR, { withFileTypes: true });
    const importFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => path.join(IMPORTS_DIR, entry.name))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    if (importFiles.length > 0) {
      return importFiles;
    }
  } catch {
    // Fallback below keeps compatibility with the original single-file import flow.
  }

  if (await pathExists(FALLBACK_INPUT_FILE)) {
    return [FALLBACK_INPUT_FILE];
  }

  throw new Error('Nenhum JSON encontrado. Salve arquivos em data/imports/*.json ou use data/supplier-products.json como fallback.');
}

async function readImportFile(filePath) {
  const payload = JSON.parse(await readFile(filePath, 'utf8'));
  const rawProducts = Array.isArray(payload) ? payload : payload.products;

  if (!Array.isArray(rawProducts)) {
    throw new Error(`Formato inválido em ${path.relative(ROOT_DIR, filePath)}: esperado array de produtos ou objeto com propriedade products.`);
  }

  return {
    filePath,
    fallbackCategory: inferCategoryFromFileName(filePath),
    rawProducts,
  };
}

function logReport(fileReports, metrics, products) {
  log('Relatório de importação consolidada:');
  log(`Arquivos lidos: ${fileReports.length}`);

  for (const report of fileReports) {
    const categoryInfo = report.fallbackCategory ? ` | categoria fallback: ${report.fallbackCategory}` : '';
    log(`- ${path.relative(ROOT_DIR, report.filePath)}: ${report.rawCount} produtos brutos${categoryInfo}`);
  }

  log(`Produtos brutos: ${metrics.raw}`);
  log(`Produtos válidos: ${metrics.valid}`);
  log(`Produtos descartados: ${metrics.discarded}`);
  log(`Produtos corrigidos por nome promocional: ${metrics.promotionalNameFixed}`);
  log(`Produtos com referência olfativa extraída: ${metrics.olfactoryReferenceExtracted}`);
  log(`Produtos sem imagem: ${metrics.withoutImage}`);
  log(`Total final após deduplicação: ${products.length}`);
  log('Quantidade final por categoria:');

  for (const [category, count] of [...countByCategory(products).entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))) {
    log(`- ${category}: ${count}`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const importFiles = await getImportFiles();
  const filePayloads = await Promise.all(importFiles.map(readImportFile));
  const rawProducts = filePayloads.flatMap((payload) =>
    payload.rawProducts.map((rawProduct) => ({ rawProduct, fallbackCategory: payload.fallbackCategory })),
  );
  const metrics = createImportMetrics();
  const normalizedProducts = rawProducts
    .map(({ rawProduct, fallbackCategory }) => normalizeProduct(rawProduct, fallbackCategory, metrics))
    .filter(Boolean);
  const products = deduplicateByName(normalizedProducts);
  const existingProducts = await loadExistingProducts();
  const { mergedCatalog, report } = mergeProducts(existingProducts, products, { dryRun });
  const publicCatalog = mergedCatalog.map(sanitizePublicProduct);
  const serializedProducts = publicCatalog.map((product) => `  ${serializeValue(product, 2)}`).join(',\n');

  if (!dryRun) {
    await writeFile(OUTPUT_FILE, `export const products = [\n${serializedProducts},\n];\n`);
  }
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(INTERNAL_OUTPUT_FILE, `${JSON.stringify({ generatedAt: new Date().toISOString(), products: mergedCatalog }, null, 2)}\n`);
  logReport(
    filePayloads.map((payload) => ({ filePath: payload.filePath, rawCount: payload.rawProducts.length, fallbackCategory: payload.fallbackCategory })),
    metrics,
    publicCatalog,
  );
  if (dryRun) {
    log('Modo dry-run habilitado: src/data/products.js não foi modificado.');
  } else {
    log(`Arquivo atualizado: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
  }
  log(`Relatório de refresh: ${path.relative(ROOT_DIR, REPORT_FILE)}`);
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} [error] ${error.message}`);
  process.exitCode = 1;
});
