import { chromium } from 'playwright';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
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
const MAX_LOG_LENGTH = 1_000;
const DEBUG_SCRAPER_HTML = String(process.env.DEBUG_SCRAPER_HTML || '').toLowerCase() === 'true';

const PRODUCT_CARD_SELECTOR = [
  'article[class*=\"product\" i]',
  'li[class*=\"product\" i]',
  '[data-testid*=\"product\" i]',
  '[data-cy*=\"product\" i]',
  '[class*=\"catalog\" i] article',
  '[class*=\"catalog\" i] li',
  '[class*=\"product-list\" i] > *',
  '[class*=\"product-grid\" i] > *',
].join(',');

const INVALID_UI_PHRASES = [
  'we use cookies',
  'cookies',
  'improve the services',
  'back to top',
  'create a website',
  'kyte',
  'developed by',
  'loading',
  'order by',
  'masculino',
  'feminino',
];


class SupplierBlockedError extends Error {
  constructor(categoryName, evidence) {
    super(
      `Fornecedor bloqueou a automação com Cloudflare/Turnstile em "${categoryName}". ` +
        'Não é possível extrair produtos do DOM/API enquanto a página exibida for o desafio antibot. ' +
        'Use um endpoint/export autorizado do fornecedor ou execute o scraper em uma sessão/ambiente liberado pelo fornecedor.',
    );
    this.name = 'SupplierBlockedError';
    this.categoryName = categoryName;
    this.evidence = evidence;
  }
}

function detectCloudflareChallenge(html, url = '') {
  const evidence = [];
  const checks = [
    ['title', /<title>\s*Just a moment\.\.\.\s*<\/title>/i],
    ['turnstile', /cf-turnstile|challenges\.cloudflare\.com\/turnstile/i],
    ['challenge-platform', /\/cdn-cgi\/challenge-platform\//i],
    ['cf-chl', /__cf_chl_|cf_chl_|_cf_chl_opt/i],
    ['security-copy', /Performing security verification|verifies you are not a bot|Enable JavaScript and cookies to continue/i],
    ['cloudflare-footer', /Performance and Security by\s*<a[^>]+Cloudflare/i],
  ];

  for (const [label, pattern] of checks) {
    if (pattern.test(html) || pattern.test(url)) {
      evidence.push(label);
    }
  }

  return {
    blocked: evidence.length >= 2,
    evidence,
  };
}

function log(message) {
  console.log(`${LOG_PREFIX} ${truncateLogText(message)}`);
}

function warn(message) {
  console.warn(`${LOG_PREFIX} [warn] ${truncateLogText(message)}`);
}
function truncateLogText(message) {
  const text = String(message ?? '');
  return text.length > MAX_LOG_LENGTH ? `${text.slice(0, MAX_LOG_LENGTH)}… [truncated]` : text;
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



function normalizeTextToken(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[|_]+/g, ' ')
    .replace(/[–—-]+/g, ' ')
    .replace(/\b(eau\s+de\s+parfum|eau\s+de\s+toilette)\b/g, (m) => (m.includes('toilette') ? 'edt' : 'edp'))
    .replace(/\b(parfum|perfume)\b/g, 'edp')
    .replace(/\b(limited\s+edition|l\.e\.|\ble\b)\b/g, ' limited edition ')
    .replace(/[^a-z0-9%.,:/\s]/g, ' ')
    .replace(/(\d)\s*ml\b/g, '$1ml')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVolumeMl(text) {
  const m = normalizeTextToken(text).match(/\b(\d{2,4})\s*ml\b/);
  return m ? Number(m[1]) : null;
}

function normalizeImageUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url, SUPPLIER_URL);
    u.search = '';
    return u.toString();
  } catch {
    return url.split('?')[0].trim();
  }
}

function imageFingerprint(url) {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return '';
  try {
    const u = new URL(normalized);
    return `${u.host}${u.pathname}`.toLowerCase();
  } catch {
    return normalized.toLowerCase();
  }
}

