import { getRecommendationEngine } from '../ai/recommendationEngine.js';
import { createUnavailableDiscoveryConversion, scoreOlfactiveRelationship } from '../ai/olfactiveRelationships.js';
import { generateQueryDNA, getDominantDNA } from '../ai/perfumeDNA.js';
import { createSemanticExplanation, getSemanticAnalyticsTags, interpretSemanticIntent, scoreSemanticMatch } from '../ai/semanticOlfactiveSearch.js';
import { normalizeSearchText } from './search.js';

const DEFAULT_LIMIT = 6;
const MINIMUM_RECOMMENDATIONS = 3;
const MAX_QUERY_LENGTH = 180;

const INTENT_DICTIONARY = {
  fresco: ['fresco', 'fresca', 'refrescante', 'aquatico', 'aquatica', 'citrico', 'citrica', 'limpo', 'limpa', 'leve', 'calor', 'verao', 'praia', 'dia'],
  doce: ['doce', 'adocicado', 'adocicada', 'baunilha', 'vanilla', 'caramelo', 'chocolate', 'tonka', 'gourmand', 'mel'],
  amadeirado: ['amadeirado', 'amadeirada', 'madeira', 'cedro', 'sandalwood', 'santalo', 'oud', 'vetiver'],
  sedutor: ['sedutor', 'sedutora', 'sensual', 'date', 'encontro', 'balada', 'sexy', 'atraente', 'marcante'],
  elegante: ['elegante', 'sofisticado', 'sofisticada', 'chique', 'fino', 'fina', 'luxo', 'rico', 'rica', 'premium', 'assinatura'],
  trabalho: ['trabalho', 'escritorio', 'reuniao', 'profissional', 'formal', 'discreto', 'discreta', 'versatil', 'versatilidade'],
  noite: ['noite', 'noturno', 'noturna', 'balada', 'festa', 'jantar', 'date', 'encontro'],
  calor: ['calor', 'verao', 'quente', 'sol', 'praia', 'dia', 'fresco', 'refrescante'],
  frio: ['frio', 'inverno', 'outono', 'aconchegante', 'intenso', 'intensa', 'quente'],
  presente: ['presente', 'presentear', 'namorada', 'namorado', 'esposa', 'marido', 'mae', 'pai', 'aniversario'],
  masculino: ['masculino', 'homem', 'masc', 'namorado', 'marido', 'pai'],
  feminino: ['feminino', 'mulher', 'fem', 'namorada', 'esposa', 'mae'],
  arabe: ['arabe', 'arabes', 'oriental', 'dubai', 'lattafa', 'armaf', 'afnan', 'alhambra'],
  importado: ['importado', 'importados', 'designer', 'internacional', 'frances', 'italiano'],
  'custo-beneficio': ['barato', 'barata', 'acessivel', 'promocao', 'oferta', 'custo beneficio', 'custo-beneficio', 'preco bom'],
  potente: ['potente', 'forte', 'intenso', 'intensa', 'projecao', 'fixacao', 'performance', 'duradouro', 'duradoura'],
  discreto: ['discreto', 'discreta', 'suave', 'leve', 'clean', 'limpo', 'limpa'],
  parecido: ['parecido', 'parecida', 'similar', 'inspirado', 'inspirada', 'lembra', 'tipo', 'clone', 'contratipo'],
};

