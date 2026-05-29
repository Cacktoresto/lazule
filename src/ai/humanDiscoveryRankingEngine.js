import { isInternalTestProduct } from '../domain/internalTestProduct.js';
import { normalizeSearchText } from '../utils/search.js';

const DEFAULT_WEIGHTS = Object.freeze({
  semanticRelevance: 0.22,
  socialFit: 0.14,
  atmosphericFit: 0.12,
  contextualFit: 0.1,
  signatureAlignment: 0.1,
  emotionalCoherence: 0.09,
  noveltyBalance: 0.08,
  discoveryConfidence: 0.06,
  antiGenericWeighting: 0.05,
  saturationAwareness: 0.04,
});

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function includesAny(text, terms = []) {
  return terms.some((term) => text.includes(normalizeSearchText(term)));
}

function tokenize(value) {
  return normalizeSearchText(value).split(' ').filter((token) => token.length > 2);
}

function scoreSocialFit(text, queryText) {
  const socialSignals = {
    executive: ['office', 'trabalho', 'executivo', 'limpo', 'versatil', 'formal'],
    social: ['social', 'bar', 'jantar', 'encontro', 'presenca', 'confianca'],
    highPresence: ['impacto', 'marcante', 'presenca', 'statement', 'noturno'],
    lowRisk: ['seguro', 'discreto', 'controlado', 'fadiga baixa'],
  };
  const expected = includesAny(queryText, ['trabalho', 'office', 'executivo'])
    ? ['executive', 'lowRisk']
    : includesAny(queryText, ['social', 'encontro', 'date', 'noite'])
      ? ['social', 'highPresence']
      : ['social'];
  const raw = expected.reduce((acc, signal) => acc + (includesAny(text, socialSignals[signal]) ? 0.5 : 0), 0);
  return clamp(raw / Math.max(expected.length, 1));
}

function scoreAtmosphericFit(text, context = {}) {
  const temperature = normalizeSearchText(context.temperature ?? context.weather ?? '');
  const period = normalizeSearchText(context.period ?? context.dayPeriod ?? '');
  const hotScore = includesAny(text, ['fresh', 'citrus', 'mineral', 'clean', 'aquatico']) ? 1 : 0;
  const coldScore = includesAny(text, ['amber', 'gourmand', 'smoky', 'resina', 'amadeirado']) ? 1 : 0;
  const dayScore = includesAny(text, ['limpo', 'versatil', 'office', 'fresco']) ? 1 : 0;
  const nightScore = includesAny(text, ['noite', 'intenso', 'dark', 'sedutor']) ? 1 : 0;

  const tempMatch = temperature.includes('calor') || temperature.includes('hot') ? hotScore : temperature.includes('frio') || temperature.includes('cold') ? coldScore : 0.5;
  const periodMatch = period.includes('noite') || period.includes('night') ? nightScore : period.includes('dia') || period.includes('day') ? dayScore : 0.5;
  return clamp((tempMatch * 0.55) + (periodMatch * 0.45));
}

function scoreContextualFit(text, queryText, context = {}) {
  const occasion = normalizeSearchText(context.occasion ?? '');
  const mood = normalizeSearchText(context.mood ?? '');
  const occasionScore = occasion ? (text.includes(occasion) ? 1 : 0.45) : 0.65;
  const moodScore = mood ? (includesAny(text, [mood]) ? 1 : 0.4) : 0.65;
  const explicitScore = includesAny(queryText, ['trabalho', 'office'])
    ? (includesAny(text, ['versatil', 'limpo', 'discreto', 'controlado']) ? 1 : 0.35)
    : includesAny(queryText, ['cheiro caro', 'luxo'])
      ? (includesAny(text, ['luxo', 'refinado', 'assinatura', 'elegante']) ? 1 : 0.4)
      : 0.7;
  return clamp((occasionScore * 0.3) + (moodScore * 0.25) + (explicitScore * 0.45));
}

function scoreSignatureAlignment(text, profile = {}) {
  const signature = Array.isArray(profile.signatureTags) ? profile.signatureTags : [];
  if (!signature.length) return 0.58;
  const matches = signature.reduce((count, tag) => (text.includes(normalizeSearchText(tag)) ? count + 1 : count), 0);
  return clamp(matches / signature.length);
}

function scoreEmotionalCoherence(text, queryText) {
  const moodMap = [
    { trigger: ['confianca', 'trabalho'], targets: ['limpo', 'executivo', 'consistente'] },
    { trigger: ['sedutor', 'encontro'], targets: ['sensual', 'quente', 'pele'] },
    { trigger: ['cheiro caro', 'luxo'], targets: ['refinado', 'assinatura', 'presenca'] },
  ];
  const match = moodMap.find((row) => includesAny(queryText, row.trigger));
  if (!match) return 0.65;
  return includesAny(text, match.targets) ? 0.95 : 0.4;
}

