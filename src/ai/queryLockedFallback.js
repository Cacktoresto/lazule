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
  const fallbackScore = Math.max(0, positiveScore - negativePenalty + confidenceBoost - ambiguityPenalty);

  return { positive, secondary, hints, negativeConflicts, fallbackScore };
}

export function rankFallbackByQueryIntent(candidates = [], context = {}, options = {}) {
  const minRelevance = options.minRelevance ?? 0.24;
  const enriched = candidates.map((entry) => {
    const match = calculateFallbackIntentMatch(entry.product ?? entry, context);
    const diversityPenalty = (entry._clusterCount ?? 0) * 0.06;
    const score = Math.max(0, match.fallbackScore - diversityPenalty);
    return {
      ...entry,
      fallbackScore: Number(score.toFixed(3)),
      relevanceTier: score >= 0.58 ? 'high' : score >= 0.38 ? 'medium' : score >= minRelevance ? 'low' : 'discarded',
      trace: {
        query: context.query,
        activatedFamily: (context.activatedFamilies ?? [])[0] ?? 'unknown',
        primaryMatches: match.positive.map((s) => s.signal || s),
        secondaryMatches: match.secondary.map((s) => s.signal || s),
        hintMatches: match.hints.map((s) => s.signal || s),
        negativeConflicts: match.negativeConflicts.map((s) => s.signal || s),
      },
    };
  }).sort((a, b) => b.fallbackScore - a.fallbackScore);

  return enriched.filter((entry) => entry.fallbackScore >= minRelevance);
}

export function buildQueryLockedFallback(candidates = [], context = {}, options = {}) {
  const clusterCounts = new Map();
  const seeded = candidates.map((entry) => {
    const cluster = clusterOf(entry);
    const count = clusterCounts.get(cluster) ?? 0;
    clusterCounts.set(cluster, count + 1);
    return { ...entry, _clusterCount: count };
  });

  const ranked = rankFallbackByQueryIntent(seeded, context, options).map((entry) => ({
    ...entry,
    reason: FAMILY_REASONS[(context.activatedFamilies ?? [])[0]] ?? 'Entrou como alternativa por manter coerência semântica com sua busca.',
  }));

  return {
    ranked,
    discarded: seeded.length - ranked.length,
    honestEmptyState: ranked.length === 0,
  };
}
