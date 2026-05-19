import fs from 'node:fs';
import path from 'node:path';
import { generatePerfumeDNA, getDominantDNA } from './perfumeDNA.js';
import { assignOlfactiveCluster, buildOlfactiveKnowledgeGraph, normalizeSemanticTags, scoreKnowledgeRelationship } from './olfactiveKnowledgeGraph.js';
import { createProductSlug } from '../utils/productRouting.js';

const DEFAULTS = Object.freeze({ genderDirection: 'unisex', concentration: 'eau de parfum', knowledgeVisibility: 'internal', status: 'staged', curationState: 'needs_review' });
const BRAND_ALIASES = new Map([['chanel parfums', 'Chanel'], ['chanel', 'Chanel']]);
const NOTE_ALIASES = new Map([['bergamot', 'bergamota'], ['ambergris', 'ambar cinza'], ['oudh', 'oud']]);
const NAME_ALIASES = new Map([['bdc', 'bleu de chanel']]);
const CONTRADICTORY_VIBE_PAIRS = [['minimalista', 'barroco'], ['intimo', 'projecao alta']];
const REPUTATION_LEVELS = ['trusted', 'acceptable', 'weak', 'noisy'];

const unique = (values = []) => [...new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))];
const normalizeText = (v = '') => String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const splitArray = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[|,;]+/));

export function parseInputRecords(inputText, format) { if (format === 'json') return JSON.parse(inputText); if (format === 'ndjson') return inputText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l)); if (format === 'csv') { const lines = inputText.split('\n').map((l) => l.trim()).filter(Boolean); const headers = lines.shift().split(',').map((h) => h.trim()); return lines.map((line) => { const cols = line.split(','); return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ''])); }); } throw new Error(`Unsupported format: ${format}`); }

export function normalizeFragranceEntry(raw = {}) {
  const baseName = normalizeText(raw.name);
  const canonicalName = NAME_ALIASES.get(baseName) ?? baseName;
  const name = canonicalName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const brandNorm = normalizeText(raw.brand);
  const brand = BRAND_ALIASES.get(brandNorm) ?? String(raw.brand ?? '').trim();
  const notes = unique(splitArray(raw.notes).map((n) => NOTE_ALIASES.get(normalizeText(n)) ?? normalizeText(n)));
  const accords = unique(splitArray(raw.accords).map((n) => normalizeText(n)));
  const semanticAliases = unique([raw.name, ...(splitArray(raw.semanticAliases))].map((v) => normalizeText(v)));
  const sourceStats = raw.sourceStats ?? {};

  const canonical = { id: raw.id ?? `kg-${createProductSlug(`${brand} ${name}`)}`, slug: createProductSlug(`${brand} ${name}`), name, brand, releaseYear: raw.releaseYear ? Number(raw.releaseYear) : null, perfumer: raw.perfumer ?? null, fragranceFamily: raw.fragranceFamily ?? raw.family ?? null, notes, accords, concentration: String(raw.concentration ?? DEFAULTS.concentration).toLowerCase(), genderDirection: normalizeText(raw.genderDirection ?? raw.gender ?? DEFAULTS.genderDirection), semanticTags: normalizeSemanticTags([...(splitArray(raw.semanticTags)), ...notes, ...accords, raw.fragranceFamily]), dna_vector: raw.dna_vector ?? generatePerfumeDNA({ name, brand, family: raw.fragranceFamily, accords, notes, vibe: splitArray(raw.vibes) }), dominantDNA: [], vibes: unique(splitArray(raw.vibes).map(normalizeText)), weatherTags: unique(splitArray(raw.weatherTags).map(normalizeText)), occasionTags: unique(splitArray(raw.occasionTags).map(normalizeText)), projectionProfile: normalizeText(raw.projectionProfile ?? raw.projectionLabel ?? 'moderada'), performanceProfile: normalizeText(raw.performanceProfile ?? raw.performanceLabel ?? 'moderada'), wardrobeRole: normalizeText(raw.wardrobeRole ?? 'signature-versatile'), olfactiveCluster: null, relationshipHints: unique(splitArray(raw.relationshipHints)), inspirations: unique(splitArray(raw.inspirations).map(normalizeText)), semanticAliases, semanticDescriptions: raw.semanticDescriptions ?? {}, knowledgeConfidence: 'incomplete', knowledgeVisibility: raw.knowledgeVisibility ?? DEFAULTS.knowledgeVisibility, status: raw.status ?? DEFAULTS.status, curationState: raw.curationState ?? DEFAULTS.curationState, source: raw.source ?? 'manual_import', embeddingReady: { vectorKey: null, provider: null, indexed: false }, sourceReputation: computeSourceReputation(sourceStats) };
  canonical.dominantDNA = getDominantDNA(canonical.dna_vector, { threshold: 0.35, limit: 5 });
  canonical.olfactiveCluster = assignOlfactiveCluster({ family: canonical.fragranceFamily, accords: canonical.accords, vibeTags: canonical.vibes });
  return canonical;
}

