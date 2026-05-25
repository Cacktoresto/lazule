import { getAvailabilityStatus } from '../utils/availability.js';
import { getCommercialStatus, shouldExposeInMainCatalog } from '../utils/commercialStatus.js';
import { inferCatalogType } from '../utils/catalogFilters.js';
import { createSearchIndex, createSearchTokens, inferBrandFromName, normalizeSearchText } from '../utils/search.js';
import { createBrandSlug, createProductSlug } from '../utils/productRouting.js';
import { sanitizePublicProduct } from '../data/publicProductSanitizer.js';
import { OLFACTIVE_SEMANTIC_ENRICHMENT } from '../data/generated/olfactiveSemanticEnrichment.js';


function buildLightweightOlfactiveProfile(product = {}) {
  const text = normalizeSearchText([product.description, product.olfactoryReference, product.category, product.gender, ...(product.notes || []), ...(product.badges || [])].filter(Boolean).join(' '));
  const accords = [];
  if (text.includes('citr') || text.includes('fresh')) accords.push('citrus');
  if (text.includes('madeir') || text.includes('woody')) accords.push('woody');
  if (text.includes('ambar') || text.includes('amber')) accords.push('amber');
  if (text.includes('doce') || text.includes('sweet') || text.includes('vanilla')) accords.push('sweet');
  const signature = accords.includes('amber') || accords.includes('sweet') ? 'seductive_night' : 'clean_luxury';
  return { accords, signature, personality: accords.includes('woody') ? 'executive' : 'elegant', narrative: accords.length ? `Perfil com foco ${accords.slice(0,2).join(' + ')}.` : 'Perfil olfativo em curadoria', occasion: signature === 'seductive_night' ? 'nightlife' : 'daily', temperature: accords.includes('amber') ? 'warm' : 'fresh', projection: accords.includes('amber') ? 'high' : 'moderate' };
}

function inferSemanticClusterLight(product = {}, profile = {}) {
  const text = normalizeSearchText([product.category, product.olfactoryReference, profile.signature, ...(profile.accords || [])].join(' '));
  if (text.includes('arabe') || text.includes('amber')) return 'dark_amber';
  if (text.includes('citr') || text.includes('fresh')) return 'clean_luxury';
  if (text.includes('woody')) return 'executive_fresh';
  return 'intimate_skin_scent';
}

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
  const generatedProfile = buildLightweightOlfactiveProfile(publicProduct);
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
    semanticCluster: inferSemanticClusterLight(publicProduct, generatedProfile),
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
