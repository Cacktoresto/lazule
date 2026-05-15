import { createBrandPath, createProductPath, normalizeSpaPath } from './productRouting.js';

export const SITE_NAME = 'LAZULE FRAGRANCES';
export const DEFAULT_ORIGIN = 'https://lazulefragrances.com.br';
export const DEFAULT_SOCIAL_IMAGE_PATH = '/lazule-social-preview.svg';
export const DEFAULT_DESCRIPTION = 'Curadoria premium de perfumes importados, árabes e fragrâncias de nicho com atendimento direto e elegante pelo WhatsApp.';

function getOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_ORIGIN;
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function trimDescription(value, fallback = DEFAULT_DESCRIPTION) {
  const description = cleanText(value, fallback);

  return description.length > 165 ? `${description.slice(0, 162).trim()}…` : description;
}

export function createCanonicalUrl(path = '/') {
  try {
    const normalizedPath = normalizeSpaPath(path || '/');
    const url = new URL(normalizedPath, getOrigin());
    url.hash = '';
    return url.href;
  } catch {
    return new URL('/', getOrigin()).href;
  }
}

export function createAbsoluteAssetUrl(pathOrUrl = DEFAULT_SOCIAL_IMAGE_PATH) {
  try {
    return new URL(pathOrUrl || DEFAULT_SOCIAL_IMAGE_PATH, getOrigin()).href;
  } catch {
    return new URL(DEFAULT_SOCIAL_IMAGE_PATH, DEFAULT_ORIGIN).href;
  }
}

function createTitle(value) {
  const title = cleanText(value, SITE_NAME);

  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

function getProductImage(product) {
  return cleanText(product?.image) || createAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_PATH);
}

function getBrandLeadImage(brand) {
  const leadProduct = brand?.products?.find((product) => product.image) ?? brand?.products?.[0];

  return leadProduct?.image || createAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_PATH);
}

function getAvailabilitySchema(product) {
  return product?.available === false || product?.availability?.state === 'unavailable'
    ? 'https://schema.org/OutOfStock'
    : 'https://schema.org/InStock';
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((item) => item !== undefined);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined && entryValue !== '')
      .map(([key, entryValue]) => [key, stripUndefined(entryValue)]),
  );
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

  element.textContent = JSON.stringify(stripUndefined(payload));
}

function removeJsonLd(id) {
  document.getElementById(id)?.remove();
}

export function createOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: createCanonicalUrl('/'),
    logo: createAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_PATH),
    sameAs: ['https://wa.me/5521975110562'],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+55 21 97511-0562',
      contactType: 'customer service',
      availableLanguage: 'Portuguese',
      url: 'https://wa.me/5521975110562',
    },
  };
}

export function createWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: createCanonicalUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${createCanonicalUrl('/catalogo')}?busca={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function createProductJsonLd(product) {
  const canonicalUrl = createCanonicalUrl(createProductPath(product));
  const price = Number(product?.salePrice);

  return stripUndefined({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: cleanText(product?.name, 'Fragrância LAZULE'),
    brand: product?.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: [getProductImage(product)],
    description: createProductSeoData(product).description,
    sku: product?.id,
    category: product?.catalogType || product?.category,
    url: canonicalUrl,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: Number.isFinite(price) ? price.toFixed(2) : undefined,
      availability: getAvailabilitySchema(product),
      url: canonicalUrl,
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  });
}

export function createHomeSeoData() {
  return {
    title: 'Perfumes Importados, Árabes e Nicho Premium',
    description: 'Descubra perfumes importados, árabes e de nicho em uma curadoria premium da LAZULE FRAGRANCES com compra assistida pelo WhatsApp.',
    canonicalPath: '/',
    image: createAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_PATH),
    type: 'website',
  };
}

export function createCatalogSeoData({ searchTerm = '', filters = {}, resultCount } = {}) {
  const query = cleanText(searchTerm);
  const category = cleanText(filters.category === 'Todos' ? '' : filters.category);
  const titleParts = ['Catálogo de perfumes premium'];

  if (category) {
    titleParts.push(category);
  }

  if (query) {
    titleParts.push(`busca por ${query}`);
  }

  const countText = Number.isFinite(resultCount) ? `${resultCount} fragrâncias selecionadas` : 'fragrâncias selecionadas';

  return {
    title: titleParts.join(' — '),
    description: trimDescription(`Explore ${countText} no catálogo LAZULE FRAGRANCES com perfumes importados, árabes e nicho para atendimento personalizado pelo WhatsApp.`),
    canonicalPath: '/catalogo',
    image: createAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_PATH),
    type: 'website',
  };
}

