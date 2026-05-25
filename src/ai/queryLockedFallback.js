import { normalizeSearchText } from '../utils/search.js';

const FAMILY_REASONS = {
  aquatic_marine: 'Entrou como alternativa por seguir uma direção aquática, marinha e fresca.',
  clean_bath: 'Entrou como alternativa por manter um perfil limpo, confortável e de pós-banho.',
  citrus_fresh: 'Entrou como alternativa por manter frescor cítrico e sensação arejada.',
  sweet_gourmand: 'Entrou como alternativa por manter direção doce, cremosa e gourmand.',
  spicy_warm: 'Entrou como alternativa por manter especiarias quentes e assinatura intensa.',
  woody_executive: 'Entrou como alternativa por manter um perfil amadeirado e executivo.',
  amber_resinous: 'Entrou como alternativa por manter direção âmbar e resinosa.',
  leather_smoky_dark: 'Entrou como alternativa por manter couro, fumaça e leitura dark.',
  floral_powdery: 'Entrou como alternativa por manter floral elegante com nuance atalcada.',
  musk_comfort: 'Entrou como alternativa por manter musk de pele e conforto.',
  tropical_fruity: 'Entrou como alternativa por manter nuance tropical, frutada e solar.',
  nightlife_presence: 'Entrou como alternativa por manter presença alta e assinatura noturna.',
  luxury_status: 'Entrou como alternativa por manter assinatura sofisticada e aura de luxo.',
};

function productText(product = {}) {
  return normalizeSearchText([
    product.name, product.brand, product.category, product.gender, product.catalogType,
    product.description, product.searchIndex, product.performance, product.olfactoryReference,
    product.notes, product.vibe, product.occasions, product.badges,
  ].flat(Infinity).filter(Boolean).join(' '));
}

function includesSignal(text, signal) {
  return text.includes(normalizeSearchText(signal).replaceAll('_', ' ')) || text.includes(normalizeSearchText(signal));
}

function clusterOf(entry = {}) {
  const text = normalizeSearchText(`${entry.product?.brand || ''} ${entry.product?.category || entry.product?.catalogType || ''}`);
  if (text.includes('arabe')) return 'arabic';
  if (text.includes('importado')) return 'designer';
  return text || 'generic';
}

export function calculateFallbackIntentMatch(candidate, intent = {}) {
  const text = productText(candidate);
  const positive = (intent.primarySignals ?? []).filter((s) => includesSignal(text, s.signal || s));
  const secondary = (intent.secondarySignals ?? []).filter((s) => includesSignal(text, s.signal || s));
  const hints = (intent.hintSignals ?? []).filter((s) => includesSignal(text, s.signal || s));
  const negativeConflicts = (intent.negativeSignals ?? []).filter((s) => includesSignal(text, s.signal || s));

  const positiveScore = positive.length * 0.26 + secondary.length * 0.14 + hints.length * 0.08;
  const negativePenalty = negativeConflicts.length * 0.24;
  const confidenceBoost = (intent.confidence ?? 0) * 0.12;
  const ambiguityPenalty = (intent.ambiguity ?? 0) * 0.08;
  const family = (intent.activatedFamilies ?? [])[0] ?? '';
  const familyBonus = {
    aquatic_marine: (matched) => (matched.includes('aquatic') || matched.includes('marine') || matched.includes('ozonic') || matched.includes('blue_fresh') ? 0.16 : 0),
    clean_bath: (matched) => (matched.includes('post_bath') || matched.includes('soapy') || matched.includes('white_musk') ? 0.14 : 0),
    nightlife_presence: (matched) => (matched.includes('high_projection') || matched.includes('loud_clubbing') || matched.includes('nightlife') ? 0.14 : 0),
  };
  const matchedPrimarySignals = positive.map((s) => s.signal || s);
  const matchedSecondarySignals = secondary.map((s) => s.signal || s);
  const matchedHintSignals = hints.map((s) => s.signal || s);
  const familyBoost = familyBonus[family]?.(matchedPrimarySignals) ?? 0;
  const fallbackScore = Math.max(0, positiveScore - negativePenalty + confidenceBoost - ambiguityPenalty + familyBoost);
  const missingPrimarySignals = (intent.primarySignals ?? []).map((s) => s.signal || s).filter((signal) => !matchedPrimarySignals.includes(signal));

  return {
    positive,
    secondary,
    hints,
    negativeConflicts,
    fallbackScore,
    matchedPrimarySignals,
    matchedSecondarySignals,
    matchedHintSignals,
    missingPrimarySignals,
  };
}

