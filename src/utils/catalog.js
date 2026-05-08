import { products } from '../data/products.js';
import { getAvailabilityStatus } from './availability.js';
import { inferCatalogType } from './catalogFilters.js';
import { createSearchIndex, createSearchTokens, inferBrandFromName, normalizeSearchText } from './search.js';
import { createBrandSlug, createProductSlug } from './productRouting.js';

const PROMOTIONAL_NAME_PATTERN = /^-?\s*\d+\s*%\s*off$/i;

export function isPromotionalName(value) {
  return PROMOTIONAL_NAME_PATTERN.test(String(value ?? '').trim());
}

export function getSafeProductName(product) {
  if (!isPromotionalName(product.name)) {
    return product.name;
  }

  const description = String(product.description ?? '').trim();

  if (description && !isPromotionalName(description)) {
    return description;
  }

  return 'Fragrância LAZULE';
}

export function getCatalogProducts(sourceProducts = products) {
  return sourceProducts.map((product) => {
    const safeName = getSafeProductName(product);
    const inferredBrand = product.brand && !isPromotionalName(product.brand) ? product.brand : inferBrandFromName(safeName);
    const brand = inferredBrand || inferBrandFromName(safeName);
    const availability = getAvailabilityStatus(product);
    const catalogType = inferCatalogType({ ...product, name: safeName, brand });
    const enrichedProduct = { ...product, name: safeName, originalName: product.name, brand, availability, catalogType };

    return {
      ...enrichedProduct,
      brandSlug: createBrandSlug(brand),
      normalizedBrand: normalizeSearchText(brand),
      productSlug: createProductSlug(safeName),
      normalizedName: normalizeSearchText(safeName),
      normalizedCategory: normalizeSearchText(product.category),
      normalizedCatalogType: normalizeSearchText(catalogType),
      normalizedGender: normalizeSearchText(product.gender),
      normalizedOlfactoryReference: normalizeSearchText(product.olfactoryReference),
      searchIndex: createSearchIndex(enrichedProduct),
      searchTokens: createSearchTokens(enrichedProduct),
    };
  });
}

const PRICE_RANGE_MIN_RATIO = 0.7;
const PRICE_RANGE_MAX_RATIO = 1.4;
const MAX_PREMIUM_UPGRADES = 1;
const MIN_GOOD_RECOMMENDATION_SCORE = 140;
const PRIORITY_CATEGORIES = new Set(['arabe', 'nicho']);
const STRICT_GENDERS = new Set(['masculino', 'feminino']);
const GENERIC_NAME_TOKENS = new Set([
  'amostra',
  'deo',
  'edc',
  'edp',
  'edt',
  'elixir',
  'extrait',
  'for',
  'intense',
  'kit',
  'ml',
  'of',
  'parfum',
  'perfume',
  'pour',
  'spray',
  'the',
]);

const SCORE_WEIGHTS = {
  sameGender: 190,
  sameCategory: 180,
  sameCatalogType: 180,
  sameBrand: 55,
  priceVeryClose: 95,
  priceInRange: 70,
  olfactoryExact: 190,
  olfactorySimilar: 130,
  nameToken: 22,
  nameTokenMax: 66,
  oppositeGenderPenalty: 280,
  incompatibleCategoryPenalty: 210,
  distantPricePenalty: 150,
  weakRelationshipPenalty: 220,
};

function getProductPrice(product) {
  return Number(product.salePrice ?? product.price ?? 0);
}

function getProductSlug(product) {
  return product.productSlug ?? createProductSlug(product.name);
}

function getNormalizedName(product) {
  return product.normalizedName ?? normalizeSearchText(product.name);
}

function getIdentityKey(product) {
  return {
    id: String(product.id ?? '').trim(),
    slug: getProductSlug(product),
    name: getNormalizedName(product),
  };
}

function identityKeysOverlap(product, keys) {
  const identityKey = getIdentityKey(product);

  return Boolean(
    (identityKey.id && keys.ids.has(identityKey.id)) ||
      (identityKey.slug && keys.slugs.has(identityKey.slug)) ||
      (identityKey.name && keys.names.has(identityKey.name)),
  );
}

