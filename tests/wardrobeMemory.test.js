import test from 'node:test';
import assert from 'node:assert/strict';
import { saveWardrobeEntry, loadWardrobeMemory } from '../src/utils/wardrobeMemory.js';

function createStorage() {
  const mem = new Map();
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
}

test('saveWardrobeEntry persists lightweight entries', () => {
  const memory = { entries: [] };
  const next = saveWardrobeEntry(memory, { productSlug: 'bleu', name: 'Bleu' }, 'owned');
  assert.equal(next.entries.length, 1);
  assert.equal(next.entries[0].state, 'owned');
});

test('loadWardrobeMemory provides safe defaults', () => {
  const storage = createStorage();
  const state = loadWardrobeMemory(storage);
  assert.deepEqual(state, { entries: [], favorites: [], inspirations: [] });
});