function normalizePriceLine(text) {
  return text.replace(/R\$\s*R\$/gi, 'R$ ').replace(/\s+/g, ' ').trim();
}

function extractOlfactoryReferenceFromText(text) {
  if (!text) return '';
  const refPatterns = [
    /(?:ref\.?\s*olfativa|refer[eê]ncia\s*olfativa|refer[eê]ncia|ref\.?|inspirado\s+em|similar\s+a)\s*:?\s*([^\n|]+)$/i,
  ];
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    for (const pattern of refPatterns) {
      const m = line.match(pattern);
      if (m?.[1]) return normalizeTextToken(m[1]).slice(0, 120);
    }
  }
  const m = normalizeTextToken(text).match(/(?:ref\.?\s*olfativa|referencia|inspirado em|similar a)\s*:?\s*([a-z0-9 ]{3,80})/i);
  return m?.[1]?.trim() || '';
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
  return extractOlfactoryReferenceFromText(description);
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

  const retailLine = normalizePriceLine(lines.find((line) => /varejo/i.test(line)) || '');
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
  const olfactoryReference = extractOlfactoryReferenceFromText([description, retailLine, rawProduct.text].filter(Boolean).join('\n'));
  const available = !/indispon[ií]vel|esgotado|sem estoque/i.test(rawProduct.text);
  const gender = inferGender(category);

  const volumeMl = extractVolumeMl([name, description, rawProduct.text].join(' '));

  if (/^\d+%\s*off$/i.test(normalizeTextToken(name)) || /loading|skeleton/i.test(normalizeTextToken(name))) {
    return null;
  }

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
    volumeMl,
    rawText: rawProduct.text || '',
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
  return page.evaluate(({ maxLength, strictSelector }) => {
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

    const domNodesObserved = document.querySelectorAll('body *').length;
    const retailElements = [...document.querySelectorAll(strictSelector)]
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

    const selectorCandidates = [...document.querySelectorAll(strictSelector)]
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
      domNodesObserved,
      retailElementCount: retailElements.length,
      rootCandidateCount: rootCandidates.length,
      selectorCandidateCount: selectorCandidates.length,
      products: [...candidatesByText.values()],
    };
  }, { maxLength: PRODUCT_TEXT_MAX_LENGTH, strictSelector: PRODUCT_CARD_SELECTOR });
}

async function saveDebugSnapshot(page, category, reason, options = {}) {
  const { writeHtml = true, writeScreenshot = true } = options;
  try {
    await mkdir(DEBUG_DIR, { recursive: true });
    const baseName = `${slugify(category.name)}-${Date.now()}`;
    const htmlPath = path.join(DEBUG_DIR, `${baseName}.html`);
    const screenshotPath = path.join(DEBUG_DIR, `${baseName}.png`);
    let htmlSaved = false;
    let screenshotSaved = false;
    if (writeHtml) {
      await writeFile(htmlPath, await page.content());
      htmlSaved = true;
    }

    try {
      if (writeScreenshot) {
        await page.screenshot({ path: screenshotPath, fullPage: true });
        screenshotSaved = true;
      }
      warn(`${reason}. Snapshot salvo${htmlSaved ? ` HTML=${path.relative(ROOT_DIR, htmlPath)}` : ''}${screenshotSaved ? ` PNG=${path.relative(ROOT_DIR, screenshotPath)}` : ''}.`);
    } catch (error) {
      warn(`${reason}. Snapshot parcial salvo; screenshot falhou: ${error.message}.`);
    }
    return { htmlSaved, screenshotSaved };
  } catch (error) {
    warn(`${reason}. Não foi possível salvar snapshot de debug: ${error.message}.`);
    return { htmlSaved: false, screenshotSaved: false };
  }
}


