import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseInputRecords, normalizeFragranceEntry, enrichFragranceSemanticData,
  validateKnowledgeEntries, buildKnowledgeGraphArtifacts, computeKnowledgeConfidence,
} from '../src/ai/knowledgeIngestionPipeline.js';

test('supports CSV JSON NDJSON parsing', () => {
  assert.equal(parseInputRecords('{"name":"A"}', 'json').name, 'A');
  assert.equal(parseInputRecords('{"name":"A"}\n{"name":"B"}', 'ndjson').length, 2);
  assert.equal(parseInputRecords('name,brand\nA,X', 'csv')[0].brand, 'X');
});

test('normalization reduces duplicates and aliases', () => {
  const a = normalizeFragranceEntry({ name: 'Bleu De Chanel', brand: 'CHANEL PARFUMS', notes: 'bergamot,oudh', accords: 'citrico', semanticTags: 'luxo' });
  const b = normalizeFragranceEntry({ name: 'BDC', brand: 'chanel', notes: 'bergamot,oud', accords: 'citrico', semanticTags: 'luxo' });
  assert.equal(a.slug, b.slug);
  assert.ok(a.notes.includes('bergamota'));
});

test('enrichment is deterministic and confidence generated', () => {
  const n = normalizeFragranceEntry({ name: 'X', brand: 'Y', notes: 'a,b,c', accords: 'd,e,f', curationState: 'approved', semanticTags: 'a,b,c' });
  const e1 = enrichFragranceSemanticData(n);
  const e2 = enrichFragranceSemanticData(n);
  assert.deepEqual(e1.semanticDescriptions, e2.semanticDescriptions);
  assert.ok(['highly_validated', 'inferred', 'experimental', 'incomplete'].includes(computeKnowledgeConfidence(e1)));
});

test('validation catches malformed and semantic-only visibility behavior', () => {
  const ok = enrichFragranceSemanticData(normalizeFragranceEntry({ name: 'A', brand: 'B', notes: 'n1,n2,n3', accords: 'a1,a2', semanticTags: 'x,y,z', curationState: 'approved', status: 'semantic_only', knowledgeVisibility: 'internal' }));
  const bad = { ...ok, slug: ok.slug, id: null, semanticTags: [] };
  const result = validateKnowledgeEntries([ok, bad]);
  assert.equal(result.ok, false);
});

test('graph build is stable and idempotent', () => {
  const base = [
    { name: 'A', brand: 'B', notes: 'n1,n2,n3', accords: 'fresh,woody', semanticTags: 'clean,day,office', curationState: 'approved', status: 'in_stock', knowledgeVisibility: 'public' },
    { name: 'C', brand: 'D', notes: 'n1,n4,n5', accords: 'fresh,musk', semanticTags: 'clean,night,office', curationState: 'approved', status: 'semantic_only', knowledgeVisibility: 'internal' },
  ].map(normalizeFragranceEntry).map(enrichFragranceSemanticData);
  const a1 = buildKnowledgeGraphArtifacts(base);
  const a2 = buildKnowledgeGraphArtifacts(base);
  assert.deepEqual(a1.graph.nodes, a2.graph.nodes);
  assert.equal(a1.semanticOnlyIds.length, 1);
});
