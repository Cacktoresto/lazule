import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SUPPLIER_URL = 'https://rjperfumaria.catalog.kyte.site/';
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src/data/products.js');
const IMAGE_DIR = path.join(ROOT_DIR, 'public/products');
const DEBUG_DIR = path.join(ROOT_DIR, 'tmp/scraper-debug');
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
const INITIAL_RENDER_WAIT_MS = 4_000;
const PRODUCT_TEXT_MAX_LENGTH = 1_600;

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

function countRetailMarkers(text) {
  return (text.match(/varejo/gi) ?? []).length;
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

function isProductNameLine(line) {
  const isCategory = CATEGORY_BY_TEXT.has(line);
  const isPrice = /R\$|varejo/i.test(line);
  const isUiText = /^(início|inicio|catálogo|catalogo|comprar|ver mais|whatsapp|buscar|menu|all)$/i.test(line);
  const isLongDescription = line.length > 160;
  return !isCategory && !isPrice && !isUiText && !isLongDescription && line.length > 2;
}

function parseProduct(rawProduct, fallbackCategory, sourceUrl) {
  const lines = rawProduct.text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const category = lines.find((line) => CATEGORY_BY_TEXT.has(line)) || fallbackCategory;
  const name = lines.find(isProductNameLine);

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
  let stableRounds = 0;
  let previousHeight = 0;
  let previousScrollY = -1;

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const metrics = await page.evaluate(() => {
      const step = Math.max(650, Math.floor(window.innerHeight * 0.75));
      window.scrollBy(0, step);
      return {
        height: document.body.scrollHeight,
        scrollY: window.scrollY,
        viewport: window.innerHeight,
      };
    });

    log(`Scroll ${attempt}: y=${Math.round(metrics.scrollY)} altura=${metrics.height}`);
    await page.waitForTimeout(750);

    const reachedBottom = metrics.scrollY + metrics.viewport >= metrics.height - 8;
    const unchanged = metrics.height === previousHeight && Math.round(metrics.scrollY) === Math.round(previousScrollY);
    stableRounds = unchanged || reachedBottom ? stableRounds + 1 : 0;

    previousHeight = metrics.height;
    previousScrollY = metrics.scrollY;

    if (stableRounds >= 3) {
      break;
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function extractRawProducts(page) {
  return page.evaluate((maxLength) => {
    function visibleText(element) {
      return element.innerText?.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').trim() || '';
    }

    function getImage(element) {
      const image = element.querySelector('img');
      return image?.currentSrc || image?.src || image?.getAttribute('data-src') || '';
    }

    function countRetail(text) {
      return (text.match(/varejo/gi) ?? []).length;
    }

    function hasProductPriceShape(text) {
      return /R\$/i.test(text) && /varejo/i.test(text) && (text.match(/R\$/gi) ?? []).length >= 2;
    }

    function findProductRoot(element) {
      let candidate = element;
      let current = element;

      while (current?.parentElement) {
        const parent = current.parentElement;
        const parentText = visibleText(parent);
        const parentRetailCount = countRetail(parentText);

        if (parentRetailCount > 1 || parentText.length > maxLength) {
          break;
        }

        if (hasProductPriceShape(parentText)) {
          candidate = parent;
        }

        current = parent;
      }

      return candidate;
    }

    const retailElements = [...document.querySelectorAll('body *')]
      .filter((element) => {
        const text = visibleText(element);
        return hasProductPriceShape(text) && countRetail(text) === 1 && text.length <= maxLength;
      });

    const roots = new Set(retailElements.map((element) => findProductRoot(element)));
    const rootCandidates = [...roots]
      .map((element) => ({ element, text: visibleText(element), image: getImage(element) }))
      .filter((candidate) => hasProductPriceShape(candidate.text))
      .filter((candidate) => countRetail(candidate.text) === 1)
      .filter((candidate) => candidate.text.length <= maxLength);

    const selectorCandidates = [...document.querySelectorAll([
      'article',
      'li',
      '[role="listitem"]',
      '[class*="product" i]',
      '[class*="card" i]',
      '[class*="item" i]',
      '[data-testid*="product" i]',
      '[data-cy*="product" i]',
    ].join(','))]
      .map((element) => ({ element, text: visibleText(element), image: getImage(element) }))
      .filter((candidate) => hasProductPriceShape(candidate.text))
      .filter((candidate) => countRetail(candidate.text) === 1)
      .filter((candidate) => candidate.text.length <= maxLength);

    const candidatesByText = new Map();

    for (const candidate of [...rootCandidates, ...selectorCandidates]) {
      const key = candidate.text.replace(/\s+/g, ' ').trim();
      if (!candidatesByText.has(key)) {
        candidatesByText.set(key, { text: candidate.text, image: candidate.image });
      } else if (!candidatesByText.get(key).image && candidate.image) {
        candidatesByText.set(key, { text: candidate.text, image: candidate.image });
      }
    }

    return {
      bodyTextLength: document.body.innerText?.length || 0,
      retailElementCount: retailElements.length,
      rootCandidateCount: rootCandidates.length,
      selectorCandidateCount: selectorCandidates.length,
      products: [...candidatesByText.values()],
    };
  }, PRODUCT_TEXT_MAX_LENGTH);
}

async function saveDebugSnapshot(page, category, reason) {
  try {
    await mkdir(DEBUG_DIR, { recursive: true });
    const baseName = `${slugify(category.name)}-${Date.now()}`;
    const htmlPath = path.join(DEBUG_DIR, `${baseName}.html`);
    const screenshotPath = path.join(DEBUG_DIR, `${baseName}.png`);

    await writeFile(htmlPath, await page.content());

    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      warn(`${reason}. Snapshot salvo em ${path.relative(ROOT_DIR, htmlPath)} e ${path.relative(ROOT_DIR, screenshotPath)}.`);
    } catch (error) {
      warn(`${reason}. Snapshot HTML salvo em ${path.relative(ROOT_DIR, htmlPath)}; screenshot falhou: ${error.message}.`);
    }
  } catch (error) {
    warn(`${reason}. Não foi possível salvar snapshot de debug: ${error.message}.`);
  }
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

  try {
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  } catch (error) {
    warn(`goto não completou para ${category.name}: ${error.message}. Continuando com o DOM disponível.`);
  }

  log(`Aguardando renderização inicial por ${INITIAL_RENDER_WAIT_MS}ms em ${category.name}.`);
  await page.waitForTimeout(INITIAL_RENDER_WAIT_MS);
  await autoScroll(page);

  const extraction = await extractRawProducts(page);
  log(
    `Candidatos em ${category.name}: produtos=${extraction.products.length}, retailElements=${extraction.retailElementCount}, roots=${extraction.rootCandidateCount}, selectors=${extraction.selectorCandidateCount}, bodyText=${extraction.bodyTextLength}`,
  );

  if (extraction.products.length === 0) {
    await saveDebugSnapshot(page, category, `Nenhum candidato a produto encontrado em ${category.name}`);
  }

  const parsedProducts = extraction.products
    .map((rawProduct) => parseProduct(rawProduct, category.name, categoryUrl))
    .filter(Boolean);

  if (parsedProducts.length === 0 && extraction.products.length > 0) {
    await saveDebugSnapshot(page, category, `Candidatos encontrados, mas nenhum produto válido parseado em ${category.name}`);
  }

  return parsedProducts;
}

async function main() {
  log(`Fonte: ${SUPPLIER_URL}`);
  log(`Categorias configuradas: ${CATEGORY_PATHS.map((category) => category.name).join(', ')}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(45_000);
  const products = [];

  try {
    for (const category of CATEGORY_PATHS) {
      try {
        const categoryProducts = await scrapeCategory(page, category);
        log(`Produtos válidos em ${category.name}: ${categoryProducts.length}`);
        products.push(...categoryProducts);
      } catch (error) {
        warn(`Falha ao raspar categoria ${category.name}: ${error.message}`);
        await saveDebugSnapshot(page, category, `Falha inesperada em ${category.name}`);
      }
    }
  } finally {
    await browser.close();
  }

  log(`Total bruto: ${products.length}`);
  const uniqueProducts = deduplicateByName(products);
  log(`Total após deduplicação por nome: ${uniqueProducts.length}`);

  if (uniqueProducts.length === 0) {
    throw new Error('Nenhum produto foi extraído do fornecedor. Consulte tmp/scraper-debug para snapshots HTML/screenshot.');
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