function normalizeHtmlText(value) {
  return value
    .replace(/\\u003c/gi, '<')
    .replace(/\\u003e/gi, '>')
    .replace(/\\u0026/gi, '&')
    .replace(/\\n/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function createRawProductsFromText(text, fallbackCategory) {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const rawProducts = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!isProductNameLine(line)) {
      continue;
    }

    const lookahead = lines.slice(index + 1, index + 9);
    const hasRetail = lookahead.some((candidate) => /varejo/i.test(candidate));
    const hasPrice = lookahead.some((candidate) => /R\$/i.test(candidate) && !/varejo/i.test(candidate));

    if (!hasRetail || !hasPrice) {
      continue;
    }

    const block = [line];

    for (const candidate of lookahead) {
      if (candidate !== line) {
        block.push(candidate);
      }

      if (/varejo/i.test(candidate)) {
        break;
      }
    }

    if (!block.some((candidate) => CATEGORY_BY_TEXT.has(candidate))) {
      block.splice(1, 0, fallbackCategory);
    }

    rawProducts.push({ text: block.join('\n'), image: '' });
  }

  return rawProducts;
}

function extractRawProductsFromHtml(html, fallbackCategory) {
  const text = normalizeHtmlText(html);
  return createRawProductsFromText(text, fallbackCategory);
}


function normalizeApiPrice(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return value >= 10_000 ? value / 100 : value;
}

function findFirstString(object, keys) {
  for (const key of keys) {
    const value = object?.[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function findFirstNumberLike(object, keys) {
  for (const key of keys) {
    const value = object?.[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const moneyValue = value.includes('R$') ? extractMoneyValues(value)[0] : Number(value.replace(',', '.'));

      if (Number.isFinite(moneyValue)) {
        return moneyValue;
      }
    }
  }

  return null;
}

function findCategoryName(object, fallbackCategory) {
  const directCategory = findFirstString(object, ['category', 'categoryName', 'department', 'collection']);

  if (directCategory) {
    return directCategory;
  }

  if (object.category && typeof object.category === 'object') {
    return findFirstString(object.category, ['name', 'title', 'label']) || fallbackCategory;
  }

  if (Array.isArray(object.categories) && object.categories.length > 0) {
    const category = object.categories.find((item) => item && typeof item === 'object') || object.categories[0];

    if (typeof category === 'string') {
      return category;
    }

    return findFirstString(category, ['name', 'title', 'label']) || fallbackCategory;
  }

  return fallbackCategory;
}

function findImageUrl(object) {
  const directImage = findFirstString(object, ['image', 'imageUrl', 'imageURL', 'picture', 'pictureUrl', 'thumbnail', 'thumbnailUrl', 'photo', 'photoUrl']);

  if (directImage) {
    return directImage;
  }

  const images = object.images || object.pictures || object.photos || object.medias;

  if (Array.isArray(images)) {
    for (const image of images) {
      if (typeof image === 'string' && image.trim()) {
        return image.trim();
      }

      if (image && typeof image === 'object') {
        const imageUrl = findFirstString(image, ['url', 'src', 'image', 'imageUrl', 'thumbnailUrl']);

        if (imageUrl) {
          return imageUrl;
        }
      }
    }
  }

  return '';
}

function objectToRawProduct(object, fallbackCategory) {
  const name = findFirstString(object, ['name', 'title', 'label', 'productName']);

  if (!name || !isProductNameLine(name)) {
    return null;
  }

  const description = [
    findFirstString(object, ['description', 'details', 'body', 'notes', 'subtitle']),
    findFirstString(object, ['additionalDescription', 'shortDescription']),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const retailFromDescription = description.match(/varejo\s*:?\s*(R\$\s*\d+(?:[.,]\d{2})?)/i)?.[1];
  const retailPrice = normalizeApiPrice(
    retailFromDescription
      ? parseMoneyToNumber(retailFromDescription)
      : findFirstNumberLike(object, ['supplierRetailPrice', 'retailPrice', 'suggestedRetailPrice', 'compareAtPrice', 'originalPrice']),
  );
  const costPrice = normalizeApiPrice(findFirstNumberLike(object, ['price', 'salePrice', 'amount', 'value', 'unitPrice']));

  if (!Number.isFinite(costPrice) || !Number.isFinite(retailPrice)) {
    return null;
  }

  const category = findCategoryName(object, fallbackCategory);
  const text = [
    name,
    category,
    `R$${costPrice.toFixed(2)}`,
    `Varejo: R$ ${retailPrice.toFixed(2).replace('.', ',')}`,
    description.replace(/#?\s*varejo\s*:?\s*R\$\s*\d+(?:[.,]\d{2})?/gi, '').trim(),
  ]
    .filter(Boolean)
    .join('\n');

  return { text, image: findImageUrl(object) };
}

function collectRawProductsFromJson(value, fallbackCategory, rawProducts = [], seen = new WeakSet()) {
  if (!value || typeof value !== 'object') {
    return rawProducts;
  }

  if (seen.has(value)) {
    return rawProducts;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      collectRawProductsFromJson(item, fallbackCategory, rawProducts, seen);
    }

    return rawProducts;
  }

  const rawProduct = objectToRawProduct(value, fallbackCategory);

  if (rawProduct) {
    rawProducts.push(rawProduct);
  }

  for (const entryValue of Object.values(value)) {
    collectRawProductsFromJson(entryValue, fallbackCategory, rawProducts, seen);
  }

  return rawProducts;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonPayloadsFromHtml(html) {
  const payloads = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html))) {
    const scriptContent = match[1]?.trim();

    if (!scriptContent) {
      continue;
    }

    const directJson = tryParseJson(scriptContent);

    if (directJson) {
      payloads.push({ source: 'script-json', data: directJson });
      continue;
    }

    for (const assignmentMatch of scriptContent.matchAll(/(?:window\.|globalThis\.)?[A-Z_a-z0-9$.]+\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\]);?\s*$/g)) {
      const parsedAssignment = tryParseJson(assignmentMatch[1]);

      if (parsedAssignment) {
        payloads.push({ source: 'script-assignment', data: parsedAssignment });
      }
    }
  }

  return payloads;
}