function addIdentityKeys(product, keys) {
  const identityKey = getIdentityKey(product);

  if (identityKey.id) {
    keys.ids.add(identityKey.id);
  }

  if (identityKey.slug) {
    keys.slugs.add(identityKey.slug);
  }

  if (identityKey.name) {
    keys.names.add(identityKey.name);
  }
}

function createIdentityKeySet(productsToRegister = []) {
  const keys = { ids: new Set(), slugs: new Set(), names: new Set() };

  productsToRegister.forEach((product) => addIdentityKeys(product, keys));

  return keys;
}

function isSameProduct(currentProduct, candidate) {
  return identityKeysOverlap(candidate, createIdentityKeySet([currentProduct]));
}

function isStrictGender(gender) {
  return STRICT_GENDERS.has(gender);
}

function isOppositeGender(currentGender, candidateGender) {
  return (
    (currentGender === 'masculino' && candidateGender === 'feminino') ||
    (currentGender === 'feminino' && candidateGender === 'masculino')
  );
}

function getCommercialCategory(product) {
  return product.normalizedCatalogType ?? normalizeSearchText(product.catalogType);
}

function isPriorityCategory(category) {
  return PRIORITY_CATEGORIES.has(category);
}

function getPriceRatio(currentProduct, candidate) {
  const currentPrice = getProductPrice(currentProduct);
  const candidatePrice = getProductPrice(candidate);

  if (!currentPrice || !candidatePrice) {
    return null;
  }

  return candidatePrice / currentPrice;
}

function isInPreferredPriceRange(currentProduct, candidate) {
  const ratio = getPriceRatio(currentProduct, candidate);

  return ratio !== null && ratio >= PRICE_RANGE_MIN_RATIO && ratio <= PRICE_RANGE_MAX_RATIO;
}

function isPremiumUpgrade(currentProduct, candidate) {
  const ratio = getPriceRatio(currentProduct, candidate);

  return ratio !== null && ratio > PRICE_RANGE_MAX_RATIO;
}

function getPriceRangeScore(currentProduct, candidate) {
  const ratio = getPriceRatio(currentProduct, candidate);

  if (ratio === null) {
    return 0;
  }

  if (ratio >= 0.9 && ratio <= 1.1) {
    return SCORE_WEIGHTS.priceVeryClose;
  }

  if (ratio >= PRICE_RANGE_MIN_RATIO && ratio <= PRICE_RANGE_MAX_RATIO) {
    return SCORE_WEIGHTS.priceInRange;
  }

  if (ratio < PRICE_RANGE_MIN_RATIO) {
    const currentPrice = getProductPrice(currentProduct);
    const premiumFloorPenalty = currentPrice >= 500 && ratio < 0.55 ? 90 : 0;

    return -SCORE_WEIGHTS.distantPricePenalty - premiumFloorPenalty - Math.round((PRICE_RANGE_MIN_RATIO - ratio) * 100);
  }

  return -SCORE_WEIGHTS.distantPricePenalty - Math.round((ratio - PRICE_RANGE_MAX_RATIO) * 80);
}

function getMeaningfulTokens(text) {
  return normalizeSearchText(text)
    .split(' ')
    .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !GENERIC_NAME_TOKENS.has(token));
}

function countCommonNameTokens(currentProduct, candidate) {
  const currentTokens = new Set(getMeaningfulTokens(currentProduct.name));
  const candidateTokens = new Set(getMeaningfulTokens(candidate.name));

  return [...currentTokens].filter((token) => candidateTokens.has(token)).length;
}

function getOlfactorySimilarityScore(currentProduct, candidate) {
  const currentReference = currentProduct.normalizedOlfactoryReference;
  const candidateReference = candidate.normalizedOlfactoryReference;

  if (!currentReference || !candidateReference) {
    return { score: 0, matched: false };
  }

  if (currentReference === candidateReference) {
    return { score: SCORE_WEIGHTS.olfactoryExact, matched: true };
  }

  const currentTokens = new Set(getMeaningfulTokens(currentReference));
  const candidateTokens = new Set(getMeaningfulTokens(candidateReference));
  const commonTokenCount = [...currentTokens].filter((token) => candidateTokens.has(token)).length;
  const hasContainedReference = currentReference.includes(candidateReference) || candidateReference.includes(currentReference);

  if (commonTokenCount > 0 || hasContainedReference) {
    return { score: SCORE_WEIGHTS.olfactorySimilar, matched: true };
  }

  return { score: 0, matched: false };
}