const INTENT_WEIGHTS = {
  fresco: { fields: ['fresco', 'fresh', 'citrico', 'citrus', 'aquatico', 'blue', 'limpo'], score: 34 },
  doce: { fields: ['doce', 'sweet', 'vanilla', 'baunilha', 'tonka', 'caramelo', 'gourmand', 'ambar'], score: 34 },
  amadeirado: { fields: ['amadeirado', 'woody', 'madeira', 'cedro', 'oud', 'santalo', 'vetiver'], score: 30 },
  sedutor: { fields: ['sedutor', 'sensual', 'sexy', 'date', 'balada', 'intenso', 'marcante'], score: 30 },
  elegante: { fields: ['elegante', 'sofisticado', 'luxo', 'premium', 'chique', 'classico', 'rico'], score: 28 },
  trabalho: { fields: ['trabalho', 'office', 'escritorio', 'versatil', 'discreto', 'elegante', 'formal'], score: 28 },
  noite: { fields: ['noite', 'night', 'balada', 'festa', 'intenso', 'oriental', 'sedutor'], score: 30 },
  calor: { fields: ['calor', 'verao', 'summer', 'fresh', 'fresco', 'citrico', 'aquatico'], score: 26 },
  frio: { fields: ['frio', 'inverno', 'winter', 'amber', 'ambar', 'oud', 'baunilha', 'intenso'], score: 26 },
  presente: { fields: ['versatil', 'best seller', 'destaque', 'elegante', 'premium', 'presente'], score: 22 },
  masculino: { fields: ['masculino', 'male', 'men', 'homem'], score: 44 },
  feminino: { fields: ['feminino', 'female', 'women', 'mulher'], score: 44 },
  arabe: { fields: ['arabe', 'oriental', 'lattafa', 'armaf', 'afnan', 'alhambra'], score: 42 },
  importado: { fields: ['importado', 'designer'], score: 36 },
  'custo-beneficio': { fields: ['oferta', 'promocao', 'acessivel'], score: 18 },
  potente: { fields: ['potente', 'forte', 'intenso', 'fixacao', 'projecao', 'performance', 'edp', 'extrait'], score: 30 },
  discreto: { fields: ['discreto', 'suave', 'leve', 'fresh', 'clean'], score: 26 },
  parecido: { fields: [], score: 0 },
};

const REFERENCE_ALIASES = {
  sauvage: ['sauvage', 'dior sauvage'],
  aventus: ['aventus', 'creed aventus'],
  invictus: ['invictus', 'paco rabanne invictus', 'rabanne invictus'],
  baccarat: ['baccarat', 'baccarat rouge', 'br540'],
  bleu: ['bleu de chanel', 'bleu', 'chanel bleu'],
  erba: ['erba pura', 'xerjoff erba pura'],
  delina: ['delina', 'parfums de marly delina'],
  hacivat: ['hacivat', 'nishane hacivat'],
  goodgirl: ['good girl', 'carolina herrera good girl'],
  onemillion: ['one million', '1 million', 'paco rabanne one million'],
};

const FALLBACK_INTENTS = ['elegante', 'presente'];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getProductText(product = {}) {
  return [
    product.name,
    product.brand,
    product.category,
    product.gender,
    product.catalogType,
    ...(Array.isArray(product.badges) ? product.badges : []),
    product.olfactoryReference,
    product.description,
    ...(Array.isArray(product.notes) ? product.notes : []),
    ...(Array.isArray(product.occasions) ? product.occasions : []),
    ...(Array.isArray(product.vibe) ? product.vibe : []),
    product.performance,
    product.searchIndex,
  ].filter(Boolean).join(' ');
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(normalizeSearchText(term)));
}

function findReferencedPerfume(referenceTerms = [], catalogProducts = [], normalizedQuery = '') {
  return catalogProducts.find((product) => {
    const identityTerms = [product.name, `${product.brand ?? ''} ${product.name ?? ''}`, product.olfactoryReference, product.similarTo].flat(Infinity).filter(Boolean);
    const text = normalizeSearchText(identityTerms.join(' '));
    const matchesAlias = referenceTerms.some((term) => text.includes(normalizeSearchText(term)));
    const matchesCatalogName = identityTerms.some((term) => {
      const normalizedTerm = normalizeSearchText(term);
      return normalizedTerm.length >= 4 && normalizedQuery.includes(normalizedTerm);
    });
    return matchesAlias || matchesCatalogName;
  }) ?? null;
}

function createRelationshipReason(referencedPerfume, entry) {
  if (!referencedPerfume || !entry?.product || referencedPerfume === entry.product) return entry.reason;
  const relationship = scoreOlfactiveRelationship(referencedPerfume, entry.product, { preferInStock: true });
  if (!relationship || relationship.score < 0.22) return entry.reason;
  return relationship.explanation;
}

function getRecommendationProductKey(product = {}) {
  return product.productSlug ?? product.id ?? product.name;
}

