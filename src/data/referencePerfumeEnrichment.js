import { DNA_LABELS, generatePerfumeDNA, getDominantDNA } from '../ai/perfumeDNA.js';
import { assignOlfactiveCluster, normalizeSemanticTags, RELATIONSHIP_CONFIDENCE } from '../ai/olfactiveKnowledgeGraph.js';
import { normalizeProducts } from '../domain/product.js';
import { getCommercialStatusMeta, VALID_COMMERCIAL_STATUSES } from '../utils/commercialStatus.js';
import { createSearchTokens, normalizeSearchText } from '../utils/search.js';
import { createProductSlug } from '../utils/productRouting.js';

const ARRAY_FIELDS = ['notes', 'accords', 'similarTo', 'inspirations', 'vibeTags', 'occasionTags', 'weatherTags'];
const FORBIDDEN_FIELDS = ['copiedText', 'fragranticaText', 'parfumoText', 'storeDescription', 'externalCopy'];

function unique(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function normalizeArray(value) {
  return unique(Array.isArray(value) ? value : String(value ?? '').split(',')).slice(0, 12);
}

function asSentenceList(items = [], fallback = 'perfil elegante') {
  const safe = unique(items).slice(0, 3);
  if (!safe.length) return fallback;
  if (safe.length === 1) return safe[0];
  return `${safe.slice(0, -1).join(', ')} e ${safe.at(-1)}`;
}

export function createEditorialDescription(perfume = {}) {
  const accords = asSentenceList(perfume.accords, perfume.family || 'perfil elegante');
  const vibes = asSentenceList(perfume.vibeTags, 'presença premium');
  const occasions = asSentenceList(perfume.occasionTags, 'rotina e momentos sociais');
  const weather = asSentenceList(perfume.weatherTags, 'clima ameno');
  const gender = normalizeSearchText(perfume.gender).includes('feminino') ? 'feminina' : normalizeSearchText(perfume.gender).includes('masculino') ? 'masculina' : 'unissex';

  return `Uma fragrância ${gender} de leitura ${accords}, com sensação ${vibes} para ${occasions}. Funciona especialmente em ${weather}, mantendo acabamento premium e fácil de explicar na curadoria LAZULE.`;
}

export function createAISummary(perfume = {}, dominantDNA = []) {
  const dnaLabels = dominantDNA.map(({ dimension }) => DNA_LABELS[dimension]).filter(Boolean);
  const status = getCommercialStatusMeta(perfume.status).label;
  return [
    `${perfume.brand} ${perfume.name}`,
    perfume.family,
    perfume.gender,
    perfume.concentration,
    `DNA ${asSentenceList(dnaLabels, 'equilibrado')}`,
    `status ${status}`,
    `notas ${asSentenceList(perfume.notes, 'selecionadas')}`,
  ].filter(Boolean).join(' · ');
}

export function createRecommendationHints(perfume = {}) {
  const statusMeta = getCommercialStatusMeta(perfume.status);
  return unique([
    ...normalizeArray(perfume.vibeTags).map((tag) => `Indicar quando a pessoa pedir algo ${tag}.`),
    ...normalizeArray(perfume.occasionTags).map((tag) => `Bom candidato para ${tag}.`),
    statusMeta.canDirectBuy ? 'Pode seguir para compra direta.' : 'Direcionar para consulta de disponibilidade e valor no WhatsApp.',
  ]).slice(0, 8);
}

export function normalizeReferencePerfume(rawPerfume = {}) {
  const statusMeta = getCommercialStatusMeta(rawPerfume.status);
  const normalized = {
    ...rawPerfume,
    name: String(rawPerfume.name ?? '').trim(),
    brand: String(rawPerfume.brand ?? '').trim(),
    status: statusMeta.status,
    commercialStatus: statusMeta.status,
    catalogType: String(rawPerfume.catalogType ?? 'Referência').trim(),
    category: String(rawPerfume.catalogType ?? 'Referência').trim(),
    gender: String(rawPerfume.gender ?? 'Unissex').trim(),
    concentration: String(rawPerfume.concentration ?? '').trim(),
    family: String(rawPerfume.family ?? '').trim(),
    performanceLabel: String(rawPerfume.performanceLabel ?? 'moderada').trim(),
    projectionLabel: String(rawPerfume.projectionLabel ?? 'moderada').trim(),
    popularityTier: String(rawPerfume.popularityTier ?? 'média').trim(),
    image: rawPerfume.image ?? null,
    salePrice: rawPerfume.salePrice ?? null,
    available: statusMeta.canDirectBuy,
    catalogVisibility: statusMeta.appearsInCatalog ? 'catalog' : 'reference',
    knowledgeVisibility: statusMeta.appearsInCatalog ? 'public' : 'internal',
    badges: unique([statusMeta.badge, rawPerfume.catalogType, rawPerfume.gender]),
    olfactoryReference: normalizeArray(rawPerfume.similarTo)[0] ?? '',
  };

  ARRAY_FIELDS.forEach((field) => {
    normalized[field] = normalizeArray(rawPerfume[field]);
  });

  normalized.description_editorial = String(rawPerfume.description_editorial ?? '').trim() || createEditorialDescription(normalized);
  normalized.description = normalized.description_editorial;
  const normalizedForDNA = {
    ...normalized,
    performance: normalized.performanceLabel,
    vibe: normalized.vibeTags,
    occasions: normalized.occasionTags,
    keywords: [...normalized.accords, ...normalized.inspirations, ...normalized.weatherTags],
  };
  normalized.dna_vector = generatePerfumeDNA(normalizedForDNA);
  normalized.dominantDNA = getDominantDNA(normalized.dna_vector, { threshold: 0.35, limit: 6 });
  normalized.ai_summary = createAISummary(normalized, normalized.dominantDNA);
  normalized.recommendationHints = createRecommendationHints(normalized);
  normalized.productSlug = createProductSlug(`${normalized.brand} ${normalized.name}`);
  normalized.slug = normalized.productSlug;
  normalized.id = `ref-${normalized.productSlug}`;
  normalized.searchTokens = createSearchTokens({ ...normalized, description: normalized.description_editorial });
  normalized.semanticTags = normalizeSemanticTags([
    ...normalized.accords,
    ...normalized.vibeTags,
    ...normalized.inspirations,
    ...normalized.occasionTags,
    ...normalized.weatherTags,
    normalized.family,
  ]);
  normalized.olfactiveCluster = assignOlfactiveCluster(normalized);
  normalized.knowledgeConfidence = normalized.status === 'semantic_only' ? RELATIONSHIP_CONFIDENCE.INFERRED : RELATIONSHIP_CONFIDENCE.HIGH;
  normalized.tags = unique([
    normalized.catalogType,
    normalized.gender,
    normalized.family,
    ...normalized.accords,
    ...normalized.vibeTags,
    ...normalized.occasionTags,
    ...normalized.weatherTags,
    ...normalized.dominantDNA.map(({ dimension }) => DNA_LABELS[dimension]),
  ].filter(Boolean));

  return normalizeProducts([normalized])[0];
}

export function enrichReferencePerfumes(rawPerfumes = []) {
  const seenSlugs = new Set();
  return rawPerfumes.map((rawPerfume) => {
    const enriched = normalizeReferencePerfume(rawPerfume);
    if (seenSlugs.has(enriched.productSlug)) {
      throw new Error(`Slug duplicado na base de referência: ${enriched.productSlug}`);
    }
    seenSlugs.add(enriched.productSlug);
    return enriched;
  });
}

export function validateReferencePerfumes(perfumes = []) {
  const errors = [];
  const seenSlugs = new Set();

  perfumes.forEach((perfume, index) => {
    const label = `${perfume.brand ?? 'sem marca'} ${perfume.name ?? `#${index}`}`.trim();
    const slug = perfume.productSlug ?? perfume.slug;
    if (!slug) errors.push(`${label}: slug ausente.`);
    if (slug && seenSlugs.has(slug)) errors.push(`${label}: slug duplicado (${slug}).`);
    if (slug) seenSlugs.add(slug);
    if (!VALID_COMMERCIAL_STATUSES.includes(perfume.status)) errors.push(`${label}: status inválido (${perfume.status}).`);
    ARRAY_FIELDS.slice(0, 2).forEach((field) => {
      if (!Array.isArray(perfume[field])) errors.push(`${label}: ${field} deve ser array.`);
    });
    if (!perfume.description_editorial) errors.push(`${label}: description_editorial ausente.`);
    if (!perfume.dna_vector || typeof perfume.dna_vector !== 'object') errors.push(`${label}: dna_vector inválido.`);
    if (FORBIDDEN_FIELDS.some((field) => Object.hasOwn(perfume, field))) errors.push(`${label}: contém campo proibido de texto copiado.`);
    if (['reference_only','semantic_only'].includes(perfume.status) && (perfume.available || perfume.catalogVisibility === 'catalog')) errors.push(`${label}: status interno não pode aparecer como compra direta.`);
    if (perfume.status !== 'in_stock' && /comprar agora/i.test(String(perfume.ctaLabel ?? perfume.description_editorial))) errors.push(`${label}: CTA proibido para consulta.`);
  });

  return { ok: errors.length === 0, errors };
}
