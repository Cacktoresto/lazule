import { normalizeSearchText } from '../utils/search.js';
import { generatePerfumeDNA } from './perfumeDNA.js';

export const SEMANTIC_WEIGHTS = Object.freeze({
  accords: 0.24,
  signature: 0.2,
  temperature: 0.12,
  projection: 0.1,
  personality: 0.1,
  vibe: 0.08,
  occasion: 0.06,
  climate: 0.06,
  behavior: 0.04,
});

export const SEMANTIC_FACETS = Object.freeze([
  'fresh_clean', 'warm_spicy', 'dark_smoky', 'creamy_sweet', 'metallic_aquatic',
  'tropical_fruity', 'woody_executive', 'seductive_dense', 'airy_citrus',
]);

export const SEMANTIC_CLUSTERS = Object.freeze([
  'clean_luxury', 'seductive_night', 'tropical_energy', 'dark_amber',
  'executive_fresh', 'creamy_winter', 'loud_clubbing', 'intimate_skin_scent',
]);

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => normalizeSearchText(x)).filter(Boolean);
const asSet = (v) => new Set(toArray(v));
const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((x) => b.has(x)).length;
  return shared / Math.max(a.size, b.size);
};

function inferFacet(product = {}) {
  const accords = asSet(product.accords);
  const vibes = asSet(product.vibeTags ?? product.vibe);
  const notes = asSet(product.notes);
  if (accords.has('aquatic') || accords.has('marine')) return 'metallic_aquatic';
  if (accords.has('citrico') || accords.has('citrus')) return 'airy_citrus';
  if (accords.has('fresco') || vibes.has('clean')) return 'fresh_clean';
  if (accords.has('especiado') || accords.has('spicy')) return 'warm_spicy';
  if (accords.has('smoky') || notes.has('incenso')) return 'dark_smoky';
  if (accords.has('doce') || accords.has('gourmand')) return 'creamy_sweet';
  if (notes.has('manga') || notes.has('abacaxi')) return 'tropical_fruity';
  if (vibes.has('executivo') || vibes.has('elegante')) return 'woody_executive';
  if (vibes.has('sedutor') || vibes.has('noturno')) return 'seductive_dense';
  return 'fresh_clean';
}

function inferCluster(product = {}, facet = inferFacet(product)) {
  const t = normalizeSearchText([product.performanceLabel, ...(product.occasionTags ?? [])].join(' '));
  if (facet === 'woody_executive') return 'executive_fresh';
  if (facet === 'seductive_dense' && t.includes('noite')) return 'seductive_night';
  if (facet === 'metallic_aquatic') return 'clean_luxury';
  if (facet === 'creamy_sweet') return 'creamy_winter';
  if (facet === 'tropical_fruity') return 'tropical_energy';
  if (facet === 'dark_smoky') return 'dark_amber';
  if (t.includes('balada') || t.includes('clubbing')) return 'loud_clubbing';
  return 'intimate_skin_scent';
}

export function calculateSemanticSimilarity(base = {}, candidate = {}, weights = SEMANTIC_WEIGHTS) {
  const baseDNA = generatePerfumeDNA(base);
  const candidateDNA = generatePerfumeDNA(candidate);
  const accordScore = overlap(asSet(base.accords), asSet(candidate.accords));
  const signatureScore = overlap(asSet(base.similarTo ?? base.olfactoryReference), asSet(candidate.similarTo ?? candidate.olfactoryReference));
  const tempScore = overlap(asSet(base.weatherTags), asSet(candidate.weatherTags));
  const projectionScore = overlap(asSet(base.performanceLabel), asSet(candidate.performanceLabel));
  const personalityScore = overlap(asSet(base.vibeTags), asSet(candidate.vibeTags));
  const vibeScore = overlap(asSet(base.vibe), asSet(candidate.vibe));
  const occasionScore = overlap(asSet(base.occasionTags), asSet(candidate.occasionTags));
  const climateScore = overlap(asSet(base.weatherTags), asSet(candidate.weatherTags));
  const behaviorScore = overlap(asSet(base.category), asSet(candidate.category));
  const confidence = Number(candidate.semanticConfidence ?? candidate.olfactiveConfidence ?? 0.65);

  const weighted = accordScore * weights.accords
    + signatureScore * weights.signature
    + tempScore * weights.temperature
    + projectionScore * weights.projection
    + personalityScore * weights.personality
    + vibeScore * weights.vibe
    + occasionScore * weights.occasion
    + climateScore * weights.climate
    + behaviorScore * weights.behavior;

  const dnaDelta = Math.abs((baseDNA.nightlife ?? 0) - (candidateDNA.nightlife ?? 0))
    + Math.abs((baseDNA.fresh ?? 0) - (candidateDNA.fresh ?? 0));
  const driftPenalty = dnaDelta > 1.0 ? 0.08 : 0;
  const score = Math.max(0, weighted * (0.6 + confidence * 0.4) - driftPenalty);

  const reasons = [];
  if (accordScore >= 0.34) reasons.push('Compartilha assinatura de accords dominante.');
  if (signatureScore >= 0.25) reasons.push('Assinatura olfativa próxima.');
  if (tempScore >= 0.25) reasons.push('Compatibilidade térmica e climática semelhante.');
  if (projectionScore >= 0.25) reasons.push('Comportamento de projeção parecido.');
  if (!reasons.length) reasons.push('Relação de contexto por compatibilidade geral de uso.');

  return {
    score: Number(score.toFixed(4)),
    distance: Number((1 - score).toFixed(4)),
    confidence: Number((0.55 + confidence * 0.45).toFixed(4)),
    facet: inferFacet(candidate),
    cluster: inferCluster(candidate),
    reasons,
  };
}

export function getContextualSimilarity(base, candidate, options = {}) {
  return calculateSemanticSimilarity(base, candidate, options.weights ?? SEMANTIC_WEIGHTS);
}

export function getSemanticDistance(base, candidate, options = {}) {
  return getContextualSimilarity(base, candidate, options).distance;
}

export function getRelatedBySignature(base = {}, catalog = [], { limit = 6 } = {}) {
  return catalog
    .filter((p) => p && p.productSlug !== base.productSlug)
    .map((p) => ({ product: p, semantic: calculateSemanticSimilarity(base, p) }))
    .filter((entry) => entry.semantic.score >= 0.22)
    .sort((a, b) => b.semantic.score - a.semantic.score || a.product.name.localeCompare(b.product.name, 'pt-BR'))
    .slice(0, limit);
}

export function buildSemanticRelationships(base = {}, catalog = [], { limit = 8 } = {}) {
  const related = getRelatedBySignature(base, catalog, { limit: Math.max(limit, 12) });
  const stable = related.filter(({ semantic }) => semantic.distance <= 0.78);
  const byCluster = stable.reduce((acc, entry) => {
    const cluster = entry.semantic.cluster;
    acc[cluster] = acc[cluster] ?? [];
    if (acc[cluster].length < 4) acc[cluster].push(entry);
    return acc;
  }, {});

  return {
    related: stable.slice(0, limit),
    clusters: byCluster,
    facets: [...new Set(stable.map(({ semantic }) => semantic.facet))],
    relationshipConfidence: stable.length ? Number((stable.reduce((sum, item) => sum + item.semantic.confidence, 0) / stable.length).toFixed(4)) : 0.45,
  };
}
