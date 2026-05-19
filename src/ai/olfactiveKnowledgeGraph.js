import { generatePerfumeDNA } from './perfumeDNA.js';
import { normalizeSearchText } from '../utils/search.js';

const DEFAULT_CONFIDENCE = Object.freeze({ high: 0.8, inferred: 0.55, weak: 0.35 });

export const RELATIONSHIP_CONFIDENCE = Object.freeze({
  HIGH: 'highly_validated',
  INFERRED: 'inferred',
  WEAK: 'experimental',
  INCOMPLETE: 'incomplete',
});

export function normalizeSemanticTags(tags = []) {
  return [...new Set((Array.isArray(tags) ? tags : [tags])
    .map((tag) => normalizeSearchText(tag).replace(/[^\p{L}\p{N}\s]/gu, ' ').trim())
    .filter(Boolean))];
}

function overlap(a = [], b = []) {
  const as = new Set(normalizeSemanticTags(a));
  const bs = new Set(normalizeSemanticTags(b));
  if (!as.size || !bs.size) return 0;
  let shared = 0;
  as.forEach((item) => { if (bs.has(item)) shared += 1; });
  return shared / Math.max(as.size, bs.size);
}

function dnaSimilarity(a = {}, b = {}) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  if (!keys.length) return 0;
  const sum = keys.reduce((acc, key) => acc + (1 - Math.abs((a[key] ?? 0) - (b[key] ?? 0))), 0);
  return sum / keys.length;
}

export function scoreKnowledgeRelationship(a = {}, b = {}) {
  const dnaA = a.dna_vector ?? generatePerfumeDNA(a);
  const dnaB = b.dna_vector ?? generatePerfumeDNA(b);
  const score = (
    dnaSimilarity(dnaA, dnaB) * 0.4
    + overlap(a.accords, b.accords) * 0.2
    + overlap(a.vibeTags, b.vibeTags) * 0.2
    + overlap(a.occasionTags, b.occasionTags) * 0.1
    + overlap(a.weatherTags, b.weatherTags) * 0.1
  );

  const confidence = score >= DEFAULT_CONFIDENCE.high
    ? RELATIONSHIP_CONFIDENCE.HIGH
    : score >= DEFAULT_CONFIDENCE.inferred
      ? RELATIONSHIP_CONFIDENCE.INFERRED
      : score >= DEFAULT_CONFIDENCE.weak
        ? RELATIONSHIP_CONFIDENCE.WEAK
        : RELATIONSHIP_CONFIDENCE.INCOMPLETE;

  return Number(score.toFixed(4)) ? { score: Number(score.toFixed(4)), confidence } : { score: 0, confidence: RELATIONSHIP_CONFIDENCE.INCOMPLETE };
}

export function assignOlfactiveCluster(perfume = {}) {
  const tags = normalizeSemanticTags([perfume.family, ...(perfume.accords ?? []), ...(perfume.vibeTags ?? [])]);
  const has = (term) => tags.some((tag) => tag.includes(term));

  if (has('oud') || has('ambar') || has('resina')) return 'arabic_amber_intensity';
  if (has('azul') || has('aquatico')) return 'refined_blue_freshness';
  if (has('almiscar') || has('limpo')) return 'intimate_musks';
  if (has('couro') || has('defumado')) return 'dark_seductive_woods';
  if (has('citrico') || has('fresco')) return 'fresh_luxury';
  return 'niche_resinous_warmth';
}

export function buildOlfactiveKnowledgeGraph(perfumes = [], options = {}) {
  const limit = Number(options.neighborLimit ?? 8);
  const nodes = perfumes.map((perfume) => {
    const semanticTags = normalizeSemanticTags([
      ...(perfume.tags ?? []),
      ...(perfume.inspirations ?? []),
      ...(perfume.vibeTags ?? []),
      ...(perfume.occasionTags ?? []),
      ...(perfume.weatherTags ?? []),
    ]);

    return {
      id: perfume.id ?? perfume.productSlug ?? `${perfume.brand}-${perfume.name}`,
      status: perfume.status,
      name: perfume.name,
      brand: perfume.brand,
      cluster: assignOlfactiveCluster(perfume),
      semanticTags,
      wardrobeRoles: normalizeSemanticTags(perfume.occasionTags ?? []),
      confidence: perfume.status === 'semantic_only' ? RELATIONSHIP_CONFIDENCE.INFERRED : RELATIONSHIP_CONFIDENCE.HIGH,
      dna: perfume.dna_vector ?? generatePerfumeDNA(perfume),
      raw: perfume,
    };
  });

  const edges = new Map();
  nodes.forEach((nodeA, indexA) => {
    const rels = [];
    nodes.forEach((nodeB, indexB) => {
      if (indexA === indexB) return;
      const { score, confidence } = scoreKnowledgeRelationship(nodeA.raw, nodeB.raw);
      if (score < 0.3) return;
      rels.push({ to: nodeB.id, score, confidence, clusterContinuity: nodeA.cluster === nodeB.cluster });
    });
    edges.set(nodeA.id, rels.sort((a, b) => b.score - a.score).slice(0, limit));
  });

  return {
    generatedAt: new Date().toISOString(),
    totalNodes: nodes.length,
    totalSemanticOnly: nodes.filter((node) => node.status === 'semantic_only').length,
    nodes: nodes.map(({ raw, ...node }) => node),
    edges: Object.fromEntries(edges),
  };
}
