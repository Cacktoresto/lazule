import { createProductSlug } from '../utils/productRouting.js';
import { normalizeSearchText } from '../utils/search.js';
import {
  calculateDNASimilarity,
  generatePerfumeDNA,
  generateQueryDNA,
  generateRecommendationReason,
  getDominantDNA,
} from './perfumeDNA.js';
import { buildSemanticRelationships } from './semanticIntelligenceLayer.js';
import { buildQueryLockedFallback } from './queryLockedFallback.js';
import { interpretUserIntent } from './semanticQueryUnderstanding.js';

const DEFAULT_LIMIT = 6;
const DIVERSITY_BRAND_PENALTY = 0.045;
const DIVERSITY_CATEGORY_PENALTY = 0.025;

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function productKey(product = {}) { return String(product.productSlug ?? createProductSlug(product.name) ?? product.id ?? product.name ?? ''); }
function getProductText(product = {}) {
  return normalizeSearchText([
    product.name, product.brand, product.category, product.gender, product.catalogType, product.type,
    product.olfactoryReference, product.description, product.performance, product.searchIndex,
    product.keywords, product.notes, product.occasions, product.vibe, product.badges,
  ].flat(Infinity).filter(Boolean).join(' '));
}
function getTerms(text = '') { return normalizeSearchText(text).split(' ').filter((term) => term.length > 2); }

function scoreKeywordRelevance(product, normalizedQuery) {
  const productText = getProductText(product);
  const nameText = normalizeSearchText(product.name);
  const brandText = normalizeSearchText(product.brand);
  const terms = getTerms(normalizedQuery);
  if (!terms.length) return 0;
  const rawScore = terms.reduce((score, term) => {
    if (nameText.includes(term)) return score + 0.12;
    if (brandText.includes(term)) return score + 0.09;
    if (productText.includes(term)) return score + 0.045;
    return score;
  }, 0);
  return Math.min(0.28, rawScore);
}

function scoreReferenceBoost(product, referenceTerms = []) {
  if (!referenceTerms.length) return 0;
  const text = getProductText(product);
  return referenceTerms.some((reference) => text.includes(normalizeSearchText(reference))) ? 0.22 : 0;
}

function scoreIntentCompatibility(product, intents = []) {
  const text = getProductText(product);
  const boosts = {
    trabalho: ['trabalho', 'office', 'escritorio', 'discreto', 'limpo'],
    presente: ['presente', 'versatil', 'elegante', 'chique'],
    fresco: ['fresco', 'fresh', 'citrico', 'aquatico', 'calor'],
    doce: ['doce', 'baunilha', 'caramelo', 'gourmand'],
    noite: ['noite', 'balada', 'intenso', 'noturno'],
    sedutor: ['sedutor', 'sensual', 'sexy', 'marcante'],
    arabe: ['arabe', 'oriental', 'lattafa', 'afnan', 'armaf'],
    masculino: ['masculino', 'homem', 'masc'],
    feminino: ['feminino', 'mulher', 'fem'],
  };
  return Math.min(0.28, intents.reduce((score, intent) => (boosts[intent]?.some((term) => text.includes(normalizeSearchText(term))) ? score + 0.09 : score), 0));
}


function scoreMomentAlignment(product, momentContext = {}) {
  if (!momentContext || !momentContext.period) return 0;
  const text = getProductText(product);
  const periodBoosts = {
    madrugada: ['noturno', 'intenso', 'profundo', 'ambar'],
    manha: ['limpo', 'fresco', 'mineral', 'elegante'],
    noite: ['sofisticado', 'denso', 'intenso', 'amadeirado'],
  };
  const rhythmBoosts = {
    contemplative: ['sofisticado', 'elegante', 'silencioso'],
    exploratory: ['contrast', 'ousado', 'experimental', 'descoberta'],
  };
  const periodScore = (periodBoosts[momentContext.period] ?? []).some((term) => text.includes(normalizeSearchText(term))) ? 0.06 : 0;
  const rhythmScore = (rhythmBoosts[momentContext.rhythm] ?? []).some((term) => text.includes(normalizeSearchText(term))) ? 0.045 : 0;
  return periodScore + rhythmScore;
}

