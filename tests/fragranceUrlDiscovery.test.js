import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { discoverFragranceUrls, parseSeedInput, rankGraphPriority } from '../scripts/ingestion/discoverFragranceUrls.js';

const tmp = 'data/imports/raw/test-seeds.txt';
fs.mkdirSync(path.dirname(tmp), { recursive: true });

test('parseSeedInput handles malformed/duplicate seed lines deterministically', () => {
  fs.writeFileSync(tmp, '# comment\nBleu de Chanel\n\nBleu de Chanel\n  Dior Sauvage  \n');
  const seeds = parseSeedInput(tmp);
  assert.deepEqual(seeds, ['Bleu de Chanel', 'Dior Sauvage']);
});

test('graph-priority selection returns higher scores for weak regions', () => {
  const score = rankGraphPriority('Bleu de Chanel', { 'Bleu de Chanel': { lowDensity: true, lowConfidence: true, missingWardrobe: true } });
  assert.equal(score, 5);
});

test('discovery output is idempotent shape with fallback + review flags', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url) => ({ ok: String(url).includes('search'), status: String(url).includes('blocked') ? 403 : 200 });
  fs.writeFileSync(tmp, 'Bleu de Chanel\nUnknown Placeholder\n');
  try {
    const { rows, snapshot } = await discoverFragranceUrls({ inputPath: tmp });
    assert.equal(Array.isArray(rows), true);
    assert.equal(rows.length, 2);
    rows.forEach((row) => assert.equal(row.status, 'needs_review'));
    assert.equal(snapshot.internalOnly, true);
    assert.equal(Array.isArray(snapshot.rawDiscoveryAttempts), true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('blocked source handling is graceful and preserved in snapshot', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 403 });
  fs.writeFileSync(tmp, 'Dior Sauvage\n');
  try {
    const { rows, snapshot } = await discoverFragranceUrls({ inputPath: tmp });
    assert.equal(rows[0].no_url_found, true);
    assert.equal(snapshot.blockedCandidates.length > 0, true);
  } finally {
    global.fetch = originalFetch;
  }
});