export function createFaqSeoData() {
  return {
    title: 'FAQ e compra assistida',
    description: 'Entenda como comprar perfumes na LAZULE FRAGRANCES: catálogo, disponibilidade, atendimento consultivo pelo WhatsApp, envio e curadoria premium.',
    canonicalPath: '/faq',
    image: createAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_PATH),
    type: 'article',
  };
}

export function createBrandSeoData(brand) {
  const name = cleanText(brand?.name, 'Marca');
  const count = brand?.products?.length ?? 0;

  return {
    title: `${name} — perfumes na curadoria LAZULE`,
    description: trimDescription(`Explore ${count || 'as'} fragrâncias da marca ${name} disponíveis na curadoria premium LAZULE FRAGRANCES com atendimento pelo WhatsApp.`),
    canonicalPath: createBrandPath(name),
    image: getBrandLeadImage(brand),
    type: 'website',
  };
}

export function createProductSeoData(product) {
  const name = cleanText(product?.name, 'Produto');
  const brand = cleanText(product?.brand);
  const reference = cleanText(product?.olfactoryReference);
  const category = cleanText(product?.catalogType || product?.category);
  const descriptionParts = [
    `Conheça ${name}${brand ? ` da marca ${brand}` : ''} na curadoria premium LAZULE FRAGRANCES.`,
    category ? `Categoria: ${category}.` : '',
    reference ? `DNA olfativo inspirado em ${reference}.` : '',
    'Consulte disponibilidade e compra assistida pelo WhatsApp.',
  ];

  return {
    title: brand ? `${name} — ${brand}` : name,
    description: trimDescription(descriptionParts.filter(Boolean).join(' ')),
    canonicalPath: createProductPath(product),
    image: getProductImage(product),
    type: 'product',
  };
}

export function applyPageSeo({ title, description = DEFAULT_DESCRIPTION, canonicalPath = '/', image, type = 'website', jsonLd = [] }) {
  if (typeof document === 'undefined') {
    return;
  }

  const safeTitle = createTitle(title);
  const safeDescription = trimDescription(description);
  const canonicalUrl = createCanonicalUrl(canonicalPath);
  const previewImage = image || createAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_PATH);

  document.title = safeTitle;
  upsertMeta('meta[name="description"]', { name: 'description', content: safeDescription });
  upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: safeTitle });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: safeDescription });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'pt_BR' });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: previewImage });
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: `Preview premium ${SITE_NAME}` });
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: safeTitle });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: safeDescription });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: previewImage });

  const jsonLdEntries = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  if (jsonLdEntries.length) {
    jsonLdEntries.forEach(({ id, payload }) => upsertJsonLd(id, payload));
  }
}

export function applyHomeSeo() {
  applyPageSeo({
    ...createHomeSeoData(),
    jsonLd: [
      { id: 'lazule-organization-jsonld', payload: createOrganizationJsonLd() },
      { id: 'lazule-website-jsonld', payload: createWebSiteJsonLd() },
    ],
  });
  removeJsonLd('lazule-product-jsonld');
}

export function applyCatalogSeo(options) {
  applyPageSeo(createCatalogSeoData(options));
  removeJsonLd('lazule-product-jsonld');
}

export function applyFaqSeo() {
  applyPageSeo(createFaqSeoData());
  removeJsonLd('lazule-product-jsonld');
}

export function applyBrandSeo(brand) {
  if (!brand) {
    return;
  }

  applyPageSeo(createBrandSeoData(brand));
  removeJsonLd('lazule-product-jsonld');
}

export function applyProductSeo(product) {
  if (!product || typeof document === 'undefined') {
    return;
  }

  applyPageSeo({
    ...createProductSeoData(product),
    jsonLd: [{ id: 'lazule-product-jsonld', payload: createProductJsonLd(product) }],
  });
  removeJsonLd('lazule-organization-jsonld');
  removeJsonLd('lazule-website-jsonld');
}