function arrangeDiscoveryRecommendations(recommendations = [], discoveryConversion, limit) {
  if (!discoveryConversion?.alternatives?.length) return recommendations;

  const originalKey = getRecommendationProductKey(discoveryConversion.original);
  const originalRecommendation = recommendations.find((recommendation) => getRecommendationProductKey(recommendation.product) === originalKey);
  const alternatives = discoveryConversion.alternatives.map((alternative) => ({
    product: alternative.product,
    reason: alternative.explanation,
    score: alternative.score,
    matchedIntents: ['alternativa disponível'],
    dnaSimilarity: alternative.dnaSimilarity,
    perfumeDNA: alternative.product?.dna_vector,
  }));

  const ordered = [originalRecommendation, ...alternatives, ...recommendations].filter(Boolean);
  const seen = new Set();
  return ordered.filter((recommendation) => {
    const key = getRecommendationProductKey(recommendation.product);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

export function sanitizeOlfactiveQuery(query) {
  return String(query ?? '')
    .normalize('NFKC')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ' ')
    .replace(/(?:\+?\d[\s().-]*){8,}/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

export function normalizeOlfactiveQuery(query) {
  return normalizeSearchText(sanitizeOlfactiveQuery(query));
}

export function detectOlfactiveIntents(query) {
  const normalizedQuery = normalizeOlfactiveQuery(query);

  if (!normalizedQuery) {
    return { primaryIntent: 'descoberta', detectedIntents: [], detectedTerms: [], normalizedQuery };
  }

  const detectedIntents = Object.entries(INTENT_DICTIONARY)
    .filter(([, terms]) => terms.some((term) => normalizedQuery.includes(normalizeSearchText(term))))
    .map(([intent]) => intent);
  const detectedTerms = unique(
    Object.entries(INTENT_DICTIONARY).flatMap(([intent, terms]) => (
      detectedIntents.includes(intent) ? terms.filter((term) => normalizedQuery.includes(normalizeSearchText(term))).map(normalizeSearchText) : []
    )),
  );

  return {
    primaryIntent: detectedIntents[0] ?? 'descoberta',
    detectedIntents,
    detectedTerms,
    normalizedQuery,
  };
}

function detectReferenceTerms(normalizedQuery) {
  return unique(
    Object.values(REFERENCE_ALIASES).flatMap((aliases) => aliases.filter((alias) => normalizedQuery.includes(normalizeSearchText(alias)))),
  );
}

function getInferredFilters(intents) {
  return {
    gender: intents.find((intent) => intent === 'masculino' || intent === 'feminino') ?? null,
    catalogType: intents.find((intent) => intent === 'arabe' || intent === 'importado') ?? null,
    vibes: intents.filter((intent) => !['masculino', 'feminino', 'arabe', 'importado', 'parecido'].includes(intent)),
  };
}

function createRecommendationAnalyticsDNA(queryDNA = {}) {
  return Object.fromEntries(
    getDominantDNA(queryDNA, { threshold: 0.25, limit: 6 }).map(({ dimension, value }) => [dimension, value]),
  );
}

export function getOlfactiveRecommendations(query, catalogProducts = [], options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || DEFAULT_LIMIT, 1), DEFAULT_LIMIT);
  const safeCatalog = Array.isArray(catalogProducts) ? catalogProducts.filter(Boolean) : [];
  const intentAnalysis = detectOlfactiveIntents(query);
  const referenceTerms = detectReferenceTerms(intentAnalysis.normalizedQuery);
  const detectedIntents = unique([...intentAnalysis.detectedIntents, ...(referenceTerms.length ? ['parecido'] : [])]);
  const semanticInterpretation = interpretSemanticIntent(intentAnalysis.normalizedQuery);
  const queryDNA = generateQueryDNA(intentAnalysis.normalizedQuery);
  const analysis = {
    ...intentAnalysis,
    detectedIntents,
    scoringIntents: detectedIntents.length ? detectedIntents : FALLBACK_INTENTS,
    referenceTerms,
    queryDNA,
    semanticInterpretation,
  };

  if (!safeCatalog.length) {
    return {
      intent: analysis.primaryIntent,
      detectedIntents,
      detectedTerms: analysis.detectedTerms,
      inferredFilters: getInferredFilters(detectedIntents),
      products: [],
      recommendations: [],
      fallbackUsed: true,
      queryNormalized: analysis.normalizedQuery,
      queryDNA,
      dominantDNA: createRecommendationAnalyticsDNA(queryDNA),
      engine: 'heuristic-dna-v1',
    };
  }

  const engine = getRecommendationEngine(options.engine);
  const rankedRecommendations = engine.search(query, safeCatalog, { limit, analysis });
  const referencedPerfume = findReferencedPerfume(referenceTerms, safeCatalog, analysis.normalizedQuery);
  const discoveryConversion = createUnavailableDiscoveryConversion(referencedPerfume, safeCatalog, { limit: Math.min(4, limit) });
  const rawRecommendations = rankedRecommendations.map((entry) => {
    const semanticScoring = scoreSemanticMatch(entry.product, semanticInterpretation);
    const relationshipReason = createRelationshipReason(referencedPerfume, entry);
    const semanticReason = createSemanticExplanation(entry.product, semanticInterpretation, semanticScoring);
    return ({
    product: entry.product,
    reason: detectedIntents.includes('parecido') ? relationshipReason : semanticReason,
    score: Math.round(entry.score * 1000) / 1000,
    matchedIntents: entry.matchedIntents,
    dnaSimilarity: entry.dnaSimilarity,
    perfumeDNA: entry.perfumeDNA,
    semanticScore: semanticScoring.score,
    semanticConfidence: semanticScoring.confidence,
    semanticThemes: semanticInterpretation.themes,
  });
  });
  const recommendations = arrangeDiscoveryRecommendations(rawRecommendations, discoveryConversion, limit);

  return {
    intent: detectedIntents[0] ?? analysis.primaryIntent,
    semanticIntent: semanticInterpretation,
    detectedIntents,
    detectedTerms: analysis.detectedTerms,
    inferredFilters: getInferredFilters(detectedIntents),
    products: recommendations.map((recommendation) => recommendation.product),
    recommendations,
    discoveryConversion,
    relationshipContext: referencedPerfume ? {
      product_slug: referencedPerfume.productSlug,
      product_name: referencedPerfume.name,
      status: referencedPerfume.status,
      conversion_type: discoveryConversion?.conversionType,
      alternative_count: discoveryConversion?.alternatives?.length ?? 0,
    } : null,
    fallbackUsed: detectedIntents.length === 0 || rankedRecommendations.length < Math.min(MINIMUM_RECOMMENDATIONS, safeCatalog.length, limit) || rankedRecommendations.every((entry) => entry.score < 0.2),
    queryNormalized: analysis.normalizedQuery,
    queryDNA,
    dominantDNA: createRecommendationAnalyticsDNA(queryDNA),
    semanticTags: getSemanticAnalyticsTags(semanticInterpretation),
    engine: engine.id,
  };
}

export function createOlfactiveAssistantAnalyticsPayload(result = {}, { query = '', sourcePage = 'home', product } = {}) {
  const safeQuery = sanitizeOlfactiveQuery(query);
  const safeIntents = result.detectedIntents ?? [];

  return {
    query_length: safeQuery.length,
    detected_intents: safeIntents,
    ai_intents: safeIntents,
    semantic_tags: result.semanticTags ?? [],
    primary_intent: result.intent,
    dna: result.dominantDNA ?? createRecommendationAnalyticsDNA(result.queryDNA ?? generateQueryDNA(safeQuery)),
    result_count: result.recommendations?.length ?? result.products?.length ?? 0,
    recommended_product_slugs: (result.recommendations ?? []).map((recommendation) => recommendation.product?.productSlug ?? recommendation.product?.id).filter(Boolean).slice(0, 6),
    relationship_context: result.relationshipContext?.product_slug,
    discovery_conversion_type: result.relationshipContext?.conversion_type,
    product_slug: product?.productSlug,
    product_id: product?.id,
    product_name: product?.name,
    product_category: product?.category ?? product?.catalogType,
    product_vibes: Array.isArray(product?.vibe) ? product.vibe.slice(0, 4) : [],
    source_page: sourcePage,
    privacy: 'anonymized_intent_only',
  };
}
