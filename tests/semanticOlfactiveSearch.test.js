import assert from 'node:assert/strict';
import test from 'node:test';

import { createSemanticExplanation, getSemanticAnalyticsTags, interpretSemanticIntent, resetSemanticSessionProfile, scoreSemanticMatch } from '../src/ai/semanticOlfactiveSearch.js';

const marineProduct = { name: 'Ocean Executive', description: 'marine aquatic salty fresh clean luxo discreto para escritorio', accords: ['marine', 'aquatic'], vibeTags: ['clean', 'airy'], weatherTags: ['hot'], occasions: ['office'] };
const sweetNightProduct = { name: 'Amber Night', description: 'vanilla amber warm spicy sedutor sofisticado noite', accords: ['amber', 'vanilla'], vibeTags: ['sensual', 'night'], weatherTags: ['cold'], occasions: ['night'] };

test('semantic interpreter maps metaphor and PT-BR slang deterministically', () => {
  resetSemanticSessionProfile();
  const interpretation = interpretSemanticIntent('cheiro de oceano');
  assert.ok(interpretation.accords.includes('marine'));
  assert.ok(interpretation.vibes.includes('airy'));
  assert.equal(interpretation.confidence, 'high');

  const slang = interpretSemanticIntent('cheiro de patrão');
  assert.ok(slang.vibes.includes('executive'));
});

test('weighted semantic retrieval protects against drift', () => {
  const interpreted = interpretSemanticIntent('perfume executivo');
  const good = scoreSemanticMatch(marineProduct, interpreted);
  const bad = scoreSemanticMatch(sweetNightProduct, interpreted);
  assert.ok(good.score > bad.score);
});

test('session continuity increases aligned direction', () => {
  resetSemanticSessionProfile();
  interpretSemanticIntent('escritorio');
  const second = interpretSemanticIntent('cheiro limpo');
  const scored = scoreSemanticMatch(marineProduct, second);
  assert.ok(scored.breakdown.continuityBoost > 0);
});

test('semantic engine never returns empty atmospheric recommendation state', () => {
  const interpreted = interpretSemanticIntent('perfume sedutor doce');
  const scored = scoreSemanticMatch(sweetNightProduct, interpreted);
  const explanation = createSemanticExplanation(sweetNightProduct, interpreted, scored);
  const tags = getSemanticAnalyticsTags(interpreted);
  assert.ok(explanation.length > 25);
  assert.ok(tags.length > 0);
});
