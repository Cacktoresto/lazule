(() => {
  const LOG_PREFIX = '[LAZULE browser extractor]';
  const MAX_PRODUCT_TEXT_LENGTH = 1800;
  const CATEGORY_NAMES = new Set(['All', 'Masculinos', 'Femininos', 'Kit', 'Árabe', 'Nicho', 'Pastas Isabelle']);

  function log(message) {
    console.log(`${LOG_PREFIX} ${message}`);
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

  function getImageUrl(element) {
    const image = element?.querySelector?.('img');

    if (!image) {
      return '';
    }

    return (
      image.currentSrc ||
      image.src ||
      image.getAttribute('data-src') ||
      image.getAttribute('data-lazy-src') ||
      image.getAttribute('srcset')?.split(',')?.[0]?.trim()?.split(' ')?.[0] ||
      ''
    );
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

      if (parentRetailCount > 1 || parentText.length > MAX_PRODUCT_TEXT_LENGTH) {
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

    for (let attempt = 1; attempt <= 40; attempt += 1) {
      const step = Math.max(650, Math.floor(window.innerHeight * 0.75));
      window.scrollBy(0, step);
      await new Promise((resolve) => setTimeout(resolve, 750));

      const height = document.body.scrollHeight;
      const y = window.scrollY;
      const reachedBottom = y + window.innerHeight >= height - 8;
      const unchanged = height === previousHeight && Math.round(y) === Math.round(previousY);
      stableRounds = unchanged || reachedBottom ? stableRounds + 1 : 0;

      log(`scroll ${attempt}: y=${Math.round(y)} altura=${height}`);

      previousHeight = height;
      previousY = y;

      if (stableRounds >= 3) {
        break;
      }
    }

    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  function extractRawProducts() {
    const retailElements = [...document.querySelectorAll('body *')]
      .filter((element) => {
        const text = visibleText(element);
        return hasProductPriceShape(text) && countRetailMarkers(text) === 1 && text.length <= MAX_PRODUCT_TEXT_LENGTH;
      });
    const roots = new Set(retailElements.map((element) => findProductRoot(element)));
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
        return hasProductPriceShape(text) && countRetailMarkers(text) === 1 && text.length <= MAX_PRODUCT_TEXT_LENGTH;
      });
    const byText = new Map();

    for (const element of [...roots, ...selectorCandidates]) {
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

  (async function run() {
    log('Iniciando scroll automático. Aguarde até o download do JSON.');
    await autoScroll();

    const fallbackCategory = document.querySelector('[aria-current="page"]')?.textContent?.trim() || document.title || '';
    const rawProducts = extractRawProducts();
    const products = rawProducts
      .map((rawProduct) => parseProductBlock(rawProduct, fallbackCategory))
      .filter((product) => product.name && Number.isFinite(product.costPrice) && Number.isFinite(product.supplierRetailPrice));

    log(`Blocos encontrados: ${rawProducts.length}`);
    log(`Produtos válidos: ${products.length}`);
    console.table(products.map(({ name, category, costPrice, supplierRetailPrice, image }) => ({ name, category, costPrice, supplierRetailPrice, image })));

    if (products.length === 0) {
      console.warn(`${LOG_PREFIX} Nenhum produto válido encontrado. Verifique se você está na página do catálogo após passar pelo Cloudflare e se os produtos estão visíveis.`);
    }

    downloadJson(products);
  })();
})();