function createNetworkCollector(page, category) {
  const jsonResponses = [];
  const pending = [];

  async function recordResponse(response) {
    const request = response.request();
    const resourceType = request.resourceType();
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    const shouldInspect =
      contentType.includes('json') ||
      /api|graphql|catalog|product|item|store|public/i.test(url) ||
      resourceType === 'xhr' ||
      resourceType === 'fetch';

    if (!shouldInspect) {
      return;
    }

    try {
      const text = await response.text();
      jsonResponses.push({
        url,
        status: response.status(),
        resourceType,
        contentType,
        text: text.slice(0, 250_000),
      });
    } catch (error) {
      jsonResponses.push({
        url,
        status: response.status(),
        resourceType,
        contentType,
        error: error.message,
        text: '',
      });
    }
  }

  function handler(response) {
    pending.push(recordResponse(response));
  }

  page.on('response', handler);

  return {
    async stop() {
      page.off('response', handler);
      await Promise.allSettled(pending);
    },
    async saveSamples() {
      const sampleResponses = jsonResponses.filter((response) => response.text || response.error);

      if (sampleResponses.length === 0) {
        return [];
      }

      await mkdir(DEBUG_DIR, { recursive: true });
      const samplePath = path.join(DEBUG_DIR, `${slugify(category.name)}-network-${Date.now()}.json`);
      const payload = sampleResponses.map((response) => ({
        url: response.url,
        status: response.status,
        resourceType: response.resourceType,
        contentType: response.contentType,
        error: response.error,
        sample: response.text.slice(0, 20_000),
      }));
      await writeFile(samplePath, JSON.stringify(payload, null, 2));
      log(`Amostra de rede salva em ${path.relative(ROOT_DIR, samplePath)}.`);
      return sampleResponses;
    },
    extractRawProducts() {
      const rawProducts = [];

      for (const response of jsonResponses) {
        const parsedJson = tryParseJson(response.text);

        if (parsedJson) {
          rawProducts.push(...collectRawProductsFromJson(parsedJson, category.name));
        } else if (response.text) {
          rawProducts.push(...createRawProductsFromText(normalizeHtmlText(response.text), category.name));
        }
      }

      return rawProducts;
    },
    endpoints() {
      return [...new Set(jsonResponses.map((response) => `${response.status} ${response.resourceType} ${response.url}`))];
    },
  };
}

