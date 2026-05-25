import { normalizeSearchText } from '../utils/search.js';

const STOP_TOKENS = new Set(['perfume', 'de', 'do', 'da', 'pra', 'pro', 'para', 'um', 'uma', 'o', 'a', 'cheiro']);
const FALLBACK_SIGNALS = ['fresh_clean', 'signature_presence', 'versatile'];
const MAX_SIGNALS_HIGH_CONFIDENCE = 12;
const MAX_SIGNALS_LOW_CONFIDENCE = 7;

function signalWeights(signals, weight, family) {
  return signals.map((signal) => ({ signal, weight, family }));
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
const unique = (values = []) => [...new Set(values.filter(Boolean))];

const SENSORY_FAMILIES = {
  citrus_fresh: {
    terms: ['fresco', 'fresca', 'refrescante', 'citrico', 'limao', 'bergamota', 'laranja', 'grapefruit', 'calor', 'verao', 'energia'],
    intentType: 'physical_olfactive',
    primary: signalWeights(['citrus', 'fresh', 'refreshing'], 0.91, 'citrus_fresh'),
    secondary: signalWeights(['summer', 'hot_weather', 'airy_citrus'], 0.58, 'citrus_fresh'),
    hints: signalWeights(['daytime', 'office'], 0.32, 'citrus_fresh'),
    negative: signalWeights(['gourmand_dense'], -0.12, 'citrus_fresh'),
  },
  aquatic_marine: {
    terms: ['oceano', 'mar', 'marinho', 'aquatico', 'agua', 'maresia', 'praia', 'salino', 'ozonico', 'brisa', 'litoral', 'piscina', 'azul', 'oceanico'],
    intentType: 'physical_olfactive',
    primary: signalWeights(['aquatic', 'marine', 'ozonic', 'salty', 'blue_fresh'], 1, 'aquatic_marine'),
    secondary: signalWeights(['fresh', 'beach', 'summer', 'citrus'], 0.62, 'aquatic_marine'),
    hints: signalWeights(['clean_luxury', 'modern_fresh', 'post_bath'], 0.38, 'aquatic_marine'),
    negative: signalWeights(['dark_smoky', 'gourmand_dense', 'tobacco_heavy', 'leathery_dark'], -0.28, 'aquatic_marine'),
  },
  clean_bath: {
    terms: ['banho', 'pos_banho', 'cheiro_de_banho', 'limpo', 'sabonete', 'shampoo', 'roupa_limpa', 'recem_saida_do_banho', 'cheiro_de_limpeza', 'fresco_limpo', 'pele_limpa'],
    intentType: 'experiential',
    primary: signalWeights(['clean_luxury', 'fresh_clean', 'soapy', 'white_musk', 'post_bath'], 0.96, 'clean_bath'),
    secondary: signalWeights(['airy', 'soft_projection', 'comfort', 'minimal'], 0.58, 'clean_bath'),
    hints: signalWeights(['office', 'daytime'], 0.36, 'clean_bath'),
    negative: signalWeights(['beast_mode', 'dark_amber', 'syrupy_sweet'], -0.3, 'clean_bath'),
  },
  sweet_gourmand: {
    terms: ['doce', 'adocicado', 'baunilha', 'caramelo', 'chocolate', 'gourmand', 'sobremesa', 'cremoso', 'acucar', 'mel'],
    intentType: 'physical_olfactive',
    primary: signalWeights(['gourmand', 'vanilla', 'sweet', 'creamy_sweet'], 0.95, 'sweet_gourmand'),
    secondary: signalWeights(['tonka', 'amber', 'comfort'], 0.55, 'sweet_gourmand'),
    hints: signalWeights(['date_night'], 0.34, 'sweet_gourmand'),
    negative: signalWeights(['metallic_fresh'], -0.2, 'sweet_gourmand'),
  },
  spicy_warm: {
    terms: ['especiado', 'apimentado', 'pimenta', 'canela', 'cardamomo', 'quente', 'ardido', 'oriental', 'temperado'],
    intentType: 'physical_olfactive',
    primary: signalWeights(['warm_spicy', 'spicy', 'hot_spice'], 0.92, 'spicy_warm'),
    secondary: signalWeights(['amber', 'night', 'intense'], 0.56, 'spicy_warm'),
    hints: signalWeights(['cold_weather'], 0.32, 'spicy_warm'),
    negative: signalWeights(['aquatic'], -0.16, 'spicy_warm'),
  },
  woody_executive: {
    terms: ['madeira', 'cedro', 'sandalo', 'vetiver', 'executivo', 'sobrio', 'elegante', 'social', 'escritorio', 'autoridade', 'trabalho'],
    intentType: 'usage_social',
    primary: signalWeights(['woody_executive', 'clean_luxury', 'elegant', 'executive'], 0.93, 'woody_executive'),
    secondary: signalWeights(['office', 'moderate_projection', 'refined_amber'], 0.58, 'woody_executive'),
    hints: signalWeights(['signature_versatile'], 0.34, 'woody_executive'),
    negative: signalWeights(['loud_clubbing'], -0.18, 'woody_executive'),
  },
  leather_smoky_dark: {
    terms: ['couro', 'fumaca', 'defumado', 'tabaco', 'dark', 'escuro', 'misterioso', 'pesado'],
    intentType: 'atmospheric_contextual',
    primary: signalWeights(['leathery_dark', 'dark_smoky', 'tobacco_heavy'], 0.94, 'leather_smoky_dark'),
    secondary: signalWeights(['resinous', 'night'], 0.54, 'leather_smoky_dark'),
    hints: signalWeights(['mysterious'], 0.3, 'leather_smoky_dark'),
    negative: signalWeights(['post_bath'], -0.24, 'leather_smoky_dark'),
  },
  nightlife_presence: {
    terms: ['balada', 'forte', 'presenca', 'projetar', 'marcante', 'chamar_atencao', 'noite', 'festa', 'clubbing'],
    intentType: 'usage_social',
    primary: signalWeights(['high_projection', 'loud_clubbing', 'nightlife', 'signature_presence'], 0.95, 'nightlife_presence'),
    secondary: signalWeights(['intense', 'seductive_night'], 0.62, 'nightlife_presence'),
    hints: signalWeights(['urban_night'], 0.36, 'nightlife_presence'),
    negative: signalWeights(['soft_projection'], -0.22, 'nightlife_presence'),
  },
  luxury_status: {
    terms: ['rico', 'caro', 'chique', 'sofisticado', 'premium', 'homem_rico', 'mulher_poderosa', 'hotel_caro', 'loja_chique'],
    intentType: 'atmospheric_contextual',
    primary: signalWeights(['clean_luxury', 'woody_executive', 'elegant', 'executive'], 0.9, 'luxury_status'),
    secondary: signalWeights(['amber', 'musk', 'upscale_social', 'moderate_projection'], 0.55, 'luxury_status'),
    hints: signalWeights(['office', 'signature_versatile'], 0.33, 'luxury_status'),
    negative: signalWeights(['chaotic_sweet'], -0.2, 'luxury_status'),
  },
};

function tokenize(query) {
  return normalizeSearchText(query).split(' ').filter((token) => token && !STOP_TOKENS.has(token));
}

function phraseNgrams(tokens = []) {
  const ngrams = [];
  for (let i = 0; i < tokens.length; i += 1) {
    ngrams.push(tokens[i]);
    if (tokens[i + 1]) ngrams.push(`${tokens[i]}_${tokens[i + 1]}`);
    if (tokens[i + 2]) ngrams.push(`${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`);
  }
  return unique(ngrams);
}

export function resolveSemanticAliases(tokens = []) {
  const map = new Map();
  Object.entries(SENSORY_FAMILIES).forEach(([familyKey, family]) => {
    family.terms.forEach((term) => map.set(normalizeSearchText(term), familyKey));
  });
  return tokens.map((token) => map.get(token) ?? token);
}

export function inferSemanticSearchSignals(rawQuery = '') {
  const tokens = tokenize(rawQuery);
  const phraseTokens = phraseNgrams(tokens);
  const resolvedTokens = resolveSemanticAliases(phraseTokens);
  const expansions = [];
  const intentTypes = new Set();
  const familyMatches = new Map();

  resolvedTokens.forEach((token) => {
    const family = SENSORY_FAMILIES[token];
    if (!family) return;
    intentTypes.add(family.intentType);
    familyMatches.set(token, (familyMatches.get(token) ?? 0) + 1);
    expansions.push(...family.primary.map((item) => ({ ...item, strength: 'primary', source: token })));
    expansions.push(...family.secondary.map((item) => ({ ...item, strength: 'secondary', source: token })));
    expansions.push(...family.hints.map((item) => ({ ...item, strength: 'hint', source: token })));
    expansions.push(...family.negative.map((item) => ({ ...item, strength: 'negative', source: token })));
  });

  const strengthRank = { primary: 4, secondary: 3, hint: 2, negative: 1 };
  const merged = new Map();
  expansions.forEach((item) => {
    const prev = merged.get(item.signal);
    if (!prev) return void merged.set(item.signal, item);
    const keepPrev = Math.abs(prev.weight) > Math.abs(item.weight) || (prev.weight === item.weight && strengthRank[prev.strength] >= strengthRank[item.strength]);
    merged.set(item.signal, keepPrev ? prev : item);
  });

  const matchedSignals = [...merged.values()].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight) || a.signal.localeCompare(b.signal));
  const recognizedTokens = resolvedTokens.filter((token) => SENSORY_FAMILIES[token]);
  const confidence = clamp((recognizedTokens.length / Math.max(1, resolvedTokens.length)) * 0.8 + Math.min(0.2, matchedSignals.length * 0.015), 0, 1);
  const ambiguity = clamp(1 - (recognizedTokens.length / Math.max(1, resolvedTokens.length)), 0, 1);

  return {
    normalizedQuery: normalizeSearchText(rawQuery),
    tokens,
    resolvedTokens,
    recognizedTokens,
    intentTypes: [...intentTypes],
    matchedSignals,
    confidence: Number(confidence.toFixed(3)),
    ambiguity: Number(ambiguity.toFixed(3)),
    expansionStrength: matchedSignals.length > 16 ? 'wide' : matchedSignals.length > 9 ? 'balanced' : 'focused',
    activatedFamilies: [...familyMatches.keys()],
  };
}

