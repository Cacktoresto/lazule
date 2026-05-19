import assert from 'node:assert/strict';
import test from 'node:test';

import { createSemanticExplanation, interpretSemanticIntent, scoreSemanticMatch, semanticLayeringHooks } from '../src/ai/semanticOlfactiveSearch.js';
import { getOlfactiveRecommendations } from '../src/utils/olfactiveAssistant.js';

const product = {
  id: 'rich-clean',
  name: 'Executive Linen',
  description: 'Perfume limpo, sofisticado, musk, amadeirado e elegante para escritório.',
  vibe: ['elegante', 'limpo', 'executivo'],
  accords: ['woody', 'musky', 'citrus'],
  weatherTags: ['calor', 'ameno'],
  occasions: ['trabalho'],
  performance: 'projeção moderada e refinada',
};

test('interprets archetype and semantic vibe language deterministically', () => {
  const result = interpretSemanticIntent('quero cheiro de CEO com energia old money');
  assert.ok(result.themes.includes('executive'));
  assert.ok(result.themes.includes('luxury'));
  assert.ok(result.confidence > 0.4);
});

test('scores abstract semantic matches and generates premium explanation', () => {
  const interpreted = interpretSemanticIntent('cheiro de homem rico e limpo');
  const scored = scoreSemanticMatch(product, interpreted);
  const explanation = createSemanticExplanation(product, interpreted, scored);
  assert.ok(scored.score > 0.25);
  assert.match(explanation, /perfil|assinatura/i);
});

test('hybrid olfactive search injects semantic tags and avoids hallucinated products', () => {
  const catalog = [product, { id: 'dark', name: 'Dark Resin', description: 'resinoso intenso noturno', vibe: ['dark'] }];
  const result = getOlfactiveRecommendations('perfume de vilão elegante', catalog, { limit: 2 });
  assert.ok(Array.isArray(result.semanticTags));
  assert.equal(result.products.every((item) => catalog.some((c) => c.id === item.id)), true);
});

test('layering and future preference hooks remain lightweight and deterministic', () => {
  const compatibility = semanticLayeringHooks.getCompatibilitySignals(product, { ...product, id: 'b' });
  assert.ok(compatibility.overlap >= 0);
  assert.ok(Array.isArray(semanticLayeringHooks.preferenceHooks.likedVibes));
});
