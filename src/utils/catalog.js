import { products } from '../data/products';
import { getAvailabilityStatus } from './availability';
import { createSearchIndex, createSearchTokens, inferBrandFromName, normalizeSearchText } from './search';
import { createBrandSlug } from './productRouting';

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
    const enrichedProduct = { ...product, name: safeName, originalName: product.name, brand, availability };

    return {
      ...enrichedProduct,
      brandSlug: createBrandSlug(brand),
      normalizedBrand: normalizeSearchText(brand),
      normalizedCategory: normalizeSearchText(product.category),
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
const PRIORITY_CATEGORIES = new Set(['arabe', 'nicho']);
const STRICT_GENDERS = new Set(['masculino', 'feminino']);

function getProductPrice(product) {
  return Number(product.salePrice ?? product.price ?? 0);
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

function isPremiumUpgrade(currentProduct, candidate) {
  const ratio = getPriceRatio(currentProduct, candidate);

  return ratio !== null && ratio > PRICE_RANGE_MAX_RATIO;
}

function getPriceRangeScore(currentProduct, candidate) {
  const ratio = getPriceRatio(currentProduct, candidate);

  if (ratio === null) {
    return 0;
  }

  if (ratio >= PRICE_RANGE_MIN_RATIO && ratio <= PRICE_RANGE_MAX_RATIO) {
    const distanceFromCurrentPrice = Math.abs(1 - ratio);
    const closenessBonus = Math.max(0, Math.round((1 - distanceFromCurrentPrice / PRICE_RANGE_MIN_RATIO) * 30));

    return 60 + closenessBonus;
  }

  if (ratio < PRICE_RANGE_MIN_RATIO) {
    return -30 - Math.round((PRICE_RANGE_MIN_RATIO - ratio) * 80);
  }

  return -35 - Math.round((ratio - PRICE_RANGE_MAX_RATIO) * 50);
}

function getRecommendationScore(currentProduct, candidate) {
  let score = 0;

  if (currentProduct.id === candidate.id) {
    return Number.NEGATIVE_INFINITY;
  }

  const currentGender = currentProduct.normalizedGender;
  const candidateGender = candidate.normalizedGender;
  const currentCategory = currentProduct.normalizedCategory;
  const candidateCategory = candidate.normalizedCategory;

  if (currentGender && currentGender === candidateGender) {
    score += isStrictGender(currentGender) ? 140 : 100;
  } else if (isOppositeGender(currentGender, candidateGender)) {
    score -= 160;
  } else if (isStrictGender(currentGender) && candidateGender === 'unissex') {
    score += 35;
  }

  if (currentCategory && currentCategory === candidateCategory) {
    score += isPriorityCategory(currentCategory) ? 130 : 90;
  } else if (isPriorityCategory(currentCategory)) {
    score -= 45;
  }

  score += getPriceRangeScore(currentProduct, candidate);

  if (currentProduct.normalizedBrand && currentProduct.normalizedBrand === candidate.normalizedBrand) {
    score += 30;
  }

  if (
    currentProduct.normalizedOlfactoryReference &&
    currentProduct.normalizedOlfactoryReference === candidate.normalizedOlfactoryReference
  ) {
    score += 28;
  }

  if (candidate.featured) {
    score += 2;
  }

  return score;
}

function sortRecommendationItems(a, b) {
  return b.score - a.score || Number(b.product.featured) - Number(a.product.featured) || a.product.name.localeCompare(b.product.name, 'pt-BR');
}

function addRecommendationProducts(recommendations, candidates, currentProduct, targetCount, { avoidOppositeGender = false } = {}) {
  const selectedIds = new Set(recommendations.map((product) => product.id));
  let premiumUpgradeCount = recommendations.filter((product) => isPremiumUpgrade(currentProduct, product)).length;

  candidates.some((item) => {
    const product = item.product ?? item;

    if (recommendations.length >= targetCount) {
      return true;
    }

    if (product.id === currentProduct.id || selectedIds.has(product.id)) {
      return false;
    }

    if (avoidOppositeGender && isOppositeGender(currentProduct.normalizedGender, product.normalizedGender)) {
      return false;
    }

    if (isPremiumUpgrade(currentProduct, product)) {
      if (premiumUpgradeCount >= MAX_PREMIUM_UPGRADES) {
        return false;
      }

      premiumUpgradeCount += 1;
    }

    recommendations.push(product);
    selectedIds.add(product.id);

    return false;
  });
}

export function getProductRecommendations(currentProduct, allProducts = getCatalogProducts(), { min = 4, max = 8 } = {}) {
  const targetCount = Math.max(min, Math.min(max, allProducts.length - 1));
  const currentGender = currentProduct.normalizedGender;
  const sameGenderProducts = allProducts.filter(
    (candidate) => candidate.id !== currentProduct.id && currentGender && candidate.normalizedGender === currentGender,
  );
  const shouldAvoidOppositeGender = isStrictGender(currentGender) && sameGenderProducts.length >= min;
  const scoredItems = allProducts
    .filter((candidate) => candidate.id !== currentProduct.id)
    .map((candidate) => ({ product: candidate, score: getRecommendationScore(currentProduct, candidate) }))
    .sort(sortRecommendationItems);
  const rankedItems = scoredItems.filter((item) => item.score > 0);
  const fallbackItems = scoredItems.filter((item) => item.score <= 0);
  const recommendations = [];

  addRecommendationProducts(recommendations, rankedItems, currentProduct, targetCount, { avoidOppositeGender: shouldAvoidOppositeGender });
  addRecommendationProducts(recommendations, fallbackItems, currentProduct, targetCount, { avoidOppositeGender: shouldAvoidOppositeGender });

  if (recommendations.length < min) {
    addRecommendationProducts(recommendations, scoredItems, currentProduct, targetCount, { avoidOppositeGender: false });
  }

  return recommendations;
}

export function getFeaturedCollections(allProducts = getCatalogProducts()) {
  const sortedByFeatured = [...allProducts].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || Number(b.available) - Number(a.available) || a.name.localeCompare(b.name, 'pt-BR'),
  );
  const mostWantedBrands = new Set(['creed', 'dior', 'chanel', 'parfums de marly', 'maison francis kurkdjian']);
  const arabicHighlights = allProducts
    .filter((product) => normalizeSearchText(`${product.category} ${product.badges?.join(' ')}`).includes('arabe'))
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
