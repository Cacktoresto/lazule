import { normalizeSearchText } from '../utils/search.js';

const STOP_TOKENS = new Set(['perfume', 'de', 'do', 'da', 'pra', 'pro', 'para', 'um', 'uma', 'o', 'a']);

const LEXICON = {
  fresco: {
    aliases: ['fresca', 'fresh', 'refrescante'],
    direct: signalWeights(['citrus', 'aquatic', 'fresh_clean'], 1),
    secondary: signalWeights(['clean_luxury', 'modern_fresh'], 0.66),
    hints: signalWeights(['summer', 'office', 'airy_citrus'], 0.4),
    intentType: 'physical_olfactive',
  },
  doce: {
    aliases: ['adocicado', 'gourmand'], direct: signalWeights(['vanilla', 'gourmand', 'creamy_sweet'], 1), secondary: signalWeights(['sweet_attention'], 0.62), hints: signalWeights(['date_night'], 0.4), intentType: 'physical_olfactive',
  },
  forte: {
    aliases: ['potente', 'marcante', 'presenca'], direct: signalWeights(['high_projection', 'intense'], 1), secondary: signalWeights(['beast_mode', 'loud'], 0.7), hints: signalWeights(['night'], 0.45), intentType: 'physical_olfactive',
  },
  elegante: {
    aliases: ['sofisticado', 'chique', 'refinado'], direct: signalWeights(['clean_luxury', 'refined', 'elegant'], 0.92), secondary: signalWeights(['quiet_luxury', 'formal'], 0.6), hints: signalWeights(['office'], 0.35), intentType: 'atmospheric_contextual',
  },
  noite: {
    aliases: ['noturno', 'balada'], direct: signalWeights(['night', 'seductive_night'], 0.95), secondary: signalWeights(['loud_clubbing'], 0.68), hints: signalWeights(['high_projection'], 0.42), intentType: 'usage_social',
  },
  calor: {
    aliases: ['quente', 'verao'], direct: signalWeights(['hot_weather', 'summer'], 0.92), secondary: signalWeights(['aquatic', 'citrus'], 0.65), hints: signalWeights(['moderate_projection'], 0.4), intentType: 'usage_social',
  },
  limpo: {
    aliases: ['banho', 'cheiroso', 'pos_banho'], direct: signalWeights(['clean_luxury', 'fresh_clean', 'airy_citrus'], 0.92), secondary: signalWeights(['soapy', 'minimal'], 0.62), hints: signalWeights(['office'], 0.3), intentType: 'experiential',
  },
  sensual: {
    aliases: ['sexy', 'sedutor'], direct: signalWeights(['seductive_night', 'sensual', 'amber'], 0.95), secondary: signalWeights(['warm_spicy', 'date_night'], 0.62), hints: signalWeights(['high_projection'], 0.34), intentType: 'atmospheric_contextual',
  },
  trabalho: {
    aliases: ['escritorio', 'office', 'executivo'], direct: signalWeights(['office', 'executive_fresh'], 0.92), secondary: signalWeights(['moderate_projection', 'clean_luxury'], 0.7), hints: signalWeights(['daytime'], 0.35), intentType: 'usage_social',
  },
  rico: {
    aliases: ['luxo', 'patrao'], direct: signalWeights(['quiet_luxury', 'elegant', 'refined'], 0.84), secondary: signalWeights(['woody_amber', 'signature_presence'], 0.57), hints: signalWeights(['formal'], 0.28), intentType: 'atmospheric_contextual',
  },
};

const FALLBACK_SIGNALS = ['fresh_clean', 'signature_presence', 'versatile'];

