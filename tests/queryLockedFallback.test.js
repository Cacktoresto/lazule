import assert from 'node:assert/strict';
import test from 'node:test';

import { buildQueryLockedFallback } from '../src/ai/queryLockedFallback.js';
import { interpretUserIntent } from '../src/ai/semanticQueryUnderstanding.js';

const catalog = [
  { product: { name: 'Acqua di Gio', description: 'aquatic marine ozonic blue fresh sea breeze summer citrus' } },
  { product: { name: 'Ocean Air', description: 'aquatic marine salty blue fresh beach summer' } },
  { product: { name: 'Vanilla Amber', description: 'sweet vanilla gourmand creamy amber' } },
  { product: { name: 'Leather Smoke', description: 'leathery smoky tobacco dark resinous' } },
  { product: { name: 'Soap Musk', description: 'clean fresh musk soap airy citrus post bath' } },
  { product: { name: 'Office Woods', description: 'office executive fresh clean luxury woody moderate projection' } },
  { product: { name: 'Club Beast', description: 'loud high projection seductive night sweet attention clubbing' } },
];

const queries = ['mar', 'oceano', 'banho', 'limpo', 'doce', 'baunilha', 'especiado', 'quente', 'couro', 'fumaça', 'floral', 'atalcado', 'musk', 'pele', 'confortável', 'tropical', 'praia', 'balada', 'presença', 'trabalho', 'escritório', 'elegante', 'homem rico', 'sexy', 'inverno', 'verão'];

test('query locked fallback preserves semantic intent globally', () => {
  queries.forEach((query) => {
    const interpreted = interpretUserIntent(query);
    const result = buildQueryLockedFallback(catalog, {
      query,
      semanticEntity: interpreted.semanticEntity,
      intentTypes: interpreted.intentTypes,
      primarySignals: interpreted.matchedSignals.filter((s) => s.strength === 'primary'),
      secondarySignals: interpreted.matchedSignals.filter((s) => s.strength === 'secondary'),
      hintSignals: interpreted.matchedSignals.filter((s) => s.strength === 'hint'),
      negativeSignals: interpreted.matchedSignals.filter((s) => s.strength === 'negative'),
      confidence: interpreted.confidence,
      ambiguity: interpreted.ambiguity,
      activatedFamilies: interpreted.activatedFamilies,
    }, { minRelevance: 0.18 });

    if (result.ranked.length) {
      assert.ok(result.ranked[0].fallbackScore >= 0.18);
      assert.ok(typeof result.ranked[0].reason === 'string');
      assert.ok(Array.isArray(result.ranked[0].trace.negativeConflicts));
      assert.ok(['strong_match', 'adjacent_match'].includes(result.ranked[0].relevanceTier));
    } else {
      assert.equal(result.honestEmptyState, true);
    }
  });
});

function buildFromQuery(query) {
  const interpreted = interpretUserIntent(query);
  return buildQueryLockedFallback(catalog, {
    query,
    semanticEntity: interpreted.semanticEntity,
    intentTypes: interpreted.intentTypes,
    primarySignals: interpreted.matchedSignals.filter((s) => s.strength === 'primary'),
    secondarySignals: interpreted.matchedSignals.filter((s) => s.strength === 'secondary'),
    hintSignals: interpreted.matchedSignals.filter((s) => s.strength === 'hint'),
    negativeSignals: interpreted.matchedSignals.filter((s) => s.strength === 'negative'),
    confidence: interpreted.confidence,
    ambiguity: interpreted.ambiguity,
    activatedFamilies: interpreted.activatedFamilies,
  }, { minRelevance: 0.18 });
}

test('mar should not return empty when aquatic candidates exist and should include Acqua di Gio', () => {
  const result = buildFromQuery('mar');
  assert.equal(result.honestEmptyState, false);
  assert.ok(result.ranked.some((entry) => entry.product.name === 'Acqua di Gio'));
  assert.ok(result.ranked.every((entry) => ['strong_match', 'adjacent_match'].includes(entry.relevanceTier)));
});

test('oceano prioritizes aquatic marine ozonic profile', () => {
  const result = buildFromQuery('oceano');
  assert.ok(result.ranked.length >= 1);
  assert.equal(result.ranked[0].product.name, 'Acqua di Gio');
  assert.equal(result.ranked[0].relevanceTier, 'strong_match');
});

test('doce should return gourmand before generic fresh', () => {
  const result = buildFromQuery('doce');
  assert.ok(result.ranked.length >= 1);
  assert.equal(result.ranked[0].product.name, 'Vanilla Amber');
});

test('banho should return clean/musk profile before generic luxury', () => {
  const result = buildFromQuery('banho');
  assert.ok(result.ranked.length >= 1);
  assert.ok(result.ranked.some((entry) => entry.product.name === 'Soap Musk'));
});

test('balada should return projection/night presence profile', () => {
  const result = buildFromQuery('balada');
  assert.ok(result.ranked.length >= 1);
  assert.equal(result.ranked[0].product.name, 'Club Beast');
});

test('trabalho should return executive/clean profile', () => {
  const result = buildFromQuery('trabalho');
  assert.ok(result.ranked.length >= 1);
  assert.equal(result.ranked[0].product.name, 'Office Woods');
});

test('strong negative conflicts should be filtered out of UI results', () => {
  const result = buildFromQuery('mar');
  assert.ok(!result.ranked.some((entry) => entry.product.name === 'Leather Smoke'));
});
