import assert from 'node:assert/strict';
import test from 'node:test';

import { rankWithHumanDiscoveryIntelligence } from '../src/ai/humanDiscoveryRankingEngine.js';

const officeClean = {
  name: 'Clean Executive',
  description: 'perfume limpo versatil discreto office assinatura executiva',
  notes: ['citrus', 'musk'],
  occasions: ['office'],
  vibe: ['clean'],
  discoveryScore: 0.45,
  saturationScore: 0.3,
};

const woodyGeneric = {
  name: 'Woody Generic',
  description: 'amadeirado perfume top bom fragrancia',
  notes: Array.from({ length: 20 }, (_, i) => `note-${i}`),
  keywords: Array.from({ length: 25 }, (_, i) => `kw-${i}`),
  discoveryScore: 0.4,
  saturationScore: 0.6,
};

test('human engine favors social/contextual office fit over generic woody match', () => {
  const ranked = rankWithHumanDiscoveryIntelligence([
    { product: woodyGeneric, dnaSimilarity: 0.86 },
    { product: officeClean, dnaSimilarity: 0.78 },
  ], {
    query: 'perfume de trabalho',
    context: { period: 'dia', weather: 'calor' },
  });

  assert.equal(ranked[0].product.name, 'Clean Executive');
  assert.ok(ranked[0].humanDiscovery.contextualBoosts.socialFit > ranked[1].humanDiscovery.contextualBoosts.socialFit);
});

test('human engine computes confidence and anti-generic penalties', () => {
  const [entry] = rankWithHumanDiscoveryIntelligence([{ product: woodyGeneric, dnaSimilarity: 0.7 }], {
    query: 'cheiro caro',
  });

  assert.ok(entry.humanDiscovery.confidenceScore >= 0);
  assert.ok(entry.humanDiscovery.editorialConfidence >= 0);
  assert.ok(entry.humanDiscovery.antiGenericPenalty > 0);
  assert.match(entry.humanDiscovery.fallbackStage, /high_precision|balanced|fallback_expanded/);
});
