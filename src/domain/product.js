import { getAvailabilityStatus } from '../utils/availability.js';
import { inferCatalogType } from '../utils/catalogFilters.js';
import { createSearchIndex, createSearchTokens, inferBrandFromName, normalizeSearchText } from '../utils/search.js';
import { createBrandSlug, createProductSlug } from '../utils/productRouting.js';

const PROMOTIONAL_NAME_PATTERN = /^-?\s*\d+\s*%\s*off$/i;
const PUBLIC_PRODUCT_FIELDS = [
  'id',
  'name',
  'brand',
  'category',
  'gender',
  'salePrice',
  'image',
  'badges',
  'description',
  'olfactoryReference',
  'available',
  'featured',
];

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
  return Object.fromEntries(PUBLIC_PRODUCT_FIELDS.map((field) => [field, product[field]]));
}

export function normalizeProduct(rawProduct = {}) {
  const publicProduct = pickPublicProductFields(rawProduct);
  const safeName = getSafeProductName(publicProduct);
  const inferredBrand = publicProduct.brand && !isPromotionalName(publicProduct.brand) ? publicProduct.brand : inferBrandFromName(safeName);
  const brand = inferredBrand || inferBrandFromName(safeName);
  const availability = getAvailabilityStatus(publicProduct);
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
    availability,
    catalogType,
    available: publicProduct.available !== false,
    featured: Boolean(publicProduct.featured),
  };

  return {
    ...enrichedProduct,
    brandSlug: createBrandSlug(brand),
    normalizedBrand: normalizeSearchText(brand),
    productSlug: createProductSlug(safeName),
    productPath: `/produto/${encodeURIComponent(createProductSlug(safeName))}`,
    normalizedName: normalizeSearchText(safeName),
    normalizedCategory: normalizeSearchText(publicProduct.category),
    normalizedCatalogType: normalizeSearchText(catalogType),
    normalizedGender: normalizeSearchText(publicProduct.gender),
    normalizedOlfactoryReference: normalizeSearchText(publicProduct.olfactoryReference),
    searchIndex: createSearchIndex(enrichedProduct),
    searchTokens: createSearchTokens(enrichedProduct),
  };
}

export function normalizeProducts(rawProducts = []) {
  return rawProducts.map(normalizeProduct);
}