function getRecommendationScore(currentProduct, candidate) {
  if (isSameProduct(currentProduct, candidate)) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;
  let clearRelationshipCount = 0;

  const currentGender = currentProduct.normalizedGender;
  const candidateGender = candidate.normalizedGender;
  const currentCategory = currentProduct.normalizedCategory;
  const candidateCategory = candidate.normalizedCategory;
  const currentCatalogType = getCommercialCategory(currentProduct);
  const candidateCatalogType = getCommercialCategory(candidate);

  if (currentGender && currentGender === candidateGender) {
    score += SCORE_WEIGHTS.sameGender;
    clearRelationshipCount += 1;
  } else if (isOppositeGender(currentGender, candidateGender)) {
    score -= SCORE_WEIGHTS.oppositeGenderPenalty;
  } else if (isStrictGender(currentGender) && candidateGender === 'unissex') {
    score += 35;
  }

  if (currentCatalogType && currentCatalogType === candidateCatalogType) {
    score += SCORE_WEIGHTS.sameCatalogType;
    clearRelationshipCount += 1;
  } else if (isPriorityCategory(currentCatalogType) || isPriorityCategory(candidateCatalogType)) {
    score -= SCORE_WEIGHTS.incompatibleCategoryPenalty;
  }

  if (currentCategory && currentCategory === candidateCategory) {
    score += SCORE_WEIGHTS.sameCategory;
    clearRelationshipCount += 1;
  } else if (isPriorityCategory(currentCategory) || isPriorityCategory(candidateCategory)) {
    score -= SCORE_WEIGHTS.incompatibleCategoryPenalty;
  }

  score += getPriceRangeScore(currentProduct, candidate);

  if (isInPreferredPriceRange(currentProduct, candidate)) {
    clearRelationshipCount += 1;
  }

  if (currentProduct.normalizedBrand && currentProduct.normalizedBrand === candidate.normalizedBrand) {
    score += SCORE_WEIGHTS.sameBrand;
    clearRelationshipCount += 1;
  }

  const olfactorySimilarity = getOlfactorySimilarityScore(currentProduct, candidate);
  score += olfactorySimilarity.score;

  if (olfactorySimilarity.matched) {
    clearRelationshipCount += 1;
  }

  const commonNameTokens = countCommonNameTokens(currentProduct, candidate);

  if (commonNameTokens > 0) {
    score += Math.min(SCORE_WEIGHTS.nameTokenMax, commonNameTokens * SCORE_WEIGHTS.nameToken);
    clearRelationshipCount += 1;
  }

  if (clearRelationshipCount === 0) {
    score -= SCORE_WEIGHTS.weakRelationshipPenalty;
  }

  if (candidate.featured) {
    score += 2;
  }

  return score;
}

function sortRecommendationItems(a, b) {
  return b.score - a.score || Number(b.product.featured) - Number(a.product.featured) || a.product.name.localeCompare(b.product.name, 'pt-BR');
}

function createFallbackItems(scoredItems, currentProduct, shouldAvoidOppositeGender) {
  const currentGender = currentProduct.normalizedGender;
  const currentCategory = currentProduct.normalizedCategory;
  const currentCatalogType = getCommercialCategory(currentProduct);

  return scoredItems.filter(({ product }) => {
    const hasSameGender = currentGender && product.normalizedGender === currentGender;
    const hasSameCategory = currentCategory && product.normalizedCategory === currentCategory;
    const hasSameCatalogType = currentCatalogType && getCommercialCategory(product) === currentCatalogType;

    if (shouldAvoidOppositeGender && isOppositeGender(currentGender, product.normalizedGender)) {
      return false;
    }

    return hasSameGender && (hasSameCategory || hasSameCatalogType) && isInPreferredPriceRange(currentProduct, product);
  });
}

