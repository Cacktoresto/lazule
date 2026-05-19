import assert from 'node:assert/strict';
import test from 'node:test';

import { buildOlfactiveKnowledgeGraph, normalizeSemanticTags, scoreKnowledgeRelationship } from '../src/ai/olfactiveKnowledgeGraph.js';
import { enrichReferencePerfumes } from '../src/data/referencePerfumeEnrichment.js';
import { filterMainCatalogExposure } from '../src/data/referenceCatalog.js';

const base = {
  name: 'Graph Musk', brand: 'LZ', status: 'semantic_only', catalogType: 'Referência', gender: 'Unissex', concentration: 'EDP',
  notes: ['almíscar', 'cedro'], accords: ['limpo', 'amadeirado'], family: 'amadeirado almiscarado',
  vibeTags: ['sofisticado'], occasionTags: ['trabalho'], weatherTags: ['ameno'], similarTo: [], inspirations: [],
};

test('semantic_only stays hidden from main catalog but present in knowledge graph', () => {
  const [semantic] = enrichReferencePerfumes([base]);
  assert.equal(semantic.status, 'semantic_only');
  assert.equal(filterMainCatalogExposure([semantic]).length, 0);
  const graph = buildOlfactiveKnowledgeGraph([semantic]);
  assert.equal(graph.totalSemanticOnly, 1);
});

test('semantic tags normalize noise deterministically', () => {
  assert.deepEqual(normalizeSemanticTags(['  Azul Moderno ', 'azul moderno', 'Azul-moderno!']), ['azul moderno']);
});

test('graph relationship scoring and clustering are deterministic', () => {
  const [a, b] = enrichReferencePerfumes([
    { ...base, status: 'reference_only', name: 'Blue Executive', accords: ['fresco', 'azul'], vibeTags: ['executivo'] },
    { ...base, status: 'reference_only', name: 'Blue Executive Intense', accords: ['fresco', 'azul'], vibeTags: ['executivo'] },
  ]);
  const rel = scoreKnowledgeRelationship(a, b);
  assert.ok(rel.score >= 0.55);
  const graph = buildOlfactiveKnowledgeGraph([a, b]);
  assert.equal(graph.edges[a.id][0].to, b.id);
  assert.equal(graph.edges[a.id][0].score, scoreKnowledgeRelationship(a, b).score);
});