function buildCanonicalIdentityKey(product) {
  const name = normalizeTextToken(product.name);
  const category = normalizeTextToken(product.category || 'all');
  const reference = normalizeTextToken(product.olfactoryReference || '');
  const volume = product.volumeMl ? `${product.volumeMl}ml` : '';
  const sourceCategory = normalizeTextToken(product.sourceCategory || product.category || '');
  const brand = normalizeTextToken(product.brand || '').split(' ')[0] || '';
  return [name, category, reference, volume, sourceCategory, brand].filter(Boolean).join('|');
}

function productScore(p) {
  const missing = ['image','retailLine','supplierRetailPrice','costPrice','olfactoryReference','category','description'].filter((k)=>!p[k]).length;
  return (p.image?80:0)+(p.retailLine?60:0)+(Number.isFinite(p.supplierRetailPrice)?50:0)+(Number.isFinite(p.costPrice)?40:0)+(p.olfactoryReference?30:0)+(p.category?20:0)+((p.description||p.rawText||'').length/40)-missing*5;
}

function mergeDuplicateRecords(records) {
  const sorted=[...records].sort((a,b)=>productScore(b)-productScore(a));
  const winner={...sorted[0]};
  const images=new Set([winner.image, ...(winner.allImages||[])].filter(Boolean).map(normalizeImageUrl));
  const altNames=new Set([winner.name]);
  const altUrls=new Set([winner.sourceUrl]);
  const altPrices=[];
  const rawFragments=[];
  for (const rec of sorted) {
    if (!winner.image && rec.image) winner.image=rec.image;
    if (!winner.retailLine && rec.retailLine) winner.retailLine=rec.retailLine;
    if (!Number.isFinite(winner.supplierRetailPrice) && Number.isFinite(rec.supplierRetailPrice)) winner.supplierRetailPrice=rec.supplierRetailPrice;
    if (!Number.isFinite(winner.costPrice) && Number.isFinite(rec.costPrice)) winner.costPrice=rec.costPrice;
    if (!winner.olfactoryReference && rec.olfactoryReference) winner.olfactoryReference=rec.olfactoryReference;
    if (!winner.description && rec.description) winner.description=rec.description;
    if (!winner.category && rec.category) winner.category=rec.category;
    if (rec.image) images.add(normalizeImageUrl(rec.image));
    if (rec.name) altNames.add(rec.name);
    if (rec.sourceUrl) altUrls.add(rec.sourceUrl);
    if (Number.isFinite(rec.supplierRetailPrice) || Number.isFinite(rec.costPrice)) altPrices.push({supplierRetailPrice:rec.supplierRetailPrice,costPrice:rec.costPrice});
    if (rec.rawText) rawFragments.push(rec.rawText);
  }
  winner.allImages=[...images];
  winner.image=winner.image?normalizeImageUrl(winner.image):'';
  winner.alternateNames=[...altNames].filter((n)=>n!==winner.name);
  winner.alternateSourceUrls=[...altUrls].filter((u)=>u!==winner.sourceUrl);
  winner.alternatePrices=altPrices;
  winner.duplicateEvidence={canonicalKey:buildCanonicalIdentityKey(winner),score:productScore(winner)};
  winner.extractionSources=['dom/html/script/network'];
  winner.duplicateCount=records.length;
  winner.rawFragments=rawFragments;
  return winner;
}

