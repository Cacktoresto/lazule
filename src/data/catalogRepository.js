import { getLocalCatalogProducts } from './localCatalogAdapter.js';
import { fetchSupabaseCatalogProducts } from './supabaseCatalogAdapter.js';
import { CATALOG_SOURCE_SUPABASE, getCatalogSource } from './catalogSourceConfig.js';
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

let cachedRemoteCatalog;
let remoteCatalogPromise;
let warnedAboutRemoteFallback = false;

function isSupabaseCatalogSelected(options = {}) {
  return (options.source ?? getCatalogSource()) === CATALOG_SOURCE_SUPABASE;
}

function warnAboutRemoteFallback(error) {
  if (warnedAboutRemoteFallback || typeof console === 'undefined') {
    return;
  }

  warnedAboutRemoteFallback = true;
  console.warn('[catalogRepository] Falling back to the local catalog because the Supabase adapter is unavailable.', error);
}

function getLocalFallbackProducts(options = {}) {
  return getLocalCatalogProducts(options.sourceProducts);
}

export function getAllProducts(options = {}) {
  if (options.sourceProducts) {
    return getLocalFallbackProducts(options);
  }

  if (isSupabaseCatalogSelected(options)) {
    if (cachedRemoteCatalog) {
      return cachedRemoteCatalog;
    }

    if (options.preload !== false && !remoteCatalogPromise) {
      remoteCatalogPromise = getAllProductsAsync(options).catch((error) => {
        warnAboutRemoteFallback(error);
        return getLocalFallbackProducts(options);
      });
    }
  }

  return getLocalFallbackProducts(options);
}

export async function getAllProductsAsync(options = {}) {
  if (options.sourceProducts) {
    return getLocalFallbackProducts(options);
  }

  if (!isSupabaseCatalogSelected(options)) {
    return getLocalFallbackProducts(options);
  }

  if (cachedRemoteCatalog) {
    return cachedRemoteCatalog;
  }

  if (!remoteCatalogPromise) {
    remoteCatalogPromise = fetchSupabaseCatalogProducts(options)
      .then((products) => {
        cachedRemoteCatalog = products;
        return products;
      })
      .catch((error) => {
        remoteCatalogPromise = undefined;

        if (options.fallbackToLocal === false) {
          throw error;
        }

        warnAboutRemoteFallback(error);
        return getLocalFallbackProducts(options);
      });
  }

  return remoteCatalogPromise;
}

export function preloadCatalogProducts(options = {}) {
  return getAllProductsAsync(options);
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

export default {
  DEFAULT_CATALOG_FILTERS,
  getAllProducts,
  getAllProductsAsync,
  preloadCatalogProducts,
  getProductBySlug,
  getProductsByBrand,
  getBrandBySlug,
  searchProducts,
  getFeaturedProducts,
};
