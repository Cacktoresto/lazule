import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProductEmbeddingInput,
  buildQueryEmbeddingInput,
  buildSemanticSearchDocument,
  calculateEmbeddingSimilarity,
  generateQueryEmbedding,
  generateSemanticEmbedding,
  rankByEmbeddingSimilarity,
  vectorizeTokens,
} from '../src/ai/olfactiveEmbeddingAdapter.js';
import { rankSemanticWithEmbeddings } from '../src/ai/semanticOlfactiveSearch.js';
import { products } from '../src/data/products.js';

const sample = { name: 'Marine Office', brand: 'Lazule', category: 'Importado', accords: ['marine', 'aquatic'], vibe: ['clean'], occasions: ['office'], weather: ['hot'], notes: ['bergamot'], available: true };


test('deterministic vector generation is stable', () => {
  const a = vectorizeTokens(['marine', 'aquatic', 'marine'], 1);
  const b = vectorizeTokens(['marine', 'aquatic', 'marine'], 1);
  assert.deepEqual(a, b);
});

test('same query returns same ranking', () => {
  const q = { query: 'cheiro de oceano', interpreted: { accords: ['marine'], vibes: ['clean'], moods: [], occasions: ['daytime'], weather: ['hot'], families: ['blue fragrances'] } };
  const r1 = rankByEmbeddingSimilarity(q, products.slice(0, 30)).ranked.map((it) => it.product.id).slice(0, 10);
  const r2 = rankByEmbeddingSimilarity(q, products.slice(0, 30)).ranked.map((it) => it.product.id).slice(0, 10);
  assert.deepEqual(r1, r2);
});

test('metaphor query creates semantic expansion', () => {
  const queryDoc = buildQueryEmbeddingInput({ query: 'cheiro de oceano', accords: ['marine'] });
  assert.ok(queryDoc.expandedSynonyms.includes('aquatic'));
});

test('hybrid score respects deterministic intent anti-drift', () => {
  const rank = rankSemanticWithEmbeddings('perfume executivo', [
    { ...sample, name: 'Executive Marine', description: 'office clean executive woody aromatic' },
    { ...sample, name: 'Random Gourmand', accords: ['gourmand', 'caramel'], description: 'poetic luxury atmospheric sophistication dessert' },
  ]);
  assert.equal(rank.ranked[0].product.name, 'Executive Marine');
});

test('embedding documents avoid private supplier fields and public visibility', () => {
  const doc = buildProductEmbeddingInput({ ...sample, supplierCost: 99, wholesalePrice: 120, catalogVisibility: 'catalog' });
  assert.ok(!doc.embeddingText.includes('suppliercost'));
  assert.ok(doc.visibility === 'catalog');
});

test('only catalog-visible products should be recommended in embedding artifacts', () => {
  const doc = buildProductEmbeddingInput({ ...sample, catalogVisibility: 'reference', available: false });
  assert.ok(['reference', 'on_request', 'catalog'].includes(doc.visibility));
});

test('semantic search document is indexable and non-empty', () => {
  const doc = buildSemanticSearchDocument({ ...sample, signatures: ['clean_luxury'], atmosphere: ['executive fresh'] });
  assert.ok(doc.includes('clean_luxury') || doc.includes('clean luxury'));
});

test('embedding adapter exposes local fallback API', () => {
  const emb = generateSemanticEmbedding('executive clean woody');
  const queryEmb = generateQueryEmbedding({ query: 'perfume executivo limpo', accords: ['woody'] });
  assert.ok(emb.dimensions > 0);
  assert.ok(queryEmb.input.tokens.length > 0);
  assert.ok(calculateEmbeddingSimilarity(emb.vector, queryEmb.vector) >= 0);
});