export function expandSemanticQuery(rawQuery = '') {
  const interpreted = inferSemanticSearchSignals(rawQuery);
  if (!interpreted.matchedSignals.length) {
    return { ...interpreted, fallbackMode: true, matchedSignals: FALLBACK_SIGNALS.map((signal) => ({ signal, weight: 0.25, strength: 'hint', source: 'fallback' })) };
  }
  const maxSignals = interpreted.confidence < 0.45 ? MAX_SIGNALS_LOW_CONFIDENCE : MAX_SIGNALS_HIGH_CONFIDENCE;
  return { ...interpreted, fallbackMode: false, matchedSignals: interpreted.matchedSignals.slice(0, maxSignals) };
}

export function interpretUserIntent(rawQuery = '') {
  const expanded = expandSemanticQuery(rawQuery);
  const primaryIntent = expanded.matchedSignals.find((signal) => signal.strength === 'primary')?.signal ?? 'versatile';
  const atmosphere = expanded.matchedSignals.find((signal) => ['elegant', 'sensual', 'clean_luxury', 'woody_executive', 'loud_clubbing'].includes(signal.signal))?.signal ?? null;
  const climate = expanded.matchedSignals.find((signal) => ['hot_weather', 'summer', 'cold_weather', 'beach'].includes(signal.signal))?.signal ?? null;
  const projectionPreference = expanded.matchedSignals.find((signal) => ['high_projection', 'moderate_projection', 'soft_projection', 'beast_mode'].includes(signal.signal))?.signal ?? null;

  return {
    ...expanded,
    semanticEntity: {
      primaryIntent,
      atmosphere,
      climate,
      projectionPreference,
      intentTypes: expanded.intentTypes,
      families: expanded.activatedFamilies,
    },
  };
}