function resolveRelevanceTier(match = {}, score = 0) {
  const negativeCount = match.negativeConflicts?.length ?? 0;
  const primaryCount = match.matchedPrimarySignals?.length ?? 0;
  const secondaryCount = match.matchedSecondarySignals?.length ?? 0;
  const hintCount = match.matchedHintSignals?.length ?? 0;

  if (negativeCount >= 2) return { relevanceTier: 'no_match', tierReason: 'Conflitos negativos fortes com a intenção da busca.' };
  if (primaryCount >= 1 && score >= 0.34) return { relevanceTier: 'strong_match', tierReason: 'Mantém sinais primários da intenção original.' };
  if ((secondaryCount >= 1 && score >= 0.2) || (hintCount >= 2 && score >= 0.2)) {
    return { relevanceTier: 'adjacent_match', tierReason: 'Mantém sinais secundários/próximos da intenção, sem aderência total.' };
  }
  if (score >= 0.14) return { relevanceTier: 'weak_match', tierReason: 'Aderência baixa com poucos sinais úteis.' };
  return { relevanceTier: 'no_match', tierReason: 'Sem aderência semântica suficiente para fallback confiável.' };
}

export function rankFallbackByQueryIntent(candidates = [], context = {}, options = {}) {
  const minRelevance = options.minRelevance ?? 0.18;
  const enriched = candidates.map((entry) => {
    const match = calculateFallbackIntentMatch(entry.product ?? entry, context);
    const diversityPenalty = (entry._clusterCount ?? 0) * 0.06;
    const score = Math.max(0, match.fallbackScore - diversityPenalty);
    const { relevanceTier, tierReason } = resolveRelevanceTier(match, score);
    return {
      ...entry,
      fallbackScore: Number(score.toFixed(3)),
      relevanceTier,
      tierReason,
      trace: {
        query: context.query,
        activatedFamily: (context.activatedFamilies ?? [])[0] ?? 'unknown',
        relevanceTier,
        tierReason,
        missingPrimarySignals: match.missingPrimarySignals,
        matchedPrimarySignals: match.matchedPrimarySignals,
        matchedSecondarySignals: match.matchedSecondarySignals,
        matchedHintSignals: match.matchedHintSignals,
        negativeConflicts: match.negativeConflicts.map((s) => s.signal || s),
        relaxedBecauseNoStrongMatch: false,
      },
    };
  }).sort((a, b) => b.fallbackScore - a.fallbackScore);

  return enriched.filter((entry) => entry.fallbackScore >= minRelevance && ['strong_match', 'adjacent_match', 'weak_match'].includes(entry.relevanceTier));
}

export function buildQueryLockedFallback(candidates = [], context = {}, options = {}) {
  const clusterCounts = new Map();
  const seeded = candidates.map((entry) => {
    const cluster = clusterOf(entry);
    const count = clusterCounts.get(cluster) ?? 0;
    clusterCounts.set(cluster, count + 1);
    return { ...entry, _clusterCount: count };
  });

  const rankedByTier = rankFallbackByQueryIntent(seeded, context, options);
  const strongMatches = rankedByTier.filter((entry) => entry.relevanceTier === 'strong_match');
  const adjacentMatches = rankedByTier.filter((entry) => entry.relevanceTier === 'adjacent_match');
  const shouldRelaxToAdjacent = strongMatches.length === 0 && adjacentMatches.length > 0;
  const visibleEntries = strongMatches.length > 0 ? strongMatches : adjacentMatches;

  const ranked = visibleEntries.map((entry) => ({
    ...entry,
    reason: entry.relevanceTier === 'adjacent_match'
      ? 'Não encontramos uma assinatura exatamente marinha, mas estas opções seguem frescor limpo, clima quente e direção aquática próxima.'
      : FAMILY_REASONS[(context.activatedFamilies ?? [])[0]] ?? 'Entrou como alternativa por manter coerência semântica com sua busca.',
    trace: {
      ...entry.trace,
      relaxedBecauseNoStrongMatch: shouldRelaxToAdjacent,
    },
  }));

  return {
    ranked,
    discarded: seeded.length - rankedByTier.length,
    honestEmptyState: ranked.length === 0,
  };
}