export function computeSourceReputation(stats = {}) {
  const consistency = Number(stats.sourceConsistency ?? 0.5);
  const extractionQuality = Number(stats.extractionQuality ?? 0.5);
  const semanticReliability = Number(stats.semanticReliability ?? 0.5);
  const duplicateRate = Number(stats.duplicationFrequency ?? 0.25);
  const malformedRate = Number(stats.malformedExtractionFrequency ?? 0.25);
  const score = (consistency * 0.25) + (extractionQuality * 0.25) + (semanticReliability * 0.3) + ((1 - duplicateRate) * 0.1) + ((1 - malformedRate) * 0.1);
  const tier = score >= 0.82 ? 'trusted' : score >= 0.64 ? 'acceptable' : score >= 0.45 ? 'weak' : 'noisy';
  return { tier, score: Number(score.toFixed(3)), metrics: { consistency, extractionQuality, semanticReliability, duplicateRate, malformedRate }, internalOnly: true };
}

export function enrichFragranceSemanticData(entry = {}) {
  const descriptor = entry.accords.slice(0, 3).join(', ') || 'textura refinada';
  const aura = entry.vibes.slice(0, 2).join(' e ') || 'presença serena';
  return { ...entry, semanticDescriptions: { editorial: `${entry.name} apresenta um perfil ${descriptor}, com construção limpa e acabamento de luxo discreto.`, summary: `${entry.brand} · ${entry.fragranceFamily ?? 'assinatura contemporânea'} · ${aura}.`, aura: `Aura ${aura}, adequada para ${entry.occasionTags[0] ?? 'uso versátil'}.`, wardrobe: `Posicionamento de guarda-roupa: ${entry.wardrobeRole}.`, emotionalIdentity: entry.vibes.slice(0, 3), archetype: entry.olfactiveCluster, personalitySignature: `${entry.projectionProfile}-${entry.performanceProfile}` } };
}

export function computeKnowledgeConfidence(entry = {}) {
  const structuredScore = [entry.name, entry.brand, entry.notes?.length, entry.accords?.length, entry.releaseYear].filter(Boolean).length;
  const enrichmentScore = Object.values(entry.semanticDescriptions ?? {}).filter(Boolean).length;
  const reputationBoost = entry.sourceReputation?.tier === 'trusted' ? 1 : entry.sourceReputation?.tier === 'acceptable' ? 0.5 : 0;
  if (structuredScore + reputationBoost >= 5 && enrichmentScore >= 5 && entry.curationState === 'approved') return 'highly_validated';
  if (structuredScore + reputationBoost >= 4 && enrichmentScore >= 4) return 'inferred';
  if (structuredScore >= 3) return 'experimental';
  return 'incomplete';
}

export function validateKnowledgeEntries(entries = []) { const errors = []; const seen = new Set(); entries.forEach((entry) => { if (!entry.id || !entry.slug || !entry.name || !entry.brand) errors.push(`${entry.id ?? 'unknown'} missing critical fields`); if (seen.has(entry.slug)) errors.push(`${entry.slug} duplicate graph node`); seen.add(entry.slug); if (!Array.isArray(entry.semanticTags) || entry.semanticTags.length < 3) errors.push(`${entry.slug} weak semantic tagging`); if (!entry.dna_vector || typeof entry.dna_vector !== 'object') errors.push(`${entry.slug} malformed DNA vector`); if (!['approved', 'needs_review', 'rejected'].includes(entry.curationState)) errors.push(`${entry.slug} invalid curationState`); if (!['public', 'internal'].includes(entry.knowledgeVisibility)) errors.push(`${entry.slug} invalid knowledgeVisibility`); if (CONTRADICTORY_VIBE_PAIRS.some(([a, b]) => entry.vibes.includes(a) && entry.vibes.includes(b))) errors.push(`${entry.slug} contradictory vibes`); if (entry.sourceReputation && !REPUTATION_LEVELS.includes(entry.sourceReputation.tier)) errors.push(`${entry.slug} invalid source reputation tier`); }); return { ok: errors.length === 0, errors }; }