export function buildQueryUnderstandingExplainability(intent = {}) {
  return (intent.matchedSignals ?? []).slice(0, 6).map((signal) => ({ signal: signal.signal, reason: `Sinal ${signal.strength} (${signal.family}) ativado por "${signal.source}" com peso ${signal.weight.toFixed(2)}` }));
}

export function generateSemanticAuditReport(sampleQueries = []) {
  const rows = sampleQueries.map((query) => interpretUserIntent(query));
  const covered = rows.filter((row) => !row.fallbackMode).length;
  const deadZones = rows.filter((row) => row.fallbackMode).map((row) => row.normalizedQuery);
  const termCount = Object.values(SENSORY_FAMILIES).reduce((sum, family) => sum + family.terms.length, 0);
  return {
    supportedQueries: covered,
    totalQueries: rows.length,
    coverage: Number((covered / Math.max(1, rows.length)).toFixed(3)),
    lexicalTermCount: termCount,
    familyCoverage: Object.keys(SENSORY_FAMILIES).length,
    ambiguousTerms: rows.filter((row) => row.ambiguity > 0.55).map((row) => row.normalizedQuery),
    potentialSemanticDeadZones: deadZones,
    overmatchingRiskQueries: rows.filter((row) => row.matchedSignals.length >= 11).map((row) => row.normalizedQuery),
    activatedSignalsByQuery: rows.map((row) => ({ query: row.normalizedQuery, signals: row.matchedSignals.slice(0, 6).map((s) => s.signal) })),
  };
}