function scorePopularity(product) {
  let score = 0;
  if (product.featured) score += 0.035;
  if (product.available !== false) score += 0.025;
  if (Number(product.salePrice ?? product.price) > 0) score += 0.01;
  return score;
}

function applyDiversity(scoredItems) {
  const brandCounts = new Map();
  const categoryCounts = new Map();
  return scoredItems.map((item) => {
    const brand = normalizeSearchText(item.product.brand);
    const category = normalizeSearchText(item.product.category ?? item.product.catalogType);
    const penalty = (brandCounts.get(brand) ?? 0) * DIVERSITY_BRAND_PENALTY + (categoryCounts.get(category) ?? 0) * DIVERSITY_CATEGORY_PENALTY;
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    return { ...item, diversityPenalty: penalty, score: Math.max(0, item.score - penalty) };
  });
}

export function scorePerfumeForQuery(product, analysis = {}) {
  const perfumeDNA = generatePerfumeDNA(product);
  const queryDNA = analysis.queryDNA ?? generateQueryDNA(analysis.normalizedQuery ?? analysis.query ?? '');
  const dnaSimilarity = calculateDNASimilarity(queryDNA, perfumeDNA, {
    seductive: 1.15, nightlife: 1.15, fresh: 1.1, sweet: 1.1, office: 1.08, arabic: 1.1,
  });
  const keywordRelevance = scoreKeywordRelevance(product, analysis.normalizedQuery ?? analysis.query ?? '');
  const referenceBoost = scoreReferenceBoost(product, analysis.referenceTerms);
  const intentBoost = scoreIntentCompatibility(product, analysis.detectedIntents);
  const popularityBoost = scorePopularity(product);
  const momentBoost = scoreMomentAlignment(product, analysis.momentContext);
  const score = dnaSimilarity * 0.68 + keywordRelevance + referenceBoost + intentBoost + popularityBoost + momentBoost;
  const matchedIntents = unique([
    ...(analysis.detectedIntents ?? []),
    ...getDominantDNA(perfumeDNA, { threshold: 0.5, limit: 3 }).map(({ dimension }) => dimension),
  ]);

  return { product, perfumeDNA, queryDNA, dnaSimilarity, keywordRelevance, referenceBoost, popularityBoost, momentBoost, score, matchedIntents };
}

export const heuristicRecommendationEngine = {
  id: 'heuristic-dna-v1',
  search(query, products = [], options = {}) {
    const limit = Math.min(Math.max(Number(options.limit) || DEFAULT_LIMIT, 1), DEFAULT_LIMIT);
    const safeCatalog = Array.isArray(products) ? products.filter(Boolean) : [];
    const analysis = {
      ...options.analysis,
      query,
      normalizedQuery: options.analysis?.normalizedQuery ?? normalizeSearchText(query),
      queryDNA: options.analysis?.queryDNA ?? generateQueryDNA(query),
    };
    const hasQuerySignal = (analysis.detectedIntents ?? []).length > 0 || (analysis.referenceTerms ?? []).length > 0;
    const scored = safeCatalog
      .map((product) => scorePerfumeForQuery(product, analysis))
      .filter((entry) => hasQuerySignal && entry.score > (options.minimumScore ?? 0.08))
      .sort((a, b) => b.score - a.score || String(a.product.name).localeCompare(String(b.product.name), 'pt-BR'));
    const diversified = applyDiversity(scored).sort((a, b) => b.score - a.score || String(a.product.name).localeCompare(String(b.product.name), 'pt-BR'));
    const fallbackUsed = diversified.length < Math.min(3, safeCatalog.length, limit);
    let ranked = diversified;

    if (fallbackUsed) {
      const interpreted = interpretUserIntent(analysis.query);
      const context = {
        query: analysis.query,
        semanticEntity: interpreted.semanticEntity,
        intentTypes: interpreted.intentTypes,
        primarySignals: interpreted.matchedSignals.filter((s) => s.strength === 'primary'),
        secondarySignals: interpreted.matchedSignals.filter((s) => s.strength === 'secondary'),
        hintSignals: interpreted.matchedSignals.filter((s) => s.strength === 'hint'),
        negativeSignals: interpreted.matchedSignals.filter((s) => s.strength === 'negative'),
        confidence: interpreted.confidence,
        ambiguity: interpreted.ambiguity,
        activatedFamilies: interpreted.activatedFamilies,
      };
      const locked = buildQueryLockedFallback(safeCatalog.map((product) => scorePerfumeForQuery(product, analysis)), context, { minRelevance: 0.24 });
      ranked = locked.ranked.length ? locked.ranked : [];
    }

    ranked = ranked
      .sort((a, b) => b.score - a.score || b.fallbackScore - a.fallbackScore || String(a.product.name).localeCompare(String(b.product.name), 'pt-BR'))
      .slice(0, limit);

    return ranked.map((entry) => ({
      ...entry,
      reason: entry.reason ?? generateRecommendationReason(entry.product, {
        queryDNA: analysis.queryDNA,
        perfumeDNA: entry.perfumeDNA,
        matchedIntents: entry.matchedIntents,
        fallback: fallbackUsed,
      }),
    }));
  },
};

