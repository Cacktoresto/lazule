import { getLocalCatalogProducts } from './localCatalogAdapter.js';
import { ALL_FILTER_VALUE, filterAndSortCatalogProducts } from '../utils/catalogFilters.js';
import { createBrandSlug, createProductSlug, getProductSlugFromPath } from '../utils/productRouting.js';

export const DEFAULT_CATALOG_FILTERS = {
  category: ALL_FILTER_VALUE,
  gender: ALL_FILTER_VALUE,
  brand: ALL_FILTER_VALUE,
  priceRange: 'all',
  imageMode: 'all',
  availabilityStatus: 'all',
  availableOnly: false,
  sortBy: 'featured',
};

export function getAllProducts(options = {}) {
  return getLocalCatalogProducts(options.sourceProducts);
}

function normalizeProductSlugInput(slug) {
  return getProductSlugFromPath(slug) ?? createProductSlug(slug);
}

export function getProductBySlug(slug, allProducts = getAllProducts()) {
  const normalizedSlug = normalizeProductSlugInput(slug);
  return allProducts.find((product) => product.productSlug === normalizedSlug) ?? null;
}

export function getProductsByBrand(brandOrSlug, allProducts = getAllProducts()) {
  const normalizedSlug = createBrandSlug(brandOrSlug);
  return allProducts.filter((product) => product.brandSlug === normalizedSlug);
}

export function getBrandBySlug(slug, allProducts = getAllProducts()) {
  const normalizedSlug = createBrandSlug(slug);
  const brandProducts = getProductsByBrand(normalizedSlug, allProducts);
  const brandName = brandProducts[0]?.brand ?? '';

  return brandProducts.length > 0 ? { slug: normalizedSlug, name: brandName, products: brandProducts } : null;
}

export function searchProducts(searchTerm, allProducts = getAllProducts(), filters = {}) {
  return filterAndSortCatalogProducts(allProducts, { ...DEFAULT_CATALOG_FILTERS, ...filters }, searchTerm);
}

export function getFeaturedProducts(allProducts = getAllProducts(), limit = 12) {
  return allProducts.filter((product) => product.featured).slice(0, limit);
}