function signalWeights(signals, weight) {
  return signals.map((signal) => ({ signal, weight }));
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function tokenize(query) {
  return normalizeSearchText(query).split(' ').filter((token) => token && !STOP_TOKENS.has(token));
}

export function resolveSemanticAliases(tokens = []) {
  const aliasToCanonical = new Map();
  Object.entries(LEXICON).forEach(([key, value]) => {
    aliasToCanonical.set(key, key);
    (value.aliases ?? []).forEach((alias) => aliasToCanonical.set(normalizeSearchText(alias), key));
  });
  return tokens.map((token) => aliasToCanonical.get(token) ?? token);
}

export function inferSemanticSearchSignals(rawQuery = '') {
  const tokens = tokenize(rawQuery);
  const resolvedTokens = resolveSemanticAliases(tokens);
  const expansions = [];
  const intentTypes = new Set();

  resolvedTokens.forEach((token) => {
    const mapping = LEXICON[token];
    if (!mapping) return;
    intentTypes.add(mapping.intentType);
    expansions.push(...mapping.direct.map((item) => ({ ...item, strength: 'primary', source: token })));
    expansions.push(...mapping.secondary.map((item) => ({ ...item, strength: 'secondary', source: token })));
    expansions.push(...mapping.hints.map((item) => ({ ...item, strength: 'hint', source: token })));
  });

  const strengthRank = { primary: 3, secondary: 2, hint: 1 };
  const merged = new Map();
  expansions.forEach((item) => {
    const prev = merged.get(item.signal);
    if (!prev) { merged.set(item.signal, item); return; }
    const keepPrev = prev.weight > item.weight || (prev.weight === item.weight && strengthRank[prev.strength] >= strengthRank[item.strength]);
    merged.set(item.signal, keepPrev ? prev : item);
  });

  const matchedSignals = [...merged.values()].sort((a, b) => b.weight - a.weight || a.signal.localeCompare(b.signal));
  const recognizedTokens = resolvedTokens.filter((token) => LEXICON[token]);
  const confidence = clamp((recognizedTokens.length / Math.max(1, resolvedTokens.length)) * 0.75 + Math.min(0.25, matchedSignals.length * 0.02), 0, 1);
  const ambiguity = clamp(1 - (recognizedTokens.length / Math.max(1, resolvedTokens.length)), 0, 1);
  const expansionStrength = matchedSignals.length > 14 ? 'wide' : matchedSignals.length > 8 ? 'balanced' : 'focused';

  return {
    normalizedQuery: normalizeSearchText(rawQuery),
    tokens,
    resolvedTokens,
    recognizedTokens,
    intentTypes: [...intentTypes],
    matchedSignals,
    confidence: Number(confidence.toFixed(3)),
    ambiguity: Number(ambiguity.toFixed(3)),
    expansionStrength,
  };
}

export function expandSemanticQuery(rawQuery = '') {
  const interpreted = inferSemanticSearchSignals(rawQuery);
  if (!interpreted.matchedSignals.length) {
    return { ...interpreted, fallbackMode: true, matchedSignals: FALLBACK_SIGNALS.map((signal) => ({ signal, weight: 0.25, strength: 'hint', source: 'fallback' })) };
  }
  const maxSignals = interpreted.confidence < 0.45 ? 6 : 12;
  return { ...interpreted, fallbackMode: false, matchedSignals: interpreted.matchedSignals.slice(0, maxSignals) };
}

export function interpretUserIntent(rawQuery = '') {
  const expanded = expandSemanticQuery(rawQuery);
  const primaryIntent = expanded.matchedSignals.find((signal) => signal.strength === 'primary')?.signal ?? 'versatile';
  const atmosphere = expanded.matchedSignals.find((signal) => ['elegant', 'sensual', 'clean_luxury', 'quiet_luxury'].includes(signal.signal))?.signal ?? null;
  const climate = expanded.matchedSignals.find((signal) => ['hot_weather', 'summer', 'cold_weather'].includes(signal.signal))?.signal ?? null;
  const projectionPreference = expanded.matchedSignals.find((signal) => ['high_projection', 'moderate_projection', 'beast_mode'].includes(signal.signal))?.signal ?? null;

  return {
    ...expanded,
    semanticEntity: {
      primaryIntent,
      atmosphere,
      climate,
      projectionPreference,
      intentTypes: expanded.intentTypes,
    },
  };
}

export function buildQueryUnderstandingExplainability(intent = {}) {
  return (intent.matchedSignals ?? []).slice(0, 5).map((signal) => ({
    signal: signal.signal,
    reason: `Sinal ${signal.strength} ativado por "${signal.source}" com peso ${signal.weight.toFixed(2)}`,
  }));
}

export function generateSemanticAuditReport(sampleQueries = []) {
  const rows = sampleQueries.map((query) => interpretUserIntent(query));
  const covered = rows.filter((row) => !row.fallbackMode).length;
  const deadZones = rows.filter((row) => row.fallbackMode).map((row) => row.normalizedQuery);
  const strongestAliases = Object.entries(LEXICON).map(([term, data]) => ({ term, aliases: data.aliases.length })).sort((a, b) => b.aliases - a.aliases).slice(0, 5);
  return {
    supportedQueries: covered,
    totalQueries: rows.length,
    coverage: Number((covered / Math.max(1, rows.length)).toFixed(3)),
    strongestAliases,
    ambiguousTerms: rows.filter((row) => row.ambiguity > 0.55).map((row) => row.normalizedQuery),
    potentialSemanticDeadZones: deadZones,
  };
}
