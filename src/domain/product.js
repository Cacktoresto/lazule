import { getAvailabilityStatus } from '../utils/availability.js';
import { getCommercialStatus, shouldExposeInMainCatalog } from '../utils/commercialStatus.js';
import { inferCatalogType } from '../utils/catalogFilters.js';
import { createSearchIndex, createSearchTokens, inferBrandFromName, normalizeSearchText } from '../utils/search.js';
import { createBrandSlug, createProductSlug } from '../utils/productRouting.js';
import { sanitizePublicProduct } from '../data/publicProductSanitizer.js';
import { OLFACTIVE_SEMANTIC_ENRICHMENT } from '../data/generated/olfactiveSemanticEnrichment.js';
import { buildOlfactiveProfile } from '../ai/olfactiveEnrichment.js';
import { inferFacet, inferCluster } from '../ai/semanticIntelligenceLayer.js';

const ENRICHMENT_BY_SLUG = new Map(OLFACTIVE_SEMANTIC_ENRICHMENT.map((item) => [item.slug, item]));

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

  const productSlug = createProductSlug(safeName);
  const enrichment = ENRICHMENT_BY_SLUG.get(productSlug);
  const generatedProfile = buildOlfactiveProfile(publicProduct);
  const semanticConfidence = Number(enrichment?.enrichmentConfidence ?? rawProduct.semanticConfidence ?? 0.55);
  const shouldUseFallback = semanticConfidence < 0.66;
  const semanticFacets = [
    ...(generatedProfile?.accords || []),
    ...(enrichment?.semanticDescriptors || []),
  ].filter(Boolean).slice(0, 4);
  const narrative = shouldUseFallback
    ? 'Perfil olfativo em curadoria'
    : (generatedProfile?.narrative || enrichment?.olfactiveNarrative || String(publicProduct.description_editorial || '').trim());
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
    olfactiveProfile: generatedProfile,
    narrative,
    signature: shouldUseFallback ? 'Perfil olfativo em curadoria' : (generatedProfile.signature || enrichment?.luxuryInterpretation || ''),
    personality: shouldUseFallback ? 'Curadoria discreta' : (generatedProfile.personality || ''),
    occasion: generatedProfile.occasion,
    temperature: generatedProfile.temperature,
    projection: generatedProfile.projection,
    semanticFacets,
    semanticConfidence,
    semanticReasons: shouldUseFallback ? ['Perfil olfativo em curadoria'] : [generatedProfile.narrative, ...(enrichment?.similarIntentQueries || [])].filter(Boolean).slice(0, 3),
    semanticCluster: inferCluster(publicProduct, inferFacet(publicProduct)),
  };

  return {
    ...enrichedProduct,
    brandSlug: createBrandSlug(brand),
    normalizedBrand: normalizeSearchText(brand),
    productSlug,
    productPath: `/produto/${encodeURIComponent(productSlug)}`,
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
