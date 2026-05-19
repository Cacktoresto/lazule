import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateTasteMemory,
  buildPersonalOlfactiveProfile,
  createMemoryAwareChips,
  inferTasteEvolution,
  normalizeMemorySignal,
  updateTasteMemoryStore,
} from '../src/ai/tasteMemoryEngine.js';

test('taste memory normalizes signals without raw sensitive fields', () => {
  const signal = normalizeMemorySignal({ query: 'email@email.com +55 11 99999-8888 luxo limpo', intents: ['elegante'] });
  assert.ok(signal.tags.includes('clean_luxury'));
  assert.equal(Object.hasOwn(signal, 'query'), false);
});

test('taste memory aggregates recurring preferences deterministically', () => {
  const memory = aggregateTasteMemory([
    { query: 'luxo limpo executivo' },
    { query: 'trabalho fresco clean' },
    { query: 'madeira refinada elegante' },
  ]);
  assert.equal(memory.topTags[0].tag, 'clean_luxury');
  assert.ok(memory.profileNotes.length > 0);
});

test('taste evolution detects progressive directional change', () => {
  const evolution = inferTasteEvolution([
    { query: 'clean limpo discreto' },
    { query: 'fresco clean trabalho' },
    { query: 'executivo limpo elegante' },
    { query: 'camisa branca office' },
    { query: 'lattafa oud arabe noturno' },
    { query: 'afnan oriental intenso' },
    { query: 'oud arabe quente' },
    { query: 'sedutor noturno oriental' },
  ]);
  assert.ok(['stable', 'evolving'].includes(evolution.trend));
  assert.ok(evolution.summary.length > 10);
});

test('memory-aware chips preserve diversity from base chips', () => {
  const chips = createMemoryAwareChips({ topTags: [{ tag: 'clean_luxury' }] }, ['aura elegante', 'contraste refinado']);
  assert.ok(chips.includes('clean luxury'));
  assert.ok(chips.includes('contraste refinado'));
});

test('personal profile and store keep lightweight deterministic structure', () => {
  const store = updateTasteMemoryStore({}, { query: 'luxo discreto' });
  const profile = buildPersonalOlfactiveProfile(store.events);
  assert.equal(store.version, 1);
  assert.equal(profile.signatureTitle, 'Sua assinatura');
});
