(() => {
  const CONFIG = {
    maxProductTextLength: 1800,
    scrollStepRatio: 0.45,
    minScrollStep: 320,
    scrollDelayMs: 1200,
    stableRoundsToStop: 4,
    maxScrollAttempts: 70,
    imageTimeoutMs: 1800,
    imagePollMs: 120,
    cardFocusDelayMs: 450,
    finalSettleDelayMs: 1200,
    minImageWidth: 80,
    minImageHeight: 80,
  };
  const LOG_PREFIX = '[LAZULE browser extractor]';
  const CATEGORY_NAMES = new Set(['All', 'Masculinos', 'Femininos', 'Kit', 'Árabe', 'Nicho', 'Pastas Isabelle']);
  const IGNORED_IMAGE_PATTERN = /logo|icon|favicon|banner|placeholder|sprite|brand|avatar|whatsapp|facebook|instagram/i;

  function log(message) {
    console.log(`${LOG_PREFIX} ${message}`);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeText(value) {
    return (value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  function visibleText(element) {
    return normalizeText(element?.innerText || element?.textContent || '');
  }

  function getFirstSrcsetUrl(srcset) {
    return srcset
      ?.split(',')
      ?.map((item) => item.trim().split(/\s+/)[0])
      ?.find(Boolean) || '';
  }

  function getBackgroundImageUrl(element) {
    const backgroundImage = window.getComputedStyle(element).backgroundImage;
    const match = backgroundImage?.match(/url\(["']?(.+?)["']?\)/i);
    return match?.[1] || '';
  }

  function isUsableImageUrl(url) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
      return false;
    }

    return !IGNORED_IMAGE_PATTERN.test(url);
  }

  function isUsableImageElement(image) {
    if (!image) {
      return false;
    }

    const altAndClass = `${image.alt || ''} ${image.className || ''} ${image.id || ''}`;
    const rect = image.getBoundingClientRect();
    const naturalWidth = image.naturalWidth || rect.width;
    const naturalHeight = image.naturalHeight || rect.height;

    return (
      !IGNORED_IMAGE_PATTERN.test(altAndClass) &&
      naturalWidth >= CONFIG.minImageWidth &&
      naturalHeight >= CONFIG.minImageHeight
    );
  }

  function getImageCandidateUrl(image) {
    const candidates = [
      image.currentSrc,
      image.src,
      image.getAttribute('src'),
      image.getAttribute('data-src'),
      image.getAttribute('data-lazy-src'),
      image.getAttribute('data-original'),
      getFirstSrcsetUrl(image.getAttribute('srcset')),
      getFirstSrcsetUrl(image.getAttribute('data-srcset')),
    ];

    return candidates.find(isUsableImageUrl) || '';
  }

  async function waitForImage(image) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < CONFIG.imageTimeoutMs) {
      const hasSource = Boolean(getImageCandidateUrl(image));
      const isComplete = image.complete || image.naturalWidth > 0;

      if (hasSource && isComplete) {
        return true;
      }

      await sleep(CONFIG.imagePollMs);
    }

    return Boolean(getImageCandidateUrl(image));
  }

  async function waitForVisibleImages(root = document) {
    const visibleImages = [...root.querySelectorAll('img')].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= window.innerHeight && rect.right >= 0 && rect.left <= window.innerWidth;
    });

    await Promise.allSettled(visibleImages.map(waitForImage));
  }

  function getImageUrl(element) {
    const imageElements = [...element.querySelectorAll('img')].filter(isUsableImageElement);

    for (const image of imageElements) {
      const url = getImageCandidateUrl(image);

      if (url) {
        return url;
      }
    }

    const elementsWithBackground = [element, ...element.querySelectorAll('*')];

    for (const backgroundElement of elementsWithBackground) {
      const url = getBackgroundImageUrl(backgroundElement);

      if (isUsableImageUrl(url)) {
        return url;
      }
    }

    return '';
  }

  function countRetailMarkers(text) {
    return (text.match(/varejo/gi) || []).length;
  }

  function hasProductPriceShape(text) {
    return /R\$/i.test(text) && /varejo/i.test(text) && (text.match(/R\$/gi) || []).length >= 2;
  }

  function findProductRoot(element) {
    let candidate = element;
    let current = element;

    while (current?.parentElement) {
      const parent = current.parentElement;
      const parentText = visibleText(parent);
      const parentRetailCount = countRetailMarkers(parentText);

      if (parentRetailCount > 1 || parentText.length > CONFIG.maxProductTextLength) {
        break;
      }

      if (hasProductPriceShape(parentText)) {
        candidate = parent;
      }

      current = parent;
    }

    return candidate;
  }

  function parseMoneyToNumber(value) {
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
    return (text.match(/R\$\s*\d+(?:[.,]\d{2})?/gi) || [])
      .map((match) => parseMoneyToNumber(match))
      .filter((price) => Number.isFinite(price));
  }

  function isProductNameLine(line) {
    const isCategory = CATEGORY_NAMES.has(line);
    const isPrice = /R\$|varejo/i.test(line);
    const isUiText = /^(início|inicio|catálogo|catalogo|comprar|ver mais|whatsapp|buscar|menu|all)$/i.test(line);
    return !isCategory && !isPrice && !isUiText && line.length > 2 && line.length <= 180;
  }

  function extractOlfactoryReference(description) {
    const match = description.match(/(?:ref\.?\s*olfativa|refer[eê]ncia\s*olfativa)\s*:?\s*(.+)/i);
    return match?.[1]?.trim() || '';
  }

  function parseProductBlock(rawProduct, fallbackCategory) {
    const lines = rawProduct.text
      .split('\n')
      .map((line) => line.replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const name = lines.find(isProductNameLine) || '';
    const category = lines.find((line) => CATEGORY_NAMES.has(line)) || fallbackCategory || '';
    const retailLine = lines.find((line) => /varejo/i.test(line)) || '';
    const pricesBeforeRetail = lines
      .filter((line) => !/varejo/i.test(line))
      .flatMap((line) => extractMoneyValues(line));
    const retailPrices = extractMoneyValues(retailLine);
    const description = lines
      .filter((line) => line !== name)
      .filter((line) => line !== category)
      .filter((line) => !/R\$|varejo/i.test(line))
      .join(' ')
      .trim();

    return {
      name,
      category,
      pricesBeforeRetail,
      retailLine,
      supplierRetailPrice: retailPrices.at(-1) ?? null,
      costPrice: pricesBeforeRetail[0] ?? null,
      description,
      olfactoryReference: extractOlfactoryReference(description),
      image: rawProduct.image || '',
      sourceUrl: window.location.href,
      rawText: rawProduct.text,
    };
  }

  async function autoScroll() {
    let stableRounds = 0;
    let previousHeight = 0;
    let previousY = -1;

    for (let attempt = 1; attempt <= CONFIG.maxScrollAttempts; attempt += 1) {
      const step = Math.max(CONFIG.minScrollStep, Math.floor(window.innerHeight * CONFIG.scrollStepRatio));
      window.scrollBy(0, step);
      await sleep(CONFIG.scrollDelayMs);
      await waitForVisibleImages(document);

      const height = document.body.scrollHeight;
      const y = window.scrollY;
      const reachedBottom = y + window.innerHeight >= height - 8;
      const unchanged = height === previousHeight && Math.round(y) === Math.round(previousY);
      stableRounds = unchanged || reachedBottom ? stableRounds + 1 : 0;

      log(`scroll ${attempt}: y=${Math.round(y)} altura=${height}`);

      previousHeight = height;
      previousY = y;

      if (stableRounds >= CONFIG.stableRoundsToStop) {
        break;
      }
    }

    window.scrollTo(0, 0);
    await sleep(CONFIG.finalSettleDelayMs);
  }

  function findProductElements() {
    const retailElements = [...document.querySelectorAll('body *')]
      .filter((element) => {
        const text = visibleText(element);
        return hasProductPriceShape(text) && countRetailMarkers(text) === 1 && text.length <= CONFIG.maxProductTextLength;
      });
    const roots = [...new Set(retailElements.map((element) => findProductRoot(element)))];
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
      .filter((element) => {
        const text = visibleText(element);
        return hasProductPriceShape(text) && countRetailMarkers(text) === 1 && text.length <= CONFIG.maxProductTextLength;
      });

    return [...new Set([...roots, ...selectorCandidates])];
  }

  async function extractRawProducts() {
    const byText = new Map();
    const productElements = findProductElements();

    for (const element of productElements) {
      element.scrollIntoView({ block: 'center' });
      await sleep(CONFIG.cardFocusDelayMs);
      await waitForVisibleImages(element);

      const text = visibleText(element);
      const key = text.replace(/\s+/g, ' ').trim();

      if (!key || byText.has(key)) {
        continue;
      }

      byText.set(key, {
        text,
        image: getImageUrl(element),
      });
    }

    window.scrollTo(0, 0);
    return [...byText.values()];
  }

  function downloadJson(products) {
    const payload = {
      extractedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      productCount: products.length,
      products,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supplier-products.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function logImageReport(products) {
    const withImage = products.filter((product) => product.image).length;
    const withoutImage = products.length - withImage;
    const coverage = products.length > 0 ? Math.round((withImage / products.length) * 100) : 0;
    const missingImages = products.filter((product) => !product.image).slice(0, 20).map((product) => product.name);

    log(`Total de produtos extraídos: ${products.length}`);
    log(`Produtos com imagem: ${withImage}`);
    log(`Produtos sem imagem: ${withoutImage}`);
    log(`Cobertura de imagem: ${coverage}%`);

    if (missingImages.length > 0) {
      console.warn(`${LOG_PREFIX} Até 20 produtos sem imagem para debug:`, missingImages);
    }
  }

  (async function run() {
    log('Iniciando scroll automático lento. Aguarde até o download do JSON.');
    await autoScroll();

    const fallbackCategory = document.querySelector('[aria-current="page"]')?.textContent?.trim() || document.title || '';
    const rawProducts = await extractRawProducts();
    const products = rawProducts
      .map((rawProduct) => parseProductBlock(rawProduct, fallbackCategory))
      .filter((product) => product.name && Number.isFinite(product.costPrice) && Number.isFinite(product.supplierRetailPrice));

    log(`Blocos encontrados: ${rawProducts.length}`);
    log(`Produtos válidos: ${products.length}`);
    logImageReport(products);
    console.table(products.map(({ name, category, costPrice, supplierRetailPrice, image }) => ({ name, category, costPrice, supplierRetailPrice, image })));

    if (products.length === 0) {
      console.warn(`${LOG_PREFIX} Nenhum produto válido encontrado. Verifique se você está na página do catálogo após passar pelo Cloudflare e se os produtos estão visíveis.`);
    }

    downloadJson(products);
  })();
})();
