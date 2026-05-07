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
  return `/produto/${createProductSlug(product.name)}`;
}

export function getProductSlugFromPath(pathname) {
  const match = String(pathname || '').match(/^\/produto\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function findProductBySlug(products, slug) {
  return products.find((product) => createProductSlug(product.name) === slug) ?? null;
}
