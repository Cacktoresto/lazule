import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSemanticRelationships,
  calculateSemanticSimilarity,
  getSemanticDistance,
  SEMANTIC_WEIGHTS,
} from '../src/ai/semanticIntelligenceLayer.js';

const asad = {
  productSlug: 'asad', name: 'Asad', accords: ['amber', 'spicy', 'woody'],
  vibeTags: ['sedutor', 'noturno'], occasionTags: ['noite'], weatherTags: ['frio'],
  performanceLabel: 'forte', olfactiveConfidence: 0.82,
};
const khamrah = {
  productSlug: 'khamrah', name: 'Khamrah', accords: ['amber', 'spicy', 'sweet'],
  vibeTags: ['sedutor', 'noturno'], occasionTags: ['noite'], weatherTags: ['frio'],
  performanceLabel: 'forte', olfactiveConfidence: 0.79,
};
const freshBlue = {
  productSlug: 'fresh-blue', name: 'Fresh Blue', accords: ['aquatic', 'citrus', 'fresh'],
  vibeTags: ['clean', 'diurno'], occasionTags: ['dia'], weatherTags: ['calor'],
  performanceLabel: 'moderado', olfactiveConfidence: 0.74,
};

test('semantic similarity prioritizes olfactive behavior over generic abstractions', () => {
  const close = calculateSemanticSimilarity(asad, khamrah, SEMANTIC_WEIGHTS);
  const far = calculateSemanticSimilarity(asad, freshBlue, SEMANTIC_WEIGHTS);
  assert.equal(close.score > far.score, true);
  assert.equal(close.distance < far.distance, true);
  assert.equal(close.reasons.length > 0, true);
});

test('relationship layer produces stable facets/clusters and explainable links', () => {
  const rel = buildSemanticRelationships(asad, [khamrah, freshBlue], { limit: 2 });
  assert.equal(rel.related.length >= 1, true);
  assert.equal(Array.isArray(rel.facets), true);
  assert.equal(rel.related[0].semantic.reasons.length > 0, true);
});

test('semantic distance remains bounded for sparse enrichment fallback', () => {
  const sparse = { productSlug: 'sparse', name: 'Sparse', accords: ['woody'] };
  const d = getSemanticDistance(asad, sparse);
  assert.equal(d >= 0 && d <= 1, true);
});
