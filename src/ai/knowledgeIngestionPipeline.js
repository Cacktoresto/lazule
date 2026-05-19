import fs from 'node:fs';
import path from 'node:path';
import { generatePerfumeDNA, getDominantDNA } from './perfumeDNA.js';
import { assignOlfactiveCluster, buildOlfactiveKnowledgeGraph, normalizeSemanticTags, scoreKnowledgeRelationship, RELATIONSHIP_CONFIDENCE } from './olfactiveKnowledgeGraph.js';
import { createProductSlug } from '../utils/productRouting.js';

const DEFAULTS = Object.freeze({
  genderDirection: 'unisex',
  concentration: 'eau de parfum',
  knowledgeVisibility: 'internal',
  status: 'staged',
  curationState: 'needs_review',
});

const BRAND_ALIASES = new Map([
  ['chanel parfums', 'Chanel'], ['chanel', 'Chanel'],
]);

const NOTE_ALIASES = new Map([
  ['bergamot', 'bergamota'], ['ambergris', 'ambar cinza'], ['oudh', 'oud'],
]);

const NAME_ALIASES = new Map([['bdc', 'bleu de chanel']]);
const CONTRADICTORY_VIBE_PAIRS = [['minimalista', 'barroco'], ['intimo', 'projecao alta']];

