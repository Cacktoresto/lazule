import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPLIER_URL = 'https://rjperfumaria.catalog.kyte.site/';
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/products.js');
const IMAGE_DIR = path.join(ROOT_DIR, 'public/products');
const LOG_PREFIX = '[LAZULE scraper]';
const CATEGORY_PATHS = [
  { name: 'Masculinos', path: '/masculinos' },
  { name: 'Femininos', path: '/femininos' },
  { name: 'Kit', path: '/kit' },
  { name: 'Árabe', path: '/arabe' },
  { name: 'Nicho', path: '/nicho' },
  { name: 'Pastas Isabelle', path: '/pastas-isabelle' },
];
const CATEGORY_BY_TEXT = new Set(['All', ...CATEGORY_PATHS.map((category) => category.name)]);

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
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 |.-]/g, '')
    .trim();
}

function parseMoneyToNumber(value) {
  const raw = value.replace(/R\$|\s/g, '').trim();

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

  return Number(raw.replace(/,/g, ''));
}

function extractMoneyValues(text) {
  const matches = text.match(/R\$\s*\d+(?:[.,]\d{2})?/gi) ?? [];
  return matches
    .map((match) => parseMoneyToNumber(match))
    .filter((price) => Number.isFinite(price));
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
  const match = description.match(/(?:ref\.?\s*olfativa|refer[eê]ncia\s*olfativa)\s*:?\s*(.+)/i);
  return match?.[1]?.trim() || '';
}

function parseProduct(rawProduct, fallbackCategory, sourceUrl) {
  const lines = rawProduct.text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const category = lines.find((line) => CATEGORY_BY_TEXT.has(line)) || fallbackCategory;
  const name = lines.find((line) => {
    const isCategory = CATEGORY_BY_TEXT.has(line);
    const isPrice = /R\$|varejo/i.test(line);
    const isUiText = /^(início|inicio|catálogo|catalogo|comprar|ver mais|whatsapp)$/i.test(line);
    return !isCategory && !isPrice && !isUiText && line.length > 2;
  });

  if (!name) {
    warn(`Produto ignorado sem nome em ${sourceUrl}.`);
    return null;
  }

  const retailLine = lines.find((line) => /varejo/i.test(line));
  const supplierRetailPrice = retailLine ? extractMoneyValues(retailLine).at(-1) : null;
  const costPriceCandidates = lines
    .filter((line) => !/varejo/i.test(line))
    .flatMap((line) => extractMoneyValues(line));
  const costPrice = costPriceCandidates[0] ?? null;

  if (!Number.isFinite(costPrice)) {
    warn(`Produto ignorado sem preço de atacado: "${name}".`);
    return null;
  }

  if (!Number.isFinite(supplierRetailPrice)) {
    warn(`Produto ignorado sem varejo sugerido: "${name}".`);
    return null;
  }

  if (costPriceCandidates.length > 1) {
    warn(`Produto com múltiplos preços antes do varejo: "${name}"; usando ${costPrice} como costPrice.`);
  }

  const description = lines
    .filter((line) => line !== name)
    .filter((line) => line !== category)
    .filter((line) => !/R\$|varejo/i.test(line))
    .join(' ')
    .trim();
  const olfactoryReference = extractOlfactoryReference(description);
  const available = !/indispon[ií]vel|esgotado|sem estoque/i.test(rawProduct.text);
  const gender = inferGender(category);

  return {
    id: slugify(name),
    name,
    brand: inferBrand(name),
    category,
    gender,
    salePrice: supplierRetailPrice,
    costPrice,
    supplierRetailPrice,
    image: rawProduct.image || '',
    badges: getPublicBadges(category, gender, available),
    description,
    olfactoryReference,
    available,
    featured: false,
    sourceUrl,
  };
}

async function autoScroll(page) {
  let previousHeight = 0;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    if (currentHeight === previousHeight && attempt > 1) {
      break;
    }

    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
}

