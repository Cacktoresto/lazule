import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComparePath, createPerfumeComparison, getComparisonSuggestions } from '../src/ai/perfumeComparisonEngine.js';

const base = {
  productSlug: 'historic-olmeda',
  name: 'Historic Olmeda',
  brand: 'Afnan',
  catalogType: 'Árabe',
  gender: 'Unissex',
  accords: ['fresh', 'clean', 'citrus', 'musk'],
  notes: ['bergamot', 'musk'],
  vibeTags: ['luxury', 'executive'],
  occasionTags: ['office', 'daily'],
  weatherTags: ['summer', 'hot_weather'],
  semanticFacets: ['luxurious'],
  semanticCluster: 'clean_luxury',
  signature: 'clean_luxury',
  projection: 'moderate',
};

const energetic = {
  productSlug: 'thurati-blue',
  name: 'Thurati Blue',
  brand: 'Afnan',
  catalogType: 'Árabe',
  gender: 'Masculino',
  accords: ['fresh', 'citrus', 'amber', 'woody'],
  notes: ['grapefruit', 'amber'],
  vibeTags: ['modern', 'loud'],
  occasionTags: ['daily', 'nightlife'],
  weatherTags: ['summer'],
  semanticFacets: ['bold'],
  semanticCluster: 'clean_luxury',
  signature: 'modern_fresh',
  projection: 'high',
};

const unrelated = {
  productSlug: 'oud-night',
  name: 'Oud Night',
  brand: 'Maison Test',
  catalogType: 'Nicho',
  gender: 'Unissex',
  accords: ['oud', 'smoky'],
  semanticCluster: 'dark_amber',
};

test('perfume comparison produces decision layers from existing olfactive signals', () => {
  const comparison = createPerfumeComparison([base, energetic]);

  assert.equal(comparison.products.length, 2);
  assert.ok(comparison.narrative.includes('Historic Olmeda'));
  assert.ok(comparison.verdict.includes('comprar primeiro'));
  assert.ok(comparison.metrics.find((metric) => metric.key === 'freshness').values.every((value) => value.score > 0));
  assert.ok(comparison.summaries.every((summary) => summary.reasons.length >= 3));
});

test('comparison suggestions fall back to semantic catalog similarity when generated artifact has no row', () => {
  const suggestions = getComparisonSuggestions(base, [base, energetic, unrelated], 2);

  assert.equal(suggestions[0].productSlug, 'thurati-blue');
  assert.ok(!suggestions.some((product) => product.productSlug === base.productSlug));
});

test('compare path supports up to four product slugs', () => {
  assert.equal(buildComparePath([base, energetic, unrelated]), '/compare/historic-olmeda-vs-thurati-blue-vs-oud-night');
});