function isInvalidUiPhrase(text) {
  const normalized = normalizeTextToken(text);
  if (!normalized) return true;
  if (INVALID_UI_PHRASES.some((phrase) => normalized === phrase || normalized.includes(phrase))) return true;
  if (/^-?\d+%\s*off$/.test(normalized) || /^%\s*off$/.test(normalized) || /^(off|desconto|promocao)$/.test(normalized)) return true;
  return false;
}

function hasMinimalProductConfidence(product) {
  const tokenCount = normalizeTextToken(product.name || '').split(/\s+/).filter((t) => t.length > 2 && !/^\d+$/.test(t)).length;
  return tokenCount >= 2 || Number.isFinite(product.supplierRetailPrice) || Boolean(product.image) || Number.isFinite(product.volumeMl);
}

function isValidProductCandidate(product) {
  const name = normalizeTextToken(product.name || '');
  if (!name || isInvalidUiPhrase(name)) return false;
  if (/loading|skeleton|placeholder/.test(name)) return false;
  const hasMetadata = Boolean(product.image || product.description || product.olfactoryReference || Number.isFinite(product.supplierRetailPrice) || Number.isFinite(product.costPrice));
  if (!hasMetadata) return false;
  return hasMinimalProductConfidence(product);
}

function hasPerfumeLikeEvidence(product) {
  const textBlob = normalizeTextToken([product.name, product.description, product.olfactoryReference, product.rawText].filter(Boolean).join(' '));
  return /\b(perfume|parfum|fragrancia|fragrance|eau|deo cologne|colonia|edp|edt)\b/.test(textBlob);
}

function hasStrongProductFields(product) {
  const hasValidPrice = Number.isFinite(product.costPrice) || Number.isFinite(product.supplierRetailPrice);
  const hasValidMl = Number.isFinite(product.volumeMl) && product.volumeMl >= 5 && product.volumeMl <= 1_000;
  const hasValidCategory = Boolean(product.category && !isInvalidUiPhrase(product.category));
  const normalizedName = normalizeTextToken(product.name || '');
  const imageAlt = normalizeTextToken(product.imageAlt || '');
  const hasImageAltMatch = Boolean(imageAlt && normalizedName && (imageAlt.includes(normalizedName) || normalizedName.includes(imageAlt)));
  return hasValidPrice || hasValidMl || hasValidCategory || hasImageAltMatch;
}

function shouldRejectBeforeImageDownload(product) {
  const normalizedName = normalizeTextToken(product.name || '');
  if (!normalizedName || isInvalidUiPhrase(normalizedName)) return true;
  if (!hasPerfumeLikeEvidence(product) && !hasStrongProductFields(product)) return true;
  return false;
}

function finalNormalizeAndDedupe(products) {
  const report={rawRecordsObserved:products.length,validRecords:0,invalidDiscarded:0,duplicateGroups:0,partialRecordsMerged:0,finalDuplicatesCollapsed:0,uniqueProductsExported:0,productsWithoutImage:0,productsWithoutPrice:0,recoveredNames:0,recoveredReferences:0,extractionWarnings:[]};
  const valid=[];
  for (const p of products){ if (isValidProductCandidate(p)) valid.push(p); else report.invalidDiscarded+=1; }
  report.validRecords=valid.length;
  const groups=new Map();
  for (const p of valid){ const k=buildCanonicalIdentityKey(p); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(p);} 
  report.duplicateGroups=[...groups.values()].filter(g=>g.length>1).length;
  const merged=[];
  for (const g of groups.values()){ const m=mergeDuplicateRecords(g); if(g.length>1){report.finalDuplicatesCollapsed+=g.length-1; report.partialRecordsMerged+=1;} merged.push(m);} 
  report.uniqueProductsExported=merged.length;
  report.productsWithoutImage=merged.filter((p)=>!p.image).length;
  report.productsWithoutPrice=merged.filter((p)=>!Number.isFinite(p.costPrice)&&!Number.isFinite(p.supplierRetailPrice)).length;
  return {products:merged.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),report};
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
  let imageDownloadsPreventedByPreValidation = 0;
  const approvedProducts = [];

  for (const product of products) {
    if (shouldRejectBeforeImageDownload(product)) {
      imageDownloadsPreventedByPreValidation += 1;
      continue;
    }

    approvedProducts.push(product);
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

  return { products: approvedProducts, imageDownloadsPreventedByPreValidation };
}