export const semanticRecommendationEngine = {
  id: 'future-semantic-engine',
  search() {
    throw new Error('Semantic engine placeholder: ready for future local/LLM semantic reranking without changing callers.');
  },
};

export const embeddingsRecommendationEngine = {
  id: 'future-embeddings-engine',
  search() {
    throw new Error('Embeddings engine placeholder: ready for OpenAI embeddings, pgvector/Supabase and vector search.');
  },
};

export function getRecommendationEngine(engine = 'heuristic') {
  if (engine === 'semantic') return semanticRecommendationEngine;
  if (engine === 'embeddings') return embeddingsRecommendationEngine;
  return heuristicRecommendationEngine;
}

function isSameProduct(current, candidate) { return productKey(current) && productKey(current) === productKey(candidate); }
function getGender(product = {}) { return normalizeSearchText(product.normalizedGender ?? product.gender ?? product.category); }
function isOppositeGenderValue(currentGender, candidateGender) {
  return (currentGender === 'masculino' && candidateGender === 'feminino') || (currentGender === 'feminino' && candidateGender === 'masculino');
}

export function getRelatedProducts(currentProduct, allProducts = [], { limit = 8 } = {}) {
  if (!currentProduct || !Array.isArray(allProducts)) return [];
  const currentGender = getGender(currentProduct);
  const candidates = allProducts.filter((candidate) => {
    if (!candidate || isSameProduct(currentProduct, candidate)) return false;
    const sameGenderCount = allProducts.filter((p) => p && !isSameProduct(currentProduct, p) && getGender(p) === currentGender).length;
    return !(sameGenderCount >= 4 && isOppositeGenderValue(currentGender, getGender(candidate)));
  });

  const semantic = buildSemanticRelationships(currentProduct, candidates, { limit });

  const ranked = semantic.related.length
    ? semantic.related
    : candidates
      .map((candidate) => { const dna=generatePerfumeDNA(candidate); const sparsePenalty = getDominantDNA(dna, { threshold: 0.3, limit: 1 }).length ? 0 : 0.35; return { product: candidate, score: Math.max(0, calculateDNASimilarity(generatePerfumeDNA(currentProduct), dna) - sparsePenalty) }; })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => ({ ...entry, semantic: { score: entry.score, distance: 1 - entry.score, facet: 'fresh_clean', cluster: 'intimate_skin_scent', reasons: ['Fallback por similaridade DNA.'], confidence: 0.5 } }));

  return ranked.map(({ product, semantic: meta }) => ({
    ...product,
    relatedSemanticScore: meta.score,
    relatedSemanticDistance: meta.distance,
    relatedSemanticFacet: meta.facet,
    relatedSemanticCluster: meta.cluster,
    relatedSemanticReasons: meta.reasons,
    relatedSemanticConfidence: meta.confidence,
  }));
}
