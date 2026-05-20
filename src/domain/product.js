import { getAvailabilityStatus } from '../utils/availability.js';
import { getCommercialStatus, shouldExposeInMainCatalog } from '../utils/commercialStatus.js';
import { inferCatalogType } from '../utils/catalogFilters.js';
import { createSearchIndex, createSearchTokens, inferBrandFromName, normalizeSearchText } from '../utils/search.js';
import { createBrandSlug, createProductSlug } from '../utils/productRouting.js';
import { sanitizePublicProduct } from '../data/publicProductSanitizer.js';

const PROMOTIONAL_NAME_PATTERN = /^-?\s*\d+\s*%\s*off$/i;

export function isPromotionalName(value) {
  return PROMOTIONAL_NAME_PATTERN.test(String(value ?? '').trim());
}

export function getSafeProductName(product = {}) {
  if (!isPromotionalName(product.name)) {
    return String(product.name ?? '').trim() || 'Fragrância LAZULE';
  }

  const description = String(product.description ?? '').trim();

  if (description && !isPromotionalName(description)) {
    return description;
  }

  return 'Fragrância LAZULE';
}

export function pickPublicProductFields(product = {}) {
  return sanitizePublicProduct(product);
}

export function normalizeProduct(rawProduct = {}) {
  const publicProduct = pickPublicProductFields(rawProduct);
  const safeName = getSafeProductName(publicProduct);
  const inferredBrand = publicProduct.brand && !isPromotionalName(publicProduct.brand) ? publicProduct.brand : inferBrandFromName(safeName);
  const brand = inferredBrand || inferBrandFromName(safeName);
  const status = getCommercialStatus(publicProduct);
  const availability = getAvailabilityStatus({ ...publicProduct, status });
  const catalogType = inferCatalogType({ ...publicProduct, name: safeName, brand });
  const salePrice = Number(publicProduct.salePrice ?? 0);
  const image = String(publicProduct.image ?? '').trim();
  const enrichedProduct = {
    ...publicProduct,
    name: safeName,
    originalName: publicProduct.name,
    brand,
    salePrice: Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : 0,
    image,
    badges: Array.isArray(publicProduct.badges) ? publicProduct.badges.filter(Boolean) : [],
    description: String(publicProduct.description ?? '').trim(),
    olfactoryReference: String(publicProduct.olfactoryReference ?? '').trim(),
    status,
    commercialStatus: status,
    availability,
    category: publicProduct.category ?? catalogType,
    catalogType,
    available: status === 'in_stock' && publicProduct.available !== false,
    catalogVisibility: publicProduct.catalogVisibility ?? (shouldExposeInMainCatalog({ status }) ? 'catalog' : 'reference'),
    featured: Boolean(publicProduct.featured),
  };

  return {
    ...enrichedProduct,
    brandSlug: createBrandSlug(brand),
    normalizedBrand: normalizeSearchText(brand),
    productSlug: createProductSlug(safeName),
    productPath: `/produto/${encodeURIComponent(createProductSlug(safeName))}`,
    normalizedName: normalizeSearchText(safeName),
    normalizedCategory: normalizeSearchText(publicProduct.category ?? catalogType),
    normalizedCatalogType: normalizeSearchText(catalogType),
    normalizedGender: normalizeSearchText(publicProduct.gender),
    normalizedOlfactoryReference: normalizeSearchText(publicProduct.olfactoryReference),
    description: publicProduct.description_editorial || enrichedProduct.description,
    olfactoryReference: enrichedProduct.olfactoryReference || (Array.isArray(publicProduct.similarTo) ? publicProduct.similarTo[0] ?? '' : ''),
    searchIndex: createSearchIndex({ ...enrichedProduct, description: publicProduct.description_editorial || enrichedProduct.description }),
    searchTokens: createSearchTokens(enrichedProduct),
  };
}

export function normalizeProducts(rawProducts = []) {
  return rawProducts.map(normalizeProduct);
}