async function cleanupInvalidUiNoiseImages() {
  await mkdir(IMAGE_DIR, { recursive: true });
  const files = await readdir(IMAGE_DIR);
  const removed = [];
  for (const file of files) {
    const base = file.replace(path.extname(file), '');
    if (isInvalidUiPhrase(base)) {
      await unlink(path.join(IMAGE_DIR, file));
      removed.push(file);
    }
  }
  return removed;
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
  const networkCollector = createNetworkCollector(page, category);
  log(`Iniciando categoria: ${category.name} (${categoryUrl})`);

  try {
    try {
      await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    } catch (error) {
      warn(`goto não completou para ${category.name}: ${error.message}. Continuando com o DOM disponível.`);
    }

    log(`Aguardando renderização inicial por ${INITIAL_RENDER_WAIT_MS}ms em ${category.name}.`);
    await page.waitForTimeout(INITIAL_RENDER_WAIT_MS);
    await autoScroll(page);
    await networkCollector.stop();

    const extraction = await extractRawProducts(page);
    const html = await page.content();
    const challenge = detectCloudflareChallenge(html, page.url());

    if (challenge.blocked) {
      await networkCollector.saveSamples();
      await saveDebugSnapshot(
        page,
        category,
        `Cloudflare/Turnstile detectado em ${category.name}; evidências=${challenge.evidence.join(', ')}`,
      );
      throw new SupplierBlockedError(category.name, challenge.evidence);
    }

    const htmlRawProducts = extractRawProductsFromHtml(html, category.name);
    const scriptPayloads = extractJsonPayloadsFromHtml(html);
    const scriptRawProducts = scriptPayloads.flatMap((payload) => collectRawProductsFromJson(payload.data, category.name));
    const networkRawProducts = networkCollector.extractRawProducts();
    const networkEndpoints = networkCollector.endpoints();

    if (networkEndpoints.length > 0) {
      log(`Endpoints inspecionados em ${category.name}:`);
      for (const endpoint of networkEndpoints.slice(0, 20)) {
        log(`- ${endpoint}`);
      }
      await networkCollector.saveSamples();
    } else {
      log(`Nenhum endpoint XHR/fetch/JSON inspecionado em ${category.name}.`);
    }

    const rawProducts = [
      ...extraction.products,
      ...htmlRawProducts,
      ...scriptRawProducts,
      ...networkRawProducts,
    ];
    log(
      `Candidatos em ${category.name}: domNodesObserved=${extraction.domNodesObserved}, candidateCards=${extraction.selectorCandidateCount}, dom=${extraction.products.length}, html=${htmlRawProducts.length}, scripts=${scriptRawProducts.length}, rede=${networkRawProducts.length}, retailElements=${extraction.retailElementCount}, roots=${extraction.rootCandidateCount}`,
    );

    if (rawProducts.length === 0 && DEBUG_SCRAPER_HTML) {
      await saveDebugSnapshot(page, category, `Nenhum candidato a produto encontrado em ${category.name}`);
    }

    const parsedProducts = rawProducts
      .map((rawProduct) => parseProduct(rawProduct, category.name, categoryUrl))
      .filter(Boolean);

    if (parsedProducts.length === 0 && rawProducts.length > 0) {
      await saveDebugSnapshot(page, category, `Candidatos encontrados, mas nenhum produto válido parseado em ${category.name}`, { writeHtml: true, writeScreenshot: true });
    }

    return parsedProducts;
  } finally {
    await networkCollector.stop();
  }
}

