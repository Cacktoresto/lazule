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
const DIVERSITY_MIN_ADJUSTED_SCORE = 120;
const DIVERSITY_RELAXED_MIN_ADJUSTED_SCORE = 80;
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
  'limited',
  'kit',
  'edition',
  'extreme',
  'man',
  'men',
  'ml',
  'of',
  'parfum',
  'perfume',
  'pour',
  'spray',
  'woman',
  'women',
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

const DIVERSITY_PENALTIES = {
  sameBrand: 85,
  sameStrongPrefix: 140,
  sameOlfactoryReference: 145,
  similarOlfactoryReference: 90,
  highNameTokenOverlap: 115,
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

function getProductDisplayName(product) {
  return String(product.name ?? '').split('|').pop() ?? '';
}

function getBrandTokens(product) {
  return new Set(getMeaningfulTokens(product.brand ?? product.normalizedBrand ?? ''));
}

function getPrimaryNameTokens(product) {
  const brandTokens = getBrandTokens(product);

  return getMeaningfulTokens(getProductDisplayName(product)).filter((token) => !brandTokens.has(token));
}

function getNameBaseKey(product) {
  const tokens = getPrimaryNameTokens(product);

  if (tokens.length === 0) {
    return getNormalizedName(product);
  }

  return tokens.slice(0, Math.min(3, tokens.length)).join(' ');
}

function getStrongNamePrefix(product) {
  const tokens = getPrimaryNameTokens(product);

  if (tokens.length < 2) {
    return tokens[0] ?? '';
  }

  return tokens.slice(0, 2).join(' ');
}

function getProductLineKey(product) {
  const baseKey = getNameBaseKey(product);
  const brandKey = product.normalizedBrand ?? normalizeSearchText(product.brand);

  return baseKey ? `${brandKey}::${baseKey}` : '';
}

function getTokenOverlapRatio(firstProduct, secondProduct) {
  const firstTokens = new Set(getPrimaryNameTokens(firstProduct));
  const secondTokens = new Set(getPrimaryNameTokens(secondProduct));

  if (firstTokens.size === 0 || secondTokens.size === 0) {
    return 0;
  }

  const commonTokenCount = [...firstTokens].filter((token) => secondTokens.has(token)).length;

  return commonTokenCount / Math.min(firstTokens.size, secondTokens.size);
}

function getOlfactoryReferenceDiversityPenalty(firstProduct, secondProduct) {
  const firstReference = firstProduct.normalizedOlfactoryReference;
  const secondReference = secondProduct.normalizedOlfactoryReference;

  if (!firstReference || !secondReference) {
    return 0;
  }

  if (firstReference === secondReference) {
    return DIVERSITY_PENALTIES.sameOlfactoryReference;
  }

  const firstTokens = new Set(getMeaningfulTokens(firstReference));
  const secondTokens = new Set(getMeaningfulTokens(secondReference));
  const commonTokenCount = [...firstTokens].filter((token) => secondTokens.has(token)).length;

  return commonTokenCount > 0 || firstReference.includes(secondReference) || secondReference.includes(firstReference)
    ? DIVERSITY_PENALTIES.similarOlfactoryReference
    : 0;
}

function getDiversityPenalty(candidate, selectedProducts) {
  return selectedProducts.reduce((penalty, selectedProduct) => {
    let itemPenalty = 0;
    const candidatePrefix = getStrongNamePrefix(candidate);
    const selectedPrefix = getStrongNamePrefix(selectedProduct);

    if (candidate.normalizedBrand && candidate.normalizedBrand === selectedProduct.normalizedBrand) {
      itemPenalty += DIVERSITY_PENALTIES.sameBrand;
    }

    if (candidatePrefix && candidatePrefix === selectedPrefix) {
      itemPenalty += DIVERSITY_PENALTIES.sameStrongPrefix;
    }

    if (getTokenOverlapRatio(candidate, selectedProduct) >= 0.75) {
      itemPenalty += DIVERSITY_PENALTIES.highNameTokenOverlap;
    }

    itemPenalty += getOlfactoryReferenceDiversityPenalty(candidate, selectedProduct);

    return penalty + itemPenalty;
  }, 0);
}

function isSameExactLine(candidate, selectedLineKeys) {
  const lineKey = getProductLineKey(candidate);

  return Boolean(lineKey && selectedLineKeys.has(lineKey));
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
  const scoreA = a.adjustedScore ?? a.score;
  const scoreB = b.adjustedScore ?? b.score;

  return scoreB - scoreA || b.score - a.score || Number(b.product.featured) - Number(a.product.featured) || a.product.name.localeCompare(b.product.name, 'pt-BR');
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

function createRecommendationSelectionState(currentProduct, recommendations = []) {
  return {
    selectedKeys: createIdentityKeySet([currentProduct, ...recommendations]),
    selectedLineKeys: new Set(recommendations.map(getProductLineKey).filter(Boolean)),
    premiumUpgradeCount: recommendations.filter((product) => isPremiumUpgrade(currentProduct, product)).length,
  };
}

function canSelectRecommendation(product, currentProduct, state) {
  if (identityKeysOverlap(product, state.selectedKeys) || isSameExactLine(product, state.selectedLineKeys)) {
    return false;
  }

  return !(isPremiumUpgrade(currentProduct, product) && state.premiumUpgradeCount >= MAX_PREMIUM_UPGRADES);
}

function selectMostDiverseRecommendation(candidates, recommendations, currentProduct, state, minimumAdjustedScore) {
  let bestItem = null;

  candidates.forEach((item) => {
    const product = item.product ?? item;

    if (!canSelectRecommendation(product, currentProduct, state)) {
      return;
    }

    const diversityPenalty = getDiversityPenalty(product, recommendations);
    const adjustedScore = item.score - diversityPenalty;

    if (adjustedScore < minimumAdjustedScore) {
      return;
    }

    const selectableItem = { ...item, diversityPenalty, adjustedScore };

    if (!bestItem || sortRecommendationItems(selectableItem, bestItem) < 0) {
      bestItem = selectableItem;
    }
  });

  return bestItem;
}

function registerSelectedRecommendation(product, recommendations, currentProduct, state) {
  recommendations.push(product);
  addIdentityKeys(product, state.selectedKeys);

  const lineKey = getProductLineKey(product);

  if (lineKey) {
    state.selectedLineKeys.add(lineKey);
  }

  if (isPremiumUpgrade(currentProduct, product)) {
    state.premiumUpgradeCount += 1;
  }
}

function addRecommendationProducts(recommendations, candidates, currentProduct, targetCount, minimumAdjustedScore = Number.NEGATIVE_INFINITY) {
  const state = createRecommendationSelectionState(currentProduct, recommendations);

  while (recommendations.length < targetCount) {
    const nextItem = selectMostDiverseRecommendation(candidates, recommendations, currentProduct, state, minimumAdjustedScore);

    if (!nextItem) {
      break;
    }

    registerSelectedRecommendation(nextItem.product ?? nextItem, recommendations, currentProduct, state);
  }
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

  addRecommendationProducts(recommendations, goodItems, currentProduct, targetCount, DIVERSITY_MIN_ADJUSTED_SCORE);

  if (recommendations.length < min) {
    addRecommendationProducts(recommendations, goodItems, currentProduct, targetCount, DIVERSITY_RELAXED_MIN_ADJUSTED_SCORE);
  }

  if (recommendations.length < min) {
    addRecommendationProducts(recommendations, fallbackItems, currentProduct, targetCount, DIVERSITY_RELAXED_MIN_ADJUSTED_SCORE);
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