function scoreNoveltyBalance(product, memory = {}) {
  const visits = Number(memory.revisitMap?.[product.name] ?? 0);
  const opens = Number(memory.openMap?.[product.name] ?? 0);
  const ignored = Number(memory.ignoredMap?.[product.name] ?? 0);
  const safeAnchor = clamp((visits * 0.1) + (opens * 0.08), 0, 0.55);
  const novelty = product.discoveryScore != null ? clamp(product.discoveryScore) : 0.5;
  const ignorePenalty = clamp(ignored * 0.07, 0, 0.4);
  return clamp((novelty * 0.55) + safeAnchor - ignorePenalty + 0.2);
}

function scoreDiscoveryConfidence(semanticScore, components = {}) {
  const richness = Object.values(components).filter((value) => value >= 0.62).length / Math.max(Object.keys(components).length, 1);
  const confidenceScore = clamp((semanticScore * 0.45) + (richness * 0.55));
  const fallbackLevel = confidenceScore >= 0.75 ? 'high_precision' : confidenceScore >= 0.55 ? 'balanced' : 'fallback_expanded';
  const reason = confidenceScore >= 0.75
    ? 'Strong multi-signal agreement.'
    : confidenceScore >= 0.55
      ? 'Moderate agreement across semantic/contextual signals.'
      : 'Low agreement; fallback diversity strategy active.';
  return { confidenceScore, fallbackLevel, reason, editorialConfidence: clamp((components.socialFit + components.contextualFit + components.emotionalCoherence) / 3) };
}

function scoreAntiGenericWeighting(product, text) {
  const metadataSpread = ['notes', 'keywords', 'occasions', 'vibe'].reduce((acc, key) => {
    const value = product[key];
    return acc + (Array.isArray(value) ? value.length : tokenize(value).length);
  }, 0);
  const genericTerms = tokenize(text).filter((token) => ['amadeirado', 'perfume', 'fragrancia', 'bom', 'top'].includes(token)).length;
  const genericPressure = clamp((metadataSpread / 48) + (genericTerms / 8));
  return clamp(1 - genericPressure);
}

function scoreSaturationAwareness(product, queryText) {
  const saturation = clamp(Number(product.saturationScore ?? product.popularityScore ?? 0.4));
  const nuanceLift = includesAny(queryText, ['classico', 'referencia', 'icones']) ? 0.12 : 0;
  return clamp((1 - saturation) + nuanceLift);
}

function weightedSum(scores, weights = DEFAULT_WEIGHTS) {
  return Object.entries(weights).reduce((total, [key, weight]) => total + (scores[key] ?? 0) * weight, 0);
}

export function rankWithHumanDiscoveryIntelligence(candidates = [], options = {}) {
  const queryText = normalizeSearchText(options.query ?? '');
  const context = options.context ?? {};
  const memory = options.memory ?? {};

  const ranked = candidates.filter((entry) => !isInternalTestProduct(entry.product ?? entry)).map((entry) => {
    const product = entry.product ?? entry;
    const text = normalizeSearchText([
      product.name, product.brand, product.description, product.searchIndex, product.notes, product.vibe,
      product.occasions, product.performance, product.olfactoryReference,
    ].flat().filter(Boolean).join(' '));

    const semanticRelevance = clamp(entry.dnaSimilarity ?? entry.score ?? 0.4);
    const socialFit = scoreSocialFit(text, queryText);
    const atmosphericFit = scoreAtmosphericFit(text, context);
    const contextualFit = scoreContextualFit(text, queryText, context);
    const signatureAlignment = scoreSignatureAlignment(text, options.userProfile ?? {});
    const emotionalCoherence = scoreEmotionalCoherence(text, queryText);
    const noveltyBalance = scoreNoveltyBalance(product, memory);
    const antiGenericWeighting = scoreAntiGenericWeighting(product, text);
    const saturationAwareness = scoreSaturationAwareness(product, queryText);

    const componentScores = { semanticRelevance, socialFit, atmosphericFit, contextualFit, signatureAlignment, emotionalCoherence, noveltyBalance, antiGenericWeighting, saturationAwareness };
    const confidence = scoreDiscoveryConfidence(semanticRelevance, componentScores);
    const score = weightedSum({ ...componentScores, discoveryConfidence: confidence.confidenceScore });

    const trace = {
      rankingScore: score,
      semanticScore: semanticRelevance,
      contextualBoosts: { socialFit, atmosphericFit, contextualFit, signatureAlignment, emotionalCoherence },
      noveltyAdjustment: noveltyBalance,
      fallbackStage: confidence.fallbackLevel,
      socialFit,
      saturationPenalty: clamp(1 - saturationAwareness),
      antiGenericPenalty: clamp(1 - antiGenericWeighting),
      confidenceScore: confidence.confidenceScore,
      confidenceReason: confidence.reason,
      editorialConfidence: confidence.editorialConfidence,
    };

    if (options.devLogs) {
      console.debug('[HumanDiscoveryRankingEngine]', { product: product.name, ...trace });
    }

    return {
      ...entry,
      product,
      score,
      humanDiscovery: {
        ...trace,
        componentScores,
      },
    };
  });

  return ranked.sort((a, b) => b.score - a.score || String(a.product?.name).localeCompare(String(b.product?.name), 'pt-BR'));
}
