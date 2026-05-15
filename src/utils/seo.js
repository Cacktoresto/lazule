import { createProductPath } from './productRouting.js';

const SITE_NAME = 'LAZULE FRAGRANCES';
const DEFAULT_ORIGIN = 'https://lazulefragrances.com.br';
const DEFAULT_DESCRIPTION = 'Curadoria premium de perfumes importados e árabes com atendimento direto e elegante pelo WhatsApp.';

function getOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_ORIGIN;
}

export function createCanonicalUrl(path = '/') {
  try {
    const url = new URL(path, getOrigin());
    url.hash = '';
    return url.href;
  } catch {
    return new URL('/', getOrigin()).href;
  }
}

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function upsertLink(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function upsertJsonLd(id, payload) {
  let element = document.getElementById(id);

  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(payload);
}

export function applyPageSeo({ title, description = DEFAULT_DESCRIPTION, canonicalPath = '/', image, type = 'website' }) {
  if (typeof document === 'undefined') {
    return;
  }

  const safeTitle = title?.includes(SITE_NAME) ? title : `${title || SITE_NAME} | ${SITE_NAME}`;
  const canonicalUrl = createCanonicalUrl(canonicalPath);

  document.title = safeTitle;
  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: safeTitle });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: safeTitle });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });

  if (image) {
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
  }
}

export function applyProductSeo(product) {
  if (!product || typeof document === 'undefined') {
    return;
  }

  const canonicalPath = createProductPath(product);
  const description = `Conheça ${product.name || 'esta fragrância'}${product.brand ? ` da marca ${product.brand}` : ''} na curadoria premium LAZULE FRAGRANCES.`;
  const canonicalUrl = createCanonicalUrl(canonicalPath);

  applyPageSeo({
    title: `${product.name || 'Produto'} | ${SITE_NAME}`,
    description,
    canonicalPath,
    image: product.image,
    type: 'product',
  });

  upsertJsonLd('lazule-product-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name || 'Fragrância LAZULE',
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: product.image ? [product.image] : undefined,
    description,
    url: canonicalUrl,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: Number.isFinite(Number(product.salePrice)) ? Number(product.salePrice).toFixed(2) : undefined,
      availability: product.available === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: canonicalUrl,
    },
  });
}