function unique(values = []) { return [...new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))]; }
function normalizeText(v = '') { return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function splitArray(v) { return Array.isArray(v) ? v : String(v ?? '').split(/[|,;]+/); }

export function parseInputRecords(inputText, format) {
  if (format === 'json') return JSON.parse(inputText);
  if (format === 'ndjson') return inputText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
  if (format === 'csv') {
    const lines = inputText.split('\n').map((l) => l.trim()).filter(Boolean);
    const headers = lines.shift().split(',').map((h) => h.trim());
    return lines.map((line) => {
      const cols = line.split(',');
      return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
    });
  }
  throw new Error(`Unsupported format: ${format}`);
}

export function normalizeFragranceEntry(raw = {}) {
  const baseName = normalizeText(raw.name);
  const canonicalName = NAME_ALIASES.get(baseName) ?? baseName;
  const name = canonicalName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const brandNorm = normalizeText(raw.brand);
  const brand = BRAND_ALIASES.get(brandNorm) ?? String(raw.brand ?? '').trim();
  const notes = unique(splitArray(raw.notes).map((n) => NOTE_ALIASES.get(normalizeText(n)) ?? normalizeText(n)));
  const accords = unique(splitArray(raw.accords).map((n) => normalizeText(n)));
  const semanticAliases = unique([raw.name, ...(splitArray(raw.semanticAliases))].map((v) => normalizeText(v)));

  const canonical = {
    id: raw.id ?? `kg-${createProductSlug(`${brand} ${name}`)}`,
    slug: createProductSlug(`${brand} ${name}`),
    name,
    brand,
    releaseYear: raw.releaseYear ? Number(raw.releaseYear) : null,
    perfumer: raw.perfumer ?? null,
    fragranceFamily: raw.fragranceFamily ?? raw.family ?? null,
    notes,
    accords,
    concentration: String(raw.concentration ?? DEFAULTS.concentration).toLowerCase(),
    genderDirection: normalizeText(raw.genderDirection ?? raw.gender ?? DEFAULTS.genderDirection),
    semanticTags: normalizeSemanticTags([...(splitArray(raw.semanticTags)), ...notes, ...accords, raw.fragranceFamily]),
    dna_vector: raw.dna_vector ?? generatePerfumeDNA({
      name, brand, family: raw.fragranceFamily, accords, notes, vibe: splitArray(raw.vibes),
    }),
    dominantDNA: [],
    vibes: unique(splitArray(raw.vibes).map(normalizeText)),
    weatherTags: unique(splitArray(raw.weatherTags).map(normalizeText)),
    occasionTags: unique(splitArray(raw.occasionTags).map(normalizeText)),
    projectionProfile: normalizeText(raw.projectionProfile ?? raw.projectionLabel ?? 'moderada'),
    performanceProfile: normalizeText(raw.performanceProfile ?? raw.performanceLabel ?? 'moderada'),
    wardrobeRole: normalizeText(raw.wardrobeRole ?? 'signature-versatile'),
    olfactiveCluster: null,
    relationshipHints: unique(splitArray(raw.relationshipHints)),
    inspirations: unique(splitArray(raw.inspirations).map(normalizeText)),
    semanticAliases,
    semanticDescriptions: raw.semanticDescriptions ?? {},
    knowledgeConfidence: 'incomplete',
    knowledgeVisibility: raw.knowledgeVisibility ?? DEFAULTS.knowledgeVisibility,
    status: raw.status ?? DEFAULTS.status,
    curationState: raw.curationState ?? DEFAULTS.curationState,
    source: raw.source ?? 'manual_import',
    embeddingReady: { vectorKey: null, provider: null, indexed: false },
  };
  canonical.dominantDNA = getDominantDNA(canonical.dna_vector, { threshold: 0.35, limit: 5 });
  canonical.olfactiveCluster = assignOlfactiveCluster({ family: canonical.fragranceFamily, accords: canonical.accords, vibeTags: canonical.vibes });
  return canonical;
}

export function enrichFragranceSemanticData(entry = {}) {
  const descriptor = entry.accords.slice(0, 3).join(', ') || 'textura refinada';
  const aura = entry.vibes.slice(0, 2).join(' e ') || 'presença serena';
  return {
    ...entry,
    semanticDescriptions: {
      editorial: `${entry.name} apresenta um perfil ${descriptor}, com construção limpa e acabamento de luxo discreto.`,
      summary: `${entry.brand} · ${entry.fragranceFamily ?? 'assinatura contemporânea'} · ${aura}.`,
      aura: `Aura ${aura}, adequada para ${entry.occasionTags[0] ?? 'uso versátil'}.`,
      wardrobe: `Posicionamento de guarda-roupa: ${entry.wardrobeRole}.`,
      emotionalIdentity: entry.vibes.slice(0, 3),
      archetype: entry.olfactiveCluster,
      personalitySignature: `${entry.projectionProfile}-${entry.performanceProfile}`,
    },
  };
}

export function computeKnowledgeConfidence(entry = {}) {
  const structuredScore = [entry.name, entry.brand, entry.notes?.length, entry.accords?.length, entry.releaseYear].filter(Boolean).length;
  const enrichmentScore = Object.values(entry.semanticDescriptions ?? {}).filter(Boolean).length;
  if (structuredScore >= 5 && enrichmentScore >= 5 && entry.curationState === 'approved') return 'highly_validated';
  if (structuredScore >= 4 && enrichmentScore >= 4) return 'inferred';
  if (structuredScore >= 3) return 'experimental';
  return 'incomplete';
}

export function validateKnowledgeEntries(entries = []) {
  const errors = [];
  const seen = new Set();
  entries.forEach((entry) => {
    if (!entry.id || !entry.slug || !entry.name || !entry.brand) errors.push(`${entry.id ?? 'unknown'} missing critical fields`);
    if (seen.has(entry.slug)) errors.push(`${entry.slug} duplicate graph node`);
    seen.add(entry.slug);
    if (!Array.isArray(entry.semanticTags) || entry.semanticTags.length < 3) errors.push(`${entry.slug} weak semantic tagging`);
    if (!entry.dna_vector || typeof entry.dna_vector !== 'object') errors.push(`${entry.slug} malformed DNA vector`);
    if (!['approved', 'needs_review', 'rejected'].includes(entry.curationState)) errors.push(`${entry.slug} invalid curationState`);
    if (!['public', 'internal'].includes(entry.knowledgeVisibility)) errors.push(`${entry.slug} invalid knowledgeVisibility`);
    if (CONTRADICTORY_VIBE_PAIRS.some(([a, b]) => entry.vibes.includes(a) && entry.vibes.includes(b))) errors.push(`${entry.slug} contradictory vibes`);
  });
  return { ok: errors.length === 0, errors };
}

export function buildKnowledgeGraphArtifacts(entries = [], options = {}) {
  const approved = entries.filter((e) => e.curationState === 'approved' && e.status !== 'rejected');
  const enriched = approved.map((e) => ({ ...e, knowledgeConfidence: computeKnowledgeConfidence(e) }));
  const graph = buildOlfactiveKnowledgeGraph(enriched.map((e) => ({
    ...e,
    family: e.fragranceFamily,
    vibeTags: e.vibes,
  })), { neighborLimit: options.neighborLimit ?? 8 });

  const relationships = {};
  enriched.forEach((a) => {
    relationships[a.id] = enriched.filter((b) => b.id !== a.id).map((b) => ({ to: b.id, ...scoreKnowledgeRelationship(a, b) })).filter((r) => r.score >= 0.3);
  });

  const metrics = {
    totalImported: entries.length,
    totalApproved: approved.length,
    confidenceDistribution: enriched.reduce((acc, e) => ({ ...acc, [e.knowledgeConfidence]: (acc[e.knowledgeConfidence] ?? 0) + 1 }), {}),
    clusterDistribution: enriched.reduce((acc, e) => ({ ...acc, [e.olfactiveCluster]: (acc[e.olfactiveCluster] ?? 0) + 1 }), {}),
  };

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: '7.5.0',
    embeddingReadiness: { enabled: false, strategy: 'vector-slot-reserved' },
    visibleCatalogIds: enriched.filter((e) => e.knowledgeVisibility === 'public').map((e) => e.id),
    semanticOnlyIds: enriched.filter((e) => e.status === 'semantic_only' || e.knowledgeVisibility === 'internal').map((e) => e.id),
    graph,
    relationships,
    metrics,
  };
}

export function runIngestionPipeline({ inputPath, format, outDir }) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const parsed = parseInputRecords(raw, format);
  const normalized = parsed.map(normalizeFragranceEntry);
  const enriched = normalized.map(enrichFragranceSemanticData).map((e) => ({ ...e, knowledgeConfidence: computeKnowledgeConfidence(e) }));
  const validation = validateKnowledgeEntries(enriched);
  if (!validation.ok) throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
  const artifact = buildKnowledgeGraphArtifacts(enriched);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'normalized.json'), JSON.stringify(normalized, null, 2));
  fs.writeFileSync(path.join(outDir, 'enriched.json'), JSON.stringify(enriched, null, 2));
  fs.writeFileSync(path.join(outDir, 'knowledge-graph.json'), JSON.stringify(artifact, null, 2));
  return { normalized, enriched, artifact };
}