async function main() {
  log(`Fonte: ${SUPPLIER_URL}`);
  log(`Categorias configuradas: ${CATEGORY_PATHS.map((category) => category.name).join(', ')}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(45_000);
  const products = [];
  const runReport = {
    successfulCategories: [],
    failedCategories: [],
    emptyCategories: [],
    errorByCategory: {},
    screenshotsSaved: 0,
    htmlSnapshotsSaved: 0,
  };

  try {
    for (const category of CATEGORY_PATHS) {
      try {
        const categoryProducts = await scrapeCategory(page, category);
        log(`Produtos válidos em ${category.name}: ${categoryProducts.length}`);
        products.push(...categoryProducts);
        if (categoryProducts.length === 0) {
          runReport.emptyCategories.push({ category: category.name, reason: 'no-valid-products' });
        } else {
          runReport.successfulCategories.push(category.name);
        }
      } catch (error) {
        runReport.failedCategories.push(category.name);
        runReport.errorByCategory[category.name] = truncateLogText(error.message);
        const helperName = error?.helperName || error?.name || 'unknown-helper';
        const stage = error?.stage || 'category-extraction';
        warn(`Falha categoria=${category.name} stage=${stage} helper=${helperName}: ${error.message}`);
        const snap = await saveDebugSnapshot(page, category, `Falha inesperada em ${category.name}`, { writeHtml: true, writeScreenshot: true });
        if (snap.htmlSaved) runReport.htmlSnapshotsSaved += 1;
        if (snap.screenshotSaved) runReport.screenshotsSaved += 1;
      }
    }
  } finally {
    await browser.close();
  }

  log(`Total bruto: ${products.length}`);
  const { products: dedupedProducts, report } = finalNormalizeAndDedupe(products);
  const finalValidatedProducts = dedupedProducts.filter(isValidProductCandidate);
  log(`Total após deduplicação final: ${dedupedProducts.length}`);
  log(`Total após validação final pré-imagem: ${finalValidatedProducts.length}`);
  log(`Relatório: ${JSON.stringify(report)}`);

  if (finalValidatedProducts.length === 0) {
    throw new Error('Nenhum produto foi extraído do fornecedor. Consulte tmp/scraper-debug para snapshots HTML/screenshot.');
  }

  const removedInvalidImages = await cleanupInvalidUiNoiseImages();
  if (removedInvalidImages.length > 0) {
    log(`Cleanup removeu ${removedInvalidImages.length} imagens inválidas já baixadas.`);
  }

  const hydrationResult = await hydrateImages(finalValidatedProducts);
  log(`Métrica imageDownloadsPreventedByPreValidation=${hydrationResult.imageDownloadsPreventedByPreValidation}`);
  await writeProductsFile(hydrationResult.products);
  const invalidUiElementsDiscarded = report.invalidDiscarded;
  const promoCardsDiscarded = products.filter((p) => /^-?\d+%\s*off$/i.test(normalizeTextToken(p.name || ''))).length;
  log(`FinalReport=${JSON.stringify({
    totalRawRecords: products.length,
    totalAfterFinalDedupe: dedupedProducts.length,
    totalAfterFinalValidation: finalValidatedProducts.length,
    imageDownloadsPreventedByPreValidation: hydrationResult.imageDownloadsPreventedByPreValidation,
    invalidUiElementsDiscarded,
    promoCardsDiscarded,
    successfulCategories: runReport.successfulCategories,
    failedCategories: runReport.failedCategories,
    errorByCategory: runReport.errorByCategory,
    screenshotsSaved: runReport.screenshotsSaved,
    htmlSnapshotsSaved: runReport.htmlSnapshotsSaved,
  })}`);

  log(`Arquivo atualizado: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
  log(`Imagens salvas em: ${path.relative(ROOT_DIR, IMAGE_DIR)}`);
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} [error] ${error.message}`);
  process.exitCode = 1;
});
