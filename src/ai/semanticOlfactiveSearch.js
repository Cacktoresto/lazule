import { SEMANTIC_PHRASES, SEMANTIC_VOCABULARY } from '../data/generated/semanticVocabulary.js';
import { normalizeSearchText } from '../utils/search.js';
import { generatePerfumeDNA } from './perfumeDNA.js';

const SCORE_WEIGHTS = { accords: 0.33, vibes: 0.2, occasions: 0.13, weather: 0.08, families: 0.1, luxurySignature: 0.1, confidence: 0.06 };
let semanticSessionProfile = { tokens: [], directions: { accords: [], vibes: [], families: [], occasions: [], weather: [] }, queries: 0 };

function unique(values = []) { return [...new Set(values.filter(Boolean))]; }
function tokenize(query = '') { return normalizeSearchText(query).split(' ').filter(Boolean); }
function overlapScore(expected = [], sourceText = '') {
  if (!expected.length) return 0;
  const text = normalizeSearchText(sourceText);
  const hits = expected.reduce((sum, tag) => sum + (text.includes(normalizeSearchText(tag)) ? 1 : 0), 0);
  return hits / expected.length;
}

function extractProductText(product = {}) {
  return [product.name, product.brand, product.description, product.olfactoryReference, product.vibe, product.vibeTags, product.occasions, product.occasionTags, product.weatherTags, product.accords, product.notes, product.keywords].flat(Infinity).filter(Boolean).join(' ');
}

export function interpretSemanticIntent(query = '', options = {}) {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = tokenize(normalizedQuery);
  const phraseKeys = Object.entries(SEMANTIC_PHRASES).filter(([phrase]) => normalizedQuery.includes(normalizeSearchText(phrase))).flatMap(([, mapped]) => mapped);
  const tokenKeys = tokens.filter((token) => SEMANTIC_VOCABULARY[token]);
  const matchedKeys = unique([...phraseKeys, ...tokenKeys]);

  const interpretation = matchedKeys.reduce((acc, key) => {
    const semantic = SEMANTIC_VOCABULARY[key] ?? {};
    Object.keys(acc).forEach((bucket) => { if (Array.isArray(acc[bucket])) acc[bucket].push(...(semantic[bucket] ?? [])); });
    return acc;
  }, { accords: [], vibes: [], weather: [], families: [], moods: [], occasions: [] });

  Object.keys(interpretation).forEach((key) => { interpretation[key] = unique(interpretation[key]); });

  const rawConfidence = matchedKeys.length ? Math.min(1, 0.35 + matchedKeys.length * 0.18 + (phraseKeys.length ? 0.18 : 0)) : 0;
  const confidenceLevel = rawConfidence >= 0.7 ? 'high' : rawConfidence >= 0.48 ? 'medium' : 'low';

  if (options.updateSession !== false && matchedKeys.length) {
    semanticSessionProfile = {
      queries: semanticSessionProfile.queries + 1,
      tokens: unique([...semanticSessionProfile.tokens, ...matchedKeys]).slice(-24),
      directions: {
        accords: unique([...semanticSessionProfile.directions.accords, ...interpretation.accords]).slice(-14),
        vibes: unique([...semanticSessionProfile.directions.vibes, ...interpretation.vibes]).slice(-14),
        families: unique([...semanticSessionProfile.directions.families, ...interpretation.families]).slice(-10),
        occasions: unique([...semanticSessionProfile.directions.occasions, ...interpretation.occasions]).slice(-10),
        weather: unique([...semanticSessionProfile.directions.weather, ...interpretation.weather]).slice(-8),
      },
    };
  }

  return { normalizedQuery, matchedKeys, ...interpretation, confidence: confidenceLevel, confidenceScore: Number(rawConfidence.toFixed(3)), semanticSessionProfile };
}

export function scoreSemanticMatch(product = {}, interpreted = {}) {
  const text = extractProductText(product);
  const dna = generatePerfumeDNA(product);
  const continuityBoost = interpreted.semanticSessionProfile?.queries > 1 ? 0.06 : 0;
  const accords = overlapScore(interpreted.accords, text);
  const vibes = overlapScore(interpreted.vibes, text);
  const occasions = overlapScore(interpreted.occasions, text);
  const weather = overlapScore(interpreted.weather, text);
  const families = overlapScore(interpreted.families, text);
  const luxurySignature = Math.max(dna.elegant ?? 0, dna.woody ?? 0, dna.seductive ?? 0);
  const confidenceBase = interpreted.confidenceScore ?? 0;

  // semantic drift protection via decay on weak dimensions
  const decay = (score) => (score < 0.35 ? score * 0.55 : score);
  const total = decay(accords) * SCORE_WEIGHTS.accords
    + decay(vibes) * SCORE_WEIGHTS.vibes
    + decay(occasions) * SCORE_WEIGHTS.occasions
    + decay(weather) * SCORE_WEIGHTS.weather
    + decay(families) * SCORE_WEIGHTS.families
    + luxurySignature * SCORE_WEIGHTS.luxurySignature
    + confidenceBase * SCORE_WEIGHTS.confidence
    + continuityBoost;

  const score = Number(Math.min(1, total).toFixed(3));
  return { score, confidence: score, breakdown: { accords, vibes, occasions, weather, families, luxurySignature, confidenceBase, continuityBoost } };
}

export function createSemanticExplanation(product, interpreted, scoring) {
  const parts = [];
  if ((interpreted.vibes ?? []).length) parts.push(`algo mais ${interpreted.vibes.slice(0, 2).join(' e ')}`);
  if ((interpreted.accords ?? []).length) parts.push(`com assinatura ${interpreted.accords[0]}`);
  if ((interpreted.families ?? []).length) parts.push(`na família ${interpreted.families[0]}`);
  const tail = scoring.score > 0.55 ? 'com presença sofisticada e direção olfativa clara.' : 'com equilíbrio elegante e versatilidade refinada.';
  return `Você parece buscar ${parts.join(', ')} — ${tail}`;
}

export function getSemanticAnalyticsTags(interpreted = {}) {
  const map = [
    interpreted.vibes?.includes('clean') ? 'presença limpa' : null,
    interpreted.vibes?.includes('discreet') ? 'luxo silencioso' : null,
    interpreted.vibes?.includes('executive') ? 'frescor executivo' : null,
    interpreted.accords?.includes('woody') ? 'madeira refinada' : null,
    interpreted.vibes?.includes('airy') ? 'elegância aérea' : null,
    interpreted.occasions?.includes('night') ? 'presença noturna' : null,
    interpreted.accords?.includes('amber') ? 'assinatura envolvente' : null,
    interpreted.weather?.includes('cold') ? 'assinatura fria' : null,
  ].filter(Boolean);
  return unique(map).slice(0, 4).length ? unique(map).slice(0, 4) : ['curadoria contínua'];
}

export function getSemanticDebugArtifact(query, product, interpreted, scoring) {
  return {
    query: normalizeSearchText(query),
    inferred: {
      accords: interpreted.accords ?? [], vibes: interpreted.vibes ?? [], moods: interpreted.moods ?? [], weather: interpreted.weather ?? [], confidence: interpreted.confidence,
    },
    rankedProduct: product?.name,
    whyRanked: scoring.breakdown,
  };
}

export function resetSemanticSessionProfile() { semanticSessionProfile = { tokens: [], directions: { accords: [], vibes: [], families: [], occasions: [], weather: [] }, queries: 0 }; }

export const semanticLayeringHooks = { toBlendVector: (product) => generatePerfumeDNA(product) };
