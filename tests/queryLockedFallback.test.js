import assert from 'node:assert/strict';
import test from 'node:test';

import { buildQueryLockedFallback } from '../src/ai/queryLockedFallback.js';
import { interpretUserIntent } from '../src/ai/semanticQueryUnderstanding.js';

const catalog = [
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
    }, { minRelevance: 0.24 });

    if (result.ranked.length) {
      assert.ok(result.ranked[0].fallbackScore >= 0.24);
      assert.ok(typeof result.ranked[0].reason === 'string');
      assert.ok(Array.isArray(result.ranked[0].trace.negativeConflicts));
    } else {
      assert.equal(result.honestEmptyState, true);
    }
  });
});