export function buildGraphHealthMetrics(enriched = [], relationships = {}) {
  const orphans = enriched.filter((e) => (relationships[e.id] ?? []).length === 0).map((e) => e.id);
  const lowRelationshipNodes = enriched.filter((e) => (relationships[e.id] ?? []).length > 0 && (relationships[e.id] ?? []).length < 2).map((e) => e.id);
  const overconnected = enriched.filter((e) => (relationships[e.id] ?? []).length >= 12).map((e) => e.id);
  const lowConfidenceRegions = enriched.filter((e) => ['experimental', 'incomplete'].includes(e.knowledgeConfidence)).map((e) => e.id);
  return { internalOnly: true, orphanFragrances: orphans, lowRelationshipNodes, overconnectedSemanticClusters: overconnected, duplicateSemanticNeighborhoods: unique(enriched.map((e) => `${e.olfactiveCluster}:${(e.accords ?? []).slice(0, 2).sort().join('|')}`)).length < enriched.length ? 'detected' : 'clean', weakWardrobeBalancingCoverage: enriched.filter((e) => !e.wardrobeRole || e.wardrobeRole === 'signature versatile').length, lowConfidenceRegions };
}

export function buildKnowledgeGraphArtifacts(entries = [], options = {}) {
  const approved = entries.filter((e) => e.curationState === 'approved' && e.status !== 'rejected');
  const enriched = approved.map((e) => ({ ...e, knowledgeConfidence: computeKnowledgeConfidence(e) }));
  const graph = buildOlfactiveKnowledgeGraph(enriched.map((e) => ({ ...e, family: e.fragranceFamily, vibeTags: e.vibes })), { neighborLimit: options.neighborLimit ?? 8 });
  const relationships = {};
  enriched.forEach((a) => { relationships[a.id] = enriched.filter((b) => b.id !== a.id).map((b) => ({ to: b.id, ...scoreKnowledgeRelationship(a, b) })).filter((r) => r.score >= 0.3); });
  const metrics = { totalImported: entries.length, totalApproved: approved.length, confidenceDistribution: enriched.reduce((acc, e) => ({ ...acc, [e.knowledgeConfidence]: (acc[e.knowledgeConfidence] ?? 0) + 1 }), {}), clusterDistribution: enriched.reduce((acc, e) => ({ ...acc, [e.olfactiveCluster]: (acc[e.olfactiveCluster] ?? 0) + 1 }), {}), sourceReputationDistribution: enriched.reduce((acc, e) => ({ ...acc, [e.sourceReputation?.tier ?? 'unknown']: (acc[e.sourceReputation?.tier ?? 'unknown'] ?? 0) + 1 }), {}), graphHealth: buildGraphHealthMetrics(enriched, relationships) };
  return { generatedAt: new Date().toISOString(), schemaVersion: '7.8.0', embeddingReadiness: { enabled: false, strategy: 'vector-slot-reserved' }, visibleCatalogIds: enriched.filter((e) => e.knowledgeVisibility === 'public').map((e) => e.id), semanticOnlyIds: enriched.filter((e) => e.status === 'semantic_only' || e.knowledgeVisibility === 'internal').map((e) => e.id), graph, relationships, metrics, internalSignals: { sourceReputationEnabled: true, rawSnapshotsEnabled: true } };
}

export function runIngestionPipeline({ inputPath, format, outDir }) {
  const rawInput = fs.readFileSync(inputPath, 'utf8');
  const parsed = parseInputRecords(rawInput, format);
  const normalized = parsed.map(normalizeFragranceEntry);
  const enriched = normalized.map(enrichFragranceSemanticData).map((e) => ({ ...e, knowledgeConfidence: computeKnowledgeConfidence(e) }));
  const validation = validateKnowledgeEntries(enriched);
  const snapshot = { generatedAt: new Date().toISOString(), internalOnly: true, rawExtraction: parsed, normalizedExtraction: normalized, enrichedOutput: enriched, validationOutput: validation };
  if (!validation.ok) throw new Error(`Validation failed:\n${validation.errors.join('\n')}`);
  const artifact = buildKnowledgeGraphArtifacts(enriched);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'raw-snapshot.json'), JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(path.join(outDir, 'normalized.json'), JSON.stringify(normalized, null, 2));
  fs.writeFileSync(path.join(outDir, 'enriched.json'), JSON.stringify(enriched, null, 2));
  fs.writeFileSync(path.join(outDir, 'knowledge-graph.json'), JSON.stringify(artifact, null, 2));
  return { normalized, enriched, artifact, snapshot };
}