async function extractRawProducts(page) {
  return page.evaluate(() => {
    function visibleText(element) {
      return element.innerText?.replace(/\u00a0/g, ' ').trim() || '';
    }

    function getImage(element) {
      const image = element.querySelector('img');
      return image?.currentSrc || image?.src || image?.getAttribute('data-src') || '';
    }

    const selectors = [
      'article',
      'li',
      '[class*="product" i]',
      '[class*="card" i]',
      '[data-testid*="product" i]',
      'main div',
    ];
    const candidates = [...document.querySelectorAll(selectors.join(','))]
      .map((element) => ({ element, text: visibleText(element), image: getImage(element) }))
      .filter((candidate) => /R\$/i.test(candidate.text) && /varejo/i.test(candidate.text))
      .filter((candidate) => candidate.text.length < 1200);

    return candidates
      .filter((candidate) => {
        return !candidates.some((other) => {
          return other.element !== candidate.element && candidate.element.contains(other.element);
        });
      })
      .map(({ text, image }) => ({ text, image }));
  });
}

function chooseBetterDuplicate(currentProduct, nextProduct) {
  const currentScore = [currentProduct.category !== 'All', Boolean(currentProduct.image), Boolean(currentProduct.description)].filter(Boolean).length;
  const nextScore = [nextProduct.category !== 'All', Boolean(nextProduct.image), Boolean(nextProduct.description)].filter(Boolean).length;

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

function getImageExtension(contentType, imageUrl) {
  if (contentType?.includes('png')) {
    return '.png';
  }

  if (contentType?.includes('webp')) {
    return '.webp';
  }

  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) {
    return '.jpg';
  }

  const extension = path.extname(new URL(imageUrl).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(extension) ? extension : '.jpg';
}

async function downloadImage(product) {
  if (!product.image || product.image.startsWith('data:')) {
    return '';
  }

  const imageUrl = new URL(product.image, SUPPLIER_URL).toString();
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const extension = getImageExtension(contentType, imageUrl);
  const filename = `${product.id}${extension}`;
  const outputPath = path.join(IMAGE_DIR, filename);
  const buffer = Buffer.from(await response.arrayBuffer());

  await writeFile(outputPath, buffer);
  return `/products/${filename}`;
}

async function hydrateImages(products) {
  await mkdir(IMAGE_DIR, { recursive: true });

  for (const product of products) {
    if (!product.image) {
      continue;
    }

    try {
      log(`Baixando imagem: ${product.name}`);
      product.image = await downloadImage(product);
    } catch (error) {
      warn(`Não foi possível baixar imagem de "${product.name}": ${error.message}`);
      product.image = '';
    }
  }

  return products;
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

async function writeProductsFile(products) {
  const serializedProducts = products.map((product) => `  ${serializeValue(product, 2)}`).join(',\n');
  const content = `export const products = [\n${serializedProducts},\n];\n`;
  await writeFile(OUTPUT_FILE, content);
}

async function scrapeCategory(page, category) {
  const categoryUrl = new URL(category.path, SUPPLIER_URL).toString();
  log(`Iniciando categoria: ${category.name} (${categoryUrl})`);

  await page.goto(categoryUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await autoScroll(page);

  const rawProducts = await extractRawProducts(page);
  log(`Blocos candidatos em ${category.name}: ${rawProducts.length}`);

  return rawProducts
    .map((rawProduct) => parseProduct(rawProduct, category.name, categoryUrl))
    .filter(Boolean);
}

async function main() {
  log(`Fonte: ${SUPPLIER_URL}`);
  log(`Categorias configuradas: ${CATEGORY_PATHS.map((category) => category.name).join(', ')}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const products = [];

  try {
    for (const category of CATEGORY_PATHS) {
      try {
        const categoryProducts = await scrapeCategory(page, category);
        log(`Produtos válidos em ${category.name}: ${categoryProducts.length}`);
        products.push(...categoryProducts);
      } catch (error) {
        warn(`Falha ao raspar categoria ${category.name}: ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  log(`Total bruto: ${products.length}`);
  const uniqueProducts = deduplicateByName(products);
  log(`Total após deduplicação por nome: ${uniqueProducts.length}`);

  if (uniqueProducts.length === 0) {
    throw new Error('Nenhum produto foi extraído do fornecedor.');
  }

  await hydrateImages(uniqueProducts);
  await writeProductsFile(uniqueProducts);

  log(`Arquivo atualizado: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
  log(`Imagens salvas em: ${path.relative(ROOT_DIR, IMAGE_DIR)}`);
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} [error] ${error.message}`);
  process.exitCode = 1;
});
