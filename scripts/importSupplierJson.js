import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMPORTS_DIR = path.join(ROOT_DIR, 'data/imports');
const FALLBACK_INPUT_FILE = path.join(ROOT_DIR, 'data/supplier-products.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/products.js');
const LOG_PREFIX = '[LAZULE import]';
const GENERIC_CATEGORIES = new Set(['', 'catalogo', 'catálogo', 'todos', 'tudo', 'all', 'catalog']);

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
  return String(text || '')
    .match(/R\$\s*\d+(?:[.,]\d{2})?/gi)
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

function extractOlfactoryReference(description) {
  const match = String(description || '').match(/(?:ref\.?\s*olfativa|refer[eê]ncia\s*olfativa)\s*:?\s*(.+)/i);
  return match?.[1]?.trim() || '';
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
  const retailLinePrices = extractMoneyValues(rawProduct.retailLine);

  if (retailLinePrices.length > 0) {
    return retailLinePrices.at(-1);
  }

  return parseMoneyToNumber(rawProduct.supplierRetailPrice);
}

function normalizeProduct(rawProduct, fallbackCategory = '') {
  const originalName = String(rawProduct.name || '').trim();
  const originalDescription = String(rawProduct.description || '').trim();
  const isDiscountName = /^\d+% OFF$/i.test(originalName);
  const name = isDiscountName ? originalDescription : originalName;
  const description = isDiscountName ? '' : originalDescription;
  const category = getEffectiveCategory(rawProduct.category, fallbackCategory);
  const costPrice = getCostPrice(rawProduct);
  const supplierRetailPrice = getSupplierRetailPrice(rawProduct);

  if (!name) {
    warn(isDiscountName ? `Produto ignorado porque "${originalName}" não tinha descrição para usar como nome.` : 'Produto ignorado sem nome.');
    return null;
  }

  if (isDiscountName) {
    log(`Nome promocional "${originalName}" substituído por descrição: "${name}".`);
  }

  if (!Number.isFinite(costPrice)) {
    warn(`Produto ignorado sem preço de atacado: "${name}".`);
    return null;
  }

  if (!Number.isFinite(supplierRetailPrice)) {
    warn(`Produto ignorado sem varejo sugerido: "${name}".`);
    return null;
  }

  const gender = inferGender(category);
  const available = rawProduct.available ?? true;

  return {
    id: slugify(name),
    name,
    brand: inferBrand(name),
    category,
    gender,
    salePrice: supplierRetailPrice,
    costPrice,
    supplierRetailPrice,
    image: String(rawProduct.image || '').trim(),
    badges: getPublicBadges(category, gender, available),
    description,
    olfactoryReference: String(rawProduct.olfactoryReference || extractOlfactoryReference(description)).trim(),
    available,
    featured: false,
    sourceUrl: String(rawProduct.sourceUrl || '').trim(),
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

function logReport(fileReports, rawProducts, normalizedProducts, products) {
  log('Relatório de importação consolidada:');
  log(`Arquivos lidos: ${fileReports.length}`);

  for (const report of fileReports) {
    const categoryInfo = report.fallbackCategory ? ` | categoria fallback: ${report.fallbackCategory}` : '';
    log(`- ${path.relative(ROOT_DIR, report.filePath)}: ${report.rawCount} produtos brutos${categoryInfo}`);
  }

  log(`Total bruto consolidado: ${rawProducts.length}`);
  log(`Produtos válidos antes da deduplicação: ${normalizedProducts.length}`);
  log(`Total após deduplicação: ${products.length}`);
  log('Quantidade por categoria:');

  for (const [category, count] of [...countByCategory(products).entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))) {
    log(`- ${category}: ${count}`);
  }

  log(`Produtos com imagem: ${products.filter((product) => Boolean(product.image)).length}`);
  log(`Produtos sem imagem: ${products.filter((product) => !product.image).length}`);
}

async function main() {
  const importFiles = await getImportFiles();
  const filePayloads = await Promise.all(importFiles.map(readImportFile));
  const rawProducts = filePayloads.flatMap((payload) =>
    payload.rawProducts.map((rawProduct) => ({ rawProduct, fallbackCategory: payload.fallbackCategory })),
  );
  const normalizedProducts = rawProducts
    .map(({ rawProduct, fallbackCategory }) => normalizeProduct(rawProduct, fallbackCategory))
    .filter(Boolean);
  const products = deduplicateByName(normalizedProducts);
  const serializedProducts = products.map((product) => `  ${serializeValue(product, 2)}`).join(',\n');

  await writeFile(OUTPUT_FILE, `export const products = [\n${serializedProducts},\n];\n`);
  logReport(
    filePayloads.map((payload) => ({ filePath: payload.filePath, rawCount: payload.rawProducts.length, fallbackCategory: payload.fallbackCategory })),
    rawProducts,
    normalizedProducts,
    products,
  );
  log(`Arquivo atualizado: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} [error] ${error.message}`);
  process.exitCode = 1;
});
