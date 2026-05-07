import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_FILE = path.join(ROOT_DIR, 'data/supplier-products.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/products.js');
const LOG_PREFIX = '[LAZULE import]';

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

function normalizeProduct(rawProduct) {
  const originalName = String(rawProduct.name || '').trim();
  const originalDescription = String(rawProduct.description || '').trim();
  const isDiscountName = /^\d+% OFF$/i.test(originalName);
  const name = isDiscountName ? originalDescription : originalName;
  const description = isDiscountName ? '' : originalDescription;
  const category = String(rawProduct.category || 'Catálogo').trim();
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

async function main() {
  log(`Lendo ${path.relative(ROOT_DIR, INPUT_FILE)}`);
  const payload = JSON.parse(await readFile(INPUT_FILE, 'utf8'));
  const rawProducts = Array.isArray(payload) ? payload : payload.products;

  if (!Array.isArray(rawProducts)) {
    throw new Error('Formato inválido: esperado array de produtos ou objeto com propriedade products.');
  }

  const normalizedProducts = rawProducts.map(normalizeProduct).filter(Boolean);
  const products = deduplicateByName(normalizedProducts);
  const serializedProducts = products.map((product) => `  ${serializeValue(product, 2)}`).join(',\n');

  await writeFile(OUTPUT_FILE, `export const products = [\n${serializedProducts},\n];\n`);
  log(`Produtos brutos: ${rawProducts.length}`);
  log(`Produtos válidos: ${normalizedProducts.length}`);
  log(`Produtos após deduplicação por nome: ${products.length}`);
  log(`Arquivo atualizado: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} [error] ${error.message}`);
  process.exitCode = 1;
});
