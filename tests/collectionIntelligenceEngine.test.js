import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCollectionWardrobe, COLLECTION_STATES } from '../src/ai/collectionIntelligenceEngine.js';

const product = (name, vibe = [], occasions = []) => ({ name, vibe, occasions, productSlug: name.toLowerCase().replaceAll(' ', '-') });

test('analyzeCollectionWardrobe detects redundancy and gaps deterministically', () => {
  const entries = [
    { product: product('Bleu', ['fresco', 'limpo', 'executivo'], ['trabalho']), state: COLLECTION_STATES.owned },
    { product: product('Sauvage', ['fresco', 'azul'], ['trabalho']), state: COLLECTION_STATES.dailySignature },
    { product: product('Y EDP', ['fresco'], ['trabalho']), state: COLLECTION_STATES.seasonalFavorite },
  ];
  const first = analyzeCollectionWardrobe(entries);
  const second = analyzeCollectionWardrobe(entries);
  assert.deepEqual(first, second);
  assert.equal(first.profileCounts.fresh >= 3, true);
  assert.equal(first.gaps.includes('missing_warm'), true);
  assert.match(first.feelLike, /coleção transmite/i);
});
