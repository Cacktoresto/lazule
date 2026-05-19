(() => {
  const CONFIG = {
    maxProductTextLength: 2400,
    scrollDelayMs: 900,
    lazySettleDelayMs: 650,
    finalSettleDelayMs: 1200,
    minImageWidth: 80,
    minImageHeight: 80,
    maxStaleCycles: 5,
    maxScrollCycles: 200,
    maxRuntimeMs: 120000,
    maxProducts: null,
    bottomThresholdPx: 18,
    scrollStepRatio: 0.8,
    scrollLoopWindow: 8,
  };

  const LOG_PREFIX = '[LAZULE browser extractor]';
  const CATEGORY_NAMES = new Set(['All', 'Masculinos', 'Femininos', 'Kit', 'Árabe', 'Nicho', 'Pastas Isabelle']);
  const IGNORED_IMAGE_PATTERN = /logo|icon|favicon|banner|placeholder|sprite|brand|avatar|whatsapp|facebook|instagram/i;
  const STRICT_PRODUCT_CARD_SELECTOR = [
    'article[class*="product" i]',
    'li[class*="product" i]',
    '[data-testid*="product" i]',
    '[data-cy*="product" i]',
    '[class*="catalog" i] article',
    '[class*="catalog" i] li',
    '[class*="product-grid" i] > *',
  ].join(',');
  const INVALID_UI_PHRASES = ['back to top', 'create a website', 'kyte', 'loading', 'order by', 'masculino', 'feminino'];

  function log(message, extra) {
    if (extra !== undefined) {
      console.log(`${LOG_PREFIX} ${message}`, extra);
      return;
    }

    console.log(`${LOG_PREFIX} ${message}`);
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalizeText(value) {
    return (value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
  }

  function visibleText(element) {
    return normalizeText(element?.innerText || element?.textContent || '');
  }

  function normalizeIdentityPart(value) {
    return normalizeText(String(value || ''))
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[|]+/g, ' ')
      .trim();
  }

  function getBestSrcsetUrl(srcset) {
    if (!srcset) return '';

    const parsed = srcset
      .split(',')
      .map((item) => item.trim())
      .map((item) => {
        const [url, sizeHint] = item.split(/\s+/);
        const numericHint = Number((sizeHint || '').replace(/\D/g, ''));
        return { url, score: Number.isFinite(numericHint) ? numericHint : 0 };
      })
      .filter((item) => item.url);

    parsed.sort((a, b) => b.score - a.score);
    return parsed[0]?.url || '';
  }

  function parseBgImageUrl(element) {
    const value = window.getComputedStyle(element).backgroundImage;
    const match = value?.match(/url\(["']?(.+?)["']?\)/i);
    return match?.[1] || '';
  }

  function isUsableImageUrl(url) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return false;
    return !IGNORED_IMAGE_PATTERN.test(url);
  }

  function isUsableImageElement(image) {
    if (!image) return false;
    const altAndClass = `${image.alt || ''} ${image.title || ''} ${image.className || ''} ${image.id || ''}`;
    const rect = image.getBoundingClientRect();
    const naturalWidth = image.naturalWidth || rect.width;
    const naturalHeight = image.naturalHeight || rect.height;
    return !IGNORED_IMAGE_PATTERN.test(altAndClass) && naturalWidth >= CONFIG.minImageWidth && naturalHeight >= CONFIG.minImageHeight;
  }

  function getImageCandidates(image) {
    return [
      image.currentSrc,
      image.src,
      image.getAttribute('src'),
      image.getAttribute('data-src'),
      image.getAttribute('data-lazy-src'),
      image.getAttribute('data-original'),
      getBestSrcsetUrl(image.getAttribute('srcset')),
      getBestSrcsetUrl(image.getAttribute('data-srcset')),
    ].filter(isUsableImageUrl);
  }

  function getImageData(element) {
    const images = [...element.querySelectorAll('img')].filter(isUsableImageElement);
    const imageCandidates = new Set();

    for (const image of images) {
      for (const candidate of getImageCandidates(image)) imageCandidates.add(candidate);
    }

    for (const bgElement of [element, ...element.querySelectorAll('*')]) {
      const bgUrl = parseBgImageUrl(bgElement);
      if (isUsableImageUrl(bgUrl)) imageCandidates.add(bgUrl);
    }

    const allImages = [...imageCandidates];
    return {
      image: allImages[0] || '',
      allImages,
      imageMissing: allImages.length === 0,
    };
  }

  function parseMoneyToNumber(value) {
    const raw = String(value || '').replace(/R\$\s*R\$/gi, 'R$').replace(/R\$|\s/g, '').trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[^\d.,]/g, '');
    if (!cleaned) return null;
    if (cleaned.includes(',')) return Number(cleaned.replace(/\./g, '').replace(',', '.'));
    const pieces = cleaned.split('.');
    if (pieces.length > 2) return Number(`${pieces.slice(0, -1).join('')}.${pieces.at(-1)}`);
    return Number(cleaned);
  }

  function extractMoneyValues(text) {
    const cleanedText = String(text || '').replace(/R\$\s*R\$/gi, 'R$');
    return (cleanedText.match(/R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?|R\$\s*\d+(?:[.,]\d{2})?/gi) || [])
      .map((m) => parseMoneyToNumber(m))
      .filter((price) => Number.isFinite(price));
  }

  function cleanupName(name, category) {
    let out = normalizeText(name)
      .replace(/\b\d{1,2}%\s*off\b/gi, '')
      .replace(/\bpromo[cç][aã]o\b/gi, '')
      .replace(/\bvarejo\b.*$/i, '')
      .replace(/R\$\s*\d[\d.,]*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (category) {
      const prefix = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*[-:|]?\s*`, 'i');
      out = out.replace(prefix, '').trim();
    }

    return out;
  }

  function detectCategory(card, fallbackCategory) {
    const fromCurrent = document.querySelector('[aria-current="page"], [aria-selected="true"], .active, [data-active="true"]')?.textContent?.trim();
    const cardText = visibleText(card);
    const fromKnown = [...CATEGORY_NAMES].find((item) => new RegExp(`\\b${item}\\b`, 'i').test(cardText));
    const fromUrl = window.location.pathname.split('/').filter(Boolean).at(-1)?.replace(/[-_]/g, ' ');
    const pageHeading = document.querySelector('h1, h2')?.textContent?.trim();
    return fromKnown || fromCurrent || fallbackCategory || fromUrl || pageHeading || '';
  }

  function detectName(card, rawText) {
    const direct = [
      ...card.querySelectorAll('h1,h2,h3,h4,[title],[aria-label],[data-name],[class*="name" i]'),
    ]
      .map((node) => normalizeText(node.getAttribute?.('title') || node.getAttribute?.('aria-label') || node.textContent || ''))
      .find((value) => value && value.length > 2 && value.length <= 180 && !/R\$|varejo|comprar|whatsapp/i.test(value));

    if (direct) return direct;
    const firstLine = normalizeText(rawText).split('\n').map((line) => line.trim()).find((line) => line && !/R\$|varejo|comprar|whatsapp/i.test(line));
    return firstLine || '';
  }

  function computeConfidence(product) {
    const hasName = Boolean(product.name);
    const hasCategory = Boolean(product.category);
    const hasPrice = Number.isFinite(product.supplierRetailPrice) || Number.isFinite(product.costPrice);

    if (hasName && hasCategory && hasPrice) return 'high';
    if (hasName && (hasCategory || hasPrice || Boolean(product.image))) return 'medium';
    return 'low';
  }

  function buildIdentityKey(product) {
    return [
      normalizeIdentityPart(product.name),
      normalizeIdentityPart(product.category),
      normalizeIdentityPart(product.retailLine),
      normalizeIdentityPart(product.image),
      normalizeIdentityPart(product.sourceUrl),
    ].join('|');
  }

  function toSnapshot(card) {
    const html = normalizeText(card.outerHTML || '').slice(0, 1200);
    return html;
  }

  function mergeProductRecords(base, incoming) {
    const merged = { ...base };

    const candidateFields = ['name', 'category', 'retailLine', 'description', 'olfactoryReference', 'sourceUrl', 'rawText'];
    for (const field of candidateFields) {
      if (!merged[field] && incoming[field]) merged[field] = incoming[field];
    }

    if (!Number.isFinite(merged.costPrice) && Number.isFinite(incoming.costPrice)) merged.costPrice = incoming.costPrice;
    if (!Number.isFinite(merged.supplierRetailPrice) && Number.isFinite(incoming.supplierRetailPrice)) merged.supplierRetailPrice = incoming.supplierRetailPrice;

    merged.allImages = [...new Set([...(base.allImages || []), ...(incoming.allImages || [])])];
    merged.alternatePrices = [...new Set([...(base.alternatePrices || []), ...(incoming.alternatePrices || [])])];
    merged.alternateSourceUrls = [...new Set([...(base.alternateSourceUrls || []), ...(incoming.alternateSourceUrls || [])])];
    merged.image = merged.image || incoming.image || '';
    merged.imageMissing = !merged.image;
    merged.rawCardSnapshot = merged.rawCardSnapshot || incoming.rawCardSnapshot;
    merged.duplicateCount = (base.duplicateCount || 1) + 1;
    merged.extractionConfidence = computeConfidence(merged);
    merged.missingFields = ['name', 'category', 'supplierRetailPrice', 'costPrice', 'image'].filter((field) => {
      if (field === 'image') return !merged.image;
      return !merged[field] && !Number.isFinite(merged[field]);
    });
    merged.needsReview = merged.extractionConfidence === 'low';

    return merged;
  }

  function isInvalidUiText(value) {
    const normalized = normalizeIdentityPart(value);
    if (!normalized) return true;
    if (INVALID_UI_PHRASES.some((phrase) => normalized === phrase || normalized.includes(phrase))) return true;
    if (/^-?\d+%\s*off$/.test(normalized) || /^%\s*off$/.test(normalized) || /^(off|desconto|promocao)$/.test(normalized)) return true;
    return false;
  }

  function findProductElements() {
    return [...document.querySelectorAll(STRICT_PRODUCT_CARD_SELECTOR)]
      .filter((element) => {
        const text = visibleText(element);
        if (!text || text.length > CONFIG.maxProductTextLength) return false;
        if (isInvalidUiText(text)) return false;
        const hasTitle = Boolean(detectName(element, text));
        const hasAnySupport = /R\$|varejo/i.test(text) || Boolean(getImageData(element).image) || /\b(?:masculino|feminino|nicho|arabe|kit)\b/i.test(text);
        return hasTitle && hasAnySupport;
      });
  }

  function getScrollContainer() {
    const candidates = [document.scrollingElement, document.documentElement, document.body].filter(Boolean);
    return candidates[0];
  }

  function extractFromCard(card, fallbackCategory) {
    const rawText = visibleText(card);
    if (!rawText) return null;

    const prices = extractMoneyValues(rawText);
    const retailLine = normalizeText(rawText.split('\n').find((line) => /varejo/i.test(line)) || '');
    const name = cleanupName(detectName(card, rawText), fallbackCategory);
    const category = detectCategory(card, fallbackCategory);
    const imageData = getImageData(card);
    const description = normalizeText(rawText.replace(name, '').slice(0, 400));

    const product = {
      name,
      category,
      retailLine,
      supplierRetailPrice: prices.at(-1) ?? null,
      costPrice: prices[0] ?? null,
      description,
      olfactoryReference: (description.match(/(?:ref\.?\s*olfativa|refer[eê]ncia\s*olfativa)\s*:?\s*(.+)/i) || [])[1] || '',
      image: imageData.image,
      allImages: imageData.allImages,
      imageMissing: imageData.imageMissing,
      sourceUrl: window.location.href,
      alternateSourceUrls: [window.location.href],
      rawText,
      rawCardSnapshot: toSnapshot(card),
      extractionSource: 'browserExtractor:v2',
      extractionTimestamp: new Date().toISOString(),
      alternatePrices: prices,
      duplicateCount: 1,
    };

    product.extractionConfidence = computeConfidence(product);
    product.needsReview = product.extractionConfidence === 'low';
    product.missingFields = ['name', 'category', 'supplierRetailPrice', 'costPrice', 'image'].filter((field) => {
      if (field === 'image') return !product.image;
      return !product[field] && !Number.isFinite(product[field]);
    });

    return product;
  }

  async function run() {
    const startedAt = Date.now();
    const productsByKey = new Map();
    const uniqueKeys = new Set();
    const report = {
      domNodesObserved: 0,
      candidateCards: 0,
      validCards: 0,
      invalidUiElementsDiscarded: 0,
      promoCardsDiscarded: 0,
      imageDownloadsPrevented: 0,
      totalDomCardsObserved: 0,
      uniqueProductsExtracted: 0,
      duplicateMerges: 0,
      confidenceTotals: { high: 0, medium: 0, low: 0 },
      productsMissingImage: 0,
      productsMissingPrice: 0,
      productsMissingCategory: 0,
      staleCycles: 0,
      stopReason: 'unknown',
      runtimeMs: 0,
      newProductsPerCycle: [],
    };

    const scrollContainer = getScrollContainer();
    const fallbackCategory = document.querySelector('[aria-current="page"]')?.textContent?.trim() || document.title || '';
    const history = [];

    for (let cycle = 1; cycle <= CONFIG.maxScrollCycles; cycle += 1) {
      if (Date.now() - startedAt >= CONFIG.maxRuntimeMs) {
        report.stopReason = 'max_runtime';
        break;
      }

      await sleep(CONFIG.scrollDelayMs);
      const beforeCount = uniqueKeys.size;
      report.domNodesObserved += document.querySelectorAll('body *').length;
      const cards = findProductElements();
      report.candidateCards += cards.length;
      report.totalDomCardsObserved += cards.length;

      const scanPasses = [0, CONFIG.lazySettleDelayMs];
      for (const passDelay of scanPasses) {
        if (passDelay) await sleep(passDelay);
        const cardsInPass = findProductElements();

        for (const card of cardsInPass) {
          const product = extractFromCard(card, fallbackCategory);
          if (!product || !product.name) continue;
          if (isInvalidUiText(product.name) || isInvalidUiText(product.rawText)) {
            report.invalidUiElementsDiscarded += 1;
            report.imageDownloadsPrevented += product.image ? 1 : 0;
            continue;
          }
          if (/^-?\d+%\s*off$/i.test(product.name)) {
            report.promoCardsDiscarded += 1;
            report.imageDownloadsPrevented += product.image ? 1 : 0;
            continue;
          }
          const tokenCount = normalizeIdentityPart(product.name).split(' ').filter((t) => t.length > 2).length;
          const minimalConfidence = tokenCount >= 2 || Number.isFinite(product.supplierRetailPrice) || Boolean(product.image) || /\b\d{2,4}\s*ml\b/i.test(product.rawText);
          if (!minimalConfidence) {
            report.invalidUiElementsDiscarded += 1;
            report.imageDownloadsPrevented += product.image ? 1 : 0;
            continue;
          }
          report.validCards += 1;

          const identity = buildIdentityKey(product);
          if (!uniqueKeys.has(identity)) {
            uniqueKeys.add(identity);
            productsByKey.set(identity, product);
          } else {
            const current = productsByKey.get(identity);
            productsByKey.set(identity, mergeProductRecords(current, product));
            report.duplicateMerges += 1;
          }
        }
      }

      const newProducts = uniqueKeys.size - beforeCount;
      report.newProductsPerCycle.push({ cycle, newProducts });
      report.staleCycles = newProducts === 0 ? report.staleCycles + 1 : 0;

      const top = Math.round(scrollContainer.scrollTop || window.scrollY || 0);
      const height = Math.round(scrollContainer.scrollHeight || document.body.scrollHeight || 0);
      const client = Math.round(scrollContainer.clientHeight || window.innerHeight || 0);
      history.push(`${top}:${height}:${client}`);
      if (history.length > CONFIG.scrollLoopWindow) history.shift();

      const repeated = history.filter((entry) => entry === history[history.length - 1]).length >= 3;
      const nearBottom = top + client >= height - CONFIG.bottomThresholdPx;

      if (CONFIG.maxProducts && uniqueKeys.size >= CONFIG.maxProducts) {
        report.stopReason = 'max_products';
        break;
      }

      if (repeated && report.staleCycles > 1) {
        report.stopReason = 'scroll_loop_detected';
        break;
      }

      if (report.staleCycles >= CONFIG.maxStaleCycles) {
        report.stopReason = nearBottom ? 'bottom_stable' : 'no_new_products';
        break;
      }

      if (cycle === CONFIG.maxScrollCycles) {
        report.stopReason = 'max_scroll_cycles';
        break;
      }

      const step = Math.max(200, Math.floor((scrollContainer.clientHeight || window.innerHeight) * CONFIG.scrollStepRatio));
      scrollContainer.scrollBy({ top: step, behavior: 'auto' });
    }

    const products = [...productsByKey.values()];
    report.uniqueProductsExtracted = products.length;

    for (const product of products) {
      report.confidenceTotals[product.extractionConfidence] += 1;
      if (!product.image) report.productsMissingImage += 1;
      if (!Number.isFinite(product.supplierRetailPrice) && !Number.isFinite(product.costPrice)) report.productsMissingPrice += 1;
      if (!product.category) report.productsMissingCategory += 1;
    }

    report.runtimeMs = Date.now() - startedAt;

    const payload = {
      extractedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      productCount: products.length,
      products,
      extractionReport: report,
    };

    log(`Extração finalizada com stopReason=${report.stopReason}; produtos=${products.length}; duplicatasMescladas=${report.duplicateMerges}`);
    console.table(products.map((p) => ({ name: p.name, category: p.category, costPrice: p.costPrice, supplierRetailPrice: p.supplierRetailPrice, confidence: p.extractionConfidence, image: p.image })));
    log('Relatório de qualidade', report);

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

  run().catch((error) => {
    console.error(`${LOG_PREFIX} falha inesperada na extração`, error);
    const fallbackPayload = {
      extractedAt: new Date().toISOString(),
      sourceUrl: window.location.href,
      productCount: 0,
      products: [],
      extractionReport: {
        stopReason: 'unexpected_error',
        error: String(error?.message || error),
      },
    };

    const blob = new Blob([JSON.stringify(fallbackPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'supplier-products.partial.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
})();
