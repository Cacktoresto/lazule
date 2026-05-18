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

function getProductScore(product, analysis) {
  const productText = normalizeSearchText(getProductText(product));
  const nameText = normalizeSearchText(product.name);
  const brandText = normalizeSearchText(product.brand);
  const queryTerms = analysis.normalizedQuery.split(' ').filter((term) => term.length > 2);
  let score = 0;
  const reasons = [];

  for (const intent of analysis.scoringIntents) {
    const config = INTENT_WEIGHTS[intent];
    if (!config) continue;

    if (config.fields.length && includesAny(productText, config.fields)) {
      score += config.score;
      reasons.push(intent);
    }
  }

  for (const term of queryTerms) {
    if (nameText.includes(term)) score += 20;
    if (brandText.includes(term)) score += 16;
    if (productText.includes(term)) score += 8;
  }

  for (const reference of analysis.referenceTerms) {
    if (productText.includes(normalizeSearchText(reference))) {
      score += 64;
      reasons.push('parecido');
    }
  }

  if (score > 0) {
    if (product.featured) score += 8;
    if (product.available !== false) score += 6;
    if (Number(product.salePrice) > 0) score += 2;
  }

  return { score, reasons: unique(reasons) };
}

function createReason(product, matchedReasons, fallback) {
  const reasons = matchedReasons.filter((reason) => reason !== 'parecido').slice(0, 3);

  if (matchedReasons.includes('parecido')) {
    return `Tem conexão com a referência olfativa indicada e entrega perfil ${reasons[0] ?? product.catalogType ?? 'premium'}.`;
  }

  if (reasons.length >= 2) {
    return `Combina com ${reasons.join(', ')} e tem presença de curadoria LAZULE.`;
  }

  if (reasons.length === 1) {
    return `Boa escolha para quem busca um perfil ${reasons[0]} com acabamento premium.`;
  }

  if (fallback) {
    return 'Opção versátil da curadoria para descobrir uma assinatura olfativa com segurança.';
  }

  return 'Aderente ao pedido pela combinação de nome, marca e descrição do catálogo.';
}

function rankProducts(products, analysis, { fallback = false } = {}) {
  return products
    .map((product, index) => {
      const { score, reasons } = getProductScore(product, analysis);
      const fallbackScore = fallback ? (product.featured ? 14 : 0) + (product.available !== false ? 8 : 0) + Math.max(0, 8 - index * 0.01) : 0;

      return {
        product,
        score: score + fallbackScore,
        reasons,
        reason: createReason(product, reasons, fallback),
      };
    })
    .filter((entry) => fallback || entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.product.name).localeCompare(String(b.product.name), 'pt-BR'));
}

export function getOlfactiveRecommendations(query, catalogProducts = [], options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || DEFAULT_LIMIT, 1), DEFAULT_LIMIT);
  const safeCatalog = Array.isArray(catalogProducts) ? catalogProducts.filter(Boolean) : [];
  const intentAnalysis = detectOlfactiveIntents(query);
  const referenceTerms = detectReferenceTerms(intentAnalysis.normalizedQuery);
  const detectedIntents = unique([...intentAnalysis.detectedIntents, ...(referenceTerms.length ? ['parecido'] : [])]);
  const scoringIntents = detectedIntents.length ? detectedIntents : FALLBACK_INTENTS;
  const analysis = {
    ...intentAnalysis,
    detectedIntents,
    scoringIntents,
    referenceTerms,
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
    };
  }

  const ranked = rankProducts(safeCatalog, analysis);
  const minimumCount = Math.min(MINIMUM_RECOMMENDATIONS, safeCatalog.length, limit);
  const shouldFallback = ranked.length < minimumCount;
  const recommendations = (shouldFallback ? rankProducts(safeCatalog, { ...analysis, scoringIntents: FALLBACK_INTENTS }, { fallback: true }) : ranked)
    .slice(0, limit)
    .map(({ product, reason, score, reasons }) => ({ product, reason, score, matchedIntents: reasons }));

  return {
    intent: detectedIntents[0] ?? analysis.primaryIntent,
    detectedIntents,
    detectedTerms: analysis.detectedTerms,
    inferredFilters: getInferredFilters(detectedIntents),
    products: recommendations.map((recommendation) => recommendation.product),
    recommendations,
    fallbackUsed: shouldFallback,
    queryNormalized: analysis.normalizedQuery,
  };
}

export function createOlfactiveAssistantAnalyticsPayload(result = {}, { query = '', sourcePage = 'home', product } = {}) {
  return {
    query_length: sanitizeOlfactiveQuery(query).length,
    detected_intents: result.detectedIntents ?? [],
    primary_intent: result.intent,
    result_count: result.recommendations?.length ?? result.products?.length ?? 0,
    product_slug: product?.productSlug,
    source_page: sourcePage,
  };
}
