export function createProductSlug(productName) {
  const slug = String(productName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'fragrancia-lazule';
}

export function createProductPath(product) {
  const name = typeof product === 'string' ? product : product?.name;
  const slug = typeof product === 'object' && product?.productSlug ? product.productSlug : createProductSlug(name);

  return `/produto/${encodeURIComponent(slug)}`;
}

function safelyDecodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getProductSlugFromPath(pathname) {
  const match = String(pathname || '').match(/^\/produto\/([^/]+)\/?$/);
  return match ? createProductSlug(safelyDecodePathSegment(match[1])) : null;
}

export function createBrandSlug(brandName) {
  return createProductSlug(brandName || 'lazule');
}

export function createBrandPath(brandName) {
  return `/marca/${encodeURIComponent(createBrandSlug(brandName))}`;
}

export function getBrandSlugFromPath(pathname) {
  const match = String(pathname || '').match(/^\/marca\/([^/]+)\/?$/);
  return match ? createBrandSlug(safelyDecodePathSegment(match[1])) : null;
}

export function getCompareSlugFromPath(pathname) {
  const match = String(pathname || '').match(/^\/compare\/([^/]+)\/?$/);
  return match ? safelyDecodePathSegment(match[1]) : null;
}

export function normalizeSpaPath(path = '/') {
  try {
    const url = new URL(String(path || '/'), 'https://lazule.local');
    const pathname = url.pathname !== '/' ? url.pathname.replace(/\/+$/, '') : '/';
    return `${pathname || '/'}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export function findProductBySlug(products = [], slug) {
  const normalizedSlug = createProductSlug(slug);
  return products.find((product) => (product.productSlug ?? createProductSlug(product.name)) === normalizedSlug) ?? null;
}