function addRecommendationProducts(recommendations, candidates, currentProduct, targetCount) {
  const selectedKeys = createIdentityKeySet([currentProduct, ...recommendations]);
  let premiumUpgradeCount = recommendations.filter((product) => isPremiumUpgrade(currentProduct, product)).length;

  candidates.some((item) => {
    const product = item.product ?? item;

    if (recommendations.length >= targetCount) {
      return true;
    }

    if (identityKeysOverlap(product, selectedKeys)) {
      return false;
    }

    if (isPremiumUpgrade(currentProduct, product)) {
      if (premiumUpgradeCount >= MAX_PREMIUM_UPGRADES) {
        return false;
      }

      premiumUpgradeCount += 1;
    }

    recommendations.push(product);
    addIdentityKeys(product, selectedKeys);

    return false;
  });
}

export function getProductRecommendations(currentProduct, allProducts = getCatalogProducts(), { min = 4, max = 8 } = {}) {
  const targetCount = Math.max(0, Math.min(max, allProducts.length - 1));
  const currentGender = currentProduct.normalizedGender;
  const sameGenderProducts = allProducts.filter(
    (candidate) => !isSameProduct(currentProduct, candidate) && currentGender && candidate.normalizedGender === currentGender,
  );
  const shouldAvoidOppositeGender = isStrictGender(currentGender) && sameGenderProducts.length >= min;
  const uniqueCandidateKeys = createIdentityKeySet([currentProduct]);
  const uniqueCandidates = [];

  allProducts.forEach((candidate) => {
    if (identityKeysOverlap(candidate, uniqueCandidateKeys)) {
      return;
    }

    addIdentityKeys(candidate, uniqueCandidateKeys);
    uniqueCandidates.push(candidate);
  });

  const scoredItems = uniqueCandidates
    .map((candidate) => ({ product: candidate, score: getRecommendationScore(currentProduct, candidate) }))
    .sort(sortRecommendationItems);
  const goodItems = scoredItems.filter(({ product, score }) => {
    if (score < MIN_GOOD_RECOMMENDATION_SCORE) {
      return false;
    }

    return !(shouldAvoidOppositeGender && isOppositeGender(currentGender, product.normalizedGender));
  });
  const fallbackItems = createFallbackItems(scoredItems, currentProduct, shouldAvoidOppositeGender);
  const recommendations = [];

  addRecommendationProducts(recommendations, goodItems, currentProduct, targetCount);

  if (recommendations.length < min) {
    addRecommendationProducts(recommendations, fallbackItems, currentProduct, targetCount);
  }

  return recommendations.slice(0, max);
}

export function getFeaturedCollections(allProducts = getCatalogProducts()) {
  const sortedByFeatured = [...allProducts].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || Number(b.available) - Number(a.available) || a.name.localeCompare(b.name, 'pt-BR'),
  );
  const mostWantedBrands = new Set(['creed', 'dior', 'chanel', 'parfums de marly', 'maison francis kurkdjian']);
  const arabicHighlights = allProducts
    .filter((product) => product.catalogType === 'Árabe')
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.brand.localeCompare(b.brand, 'pt-BR'));
  const mostWanted = allProducts
    .filter((product) => mostWantedBrands.has(product.normalizedBrand) || product.featured || product.olfactoryReference)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, 'pt-BR'));

  return {
    weeklySelection: sortedByFeatured.slice(0, 8),
    mostWanted: mostWanted.slice(0, 8),
    arabicHighlights: arabicHighlights.slice(0, 8),
  };
}

export function getBrandBySlug(slug, allProducts = getCatalogProducts()) {
  const normalizedSlug = createBrandSlug(slug);
  const brandProducts = allProducts.filter((product) => product.brandSlug === normalizedSlug);
  const brandName = brandProducts[0]?.brand ?? '';

  return brandProducts.length > 0 ? { slug: normalizedSlug, name: brandName, products: brandProducts } : null;
}
