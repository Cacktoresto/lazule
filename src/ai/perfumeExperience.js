import { DNA_LABELS, generatePerfumeDNA, getDominantDNA } from './perfumeDNA.js';
import { getOlfactiveSignals } from './olfactiveRelationships.js';
import { COMMERCIAL_STATUS, getCommercialStatus, getCommercialStatusMeta } from '../utils/commercialStatus.js';
import { createProductSlug } from '../utils/productRouting.js';
import { normalizeSearchText } from '../utils/search.js';
import { buildOlfactiveNarrative, buildOlfactiveProfile } from './olfactiveEnrichment.js';
import { formatSemanticLabels, humanizeSemanticTag, humanizeSignature } from '../utils/semanticPresentation.js';

const DIMENSION_META = Object.freeze({
  sweet: { label: 'Doçura', tone: 'âmbar gourmand', priority: 1.02 },
  fresh: { label: 'Frescor', tone: 'limpo luminoso', priority: 1.04 },
  woody: { label: 'Madeira', tone: 'estrutura seca', priority: 1.04 },
  seductive: { label: 'Sedução', tone: 'aproximação magnética', priority: 1.03 },
  elegant: { label: 'Elegância', tone: 'acabamento premium', priority: 1.08 },
  office: { label: 'Trabalho', tone: 'presença polida', priority: 0.98 },
  nightlife: { label: 'Noite', tone: 'impacto social', priority: 1.03 },
  projection: { label: 'Intensidade', tone: 'rastro percebido', priority: 1.07 },
  versatility: { label: 'Versatilidade', tone: 'uso fácil', priority: 1.01 },
  shareability: { label: 'Compartilhabilidade', tone: 'leitura de uso, não regra de gênero.', priority: 1.06 },
  arabic: { label: 'Âmbar', tone: 'calor oriental', priority: 1.02 },
  designer: { label: 'Urbano', tone: 'assinatura moderna', priority: 0.93 },
  luxury: { label: 'Luxo', tone: 'curadoria refinada', priority: 1.05 },
  youthful: { label: 'Energia', tone: 'brilho jovem', priority: 0.9 },
  mature: { label: 'Maturidade', tone: 'sobriedade elegante', priority: 0.92 },
});

const VALUE_BY_LABEL = Object.freeze({
  suave: 0.34,
  moderada: 0.52,
  moderado: 0.52,
  média: 0.52,
  medio: 0.52,
  marcante: 0.72,
  alta: 0.78,
  intenso: 0.84,
  intensa: 0.84,
  potente: 0.86,
  beast: 0.94,
  'beast mode': 0.96,
});

const PERFORMANCE_LABELS = ['suave', 'moderada', 'marcante', 'intensa'];

function unique(values = []) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value.flatMap(arrayFrom);
  if (value === undefined || value === null) return [];
  return String(value).split(/[;,|]/).map((entry) => entry.trim()).filter(Boolean);
}

function normalized(value) {
  return normalizeSearchText(value).trim();
}

function titleCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function clamp(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function safeValueFromText(value, fallback = 0.48) {
  const text = normalized(value);
  const match = Object.entries(VALUE_BY_LABEL).find(([token]) => text.includes(token));
  return match ? match[1] : fallback;
}

function qualitativeLabel(value, { allowBeastMode = false } = {}) {
  const bounded = clamp(value);
  if (allowBeastMode && bounded >= 0.92) return 'beast mode';
  if (bounded >= 0.78) return 'intensa';
  if (bounded >= 0.62) return 'marcante';
  if (bounded >= 0.42) return 'moderada';
  return 'suave';
}

function classifyShareability(product = {}, signals = getOlfactiveSignals(product), dna = {}) {
  const masculine = clamp(dna.masculine);
  const feminine = clamp(dna.feminine);
  const balance = Math.abs(masculine - feminine);
  const versatility = clamp(dna.versatility);
  const fresh = clamp(dna.fresh);
  const elegant = clamp(dna.elegant);
  const dense = clamp(Math.max(dna.arabic ?? 0, dna.woody ?? 0, dna.seductive ?? 0, dna.projection ?? 0));
  const normalizedTags = normalized([
    product.gender,
    product.category,
    product.description,
    ...signals.accords,
    ...signals.family,
    ...signals.vibes,
    ...signals.inspirations,
  ].join(' '));

  if (normalizedTags.includes('unissex') || normalizedTags.includes('unisex')) {
    return { value: Math.max(0.62, 1 - balance * 0.8), level: 'unissex moderno' };
  }

  const modernBlend = versatility >= 0.58 || (fresh >= 0.52 && elegant >= 0.54);
  if (balance <= 0.12 && (modernBlend || dense <= 0.72)) {
    return { value: Math.max(0.58, 1 - balance), level: 'compartilhável' };
  }

  if (balance <= 0.22 && modernBlend) {
    return { value: Math.max(0.56, 1 - balance * 0.9), level: 'assinatura versátil' };
  }

  if (balance <= 0.22) {
    return { value: Math.max(0.54, 1 - balance * 0.92), level: 'unissex moderno' };
  }

  return masculine > feminine
    ? { value: Math.max(0.5, 1 - balance), level: 'tendência masculina' }
    : { value: Math.max(0.5, 1 - balance), level: 'tendência feminina' };
}

function hasMeaningfulExperienceData(product = {}, signals = getOlfactiveSignals(product)) {
  return Boolean(
    Object.keys(product.dna_vector || {}).length ||
    signals.dominantDNA.length ||
    signals.accords.length ||
    signals.notes.length ||
    signals.vibes.length ||
    signals.occasions.length ||
    signals.weather.length ||
    product.performanceLabel ||
    product.projectionLabel ||
    product.olfactoryReference,
  );
}

export function getDominantExperienceDimensions(product = {}, { min = 5, max = 8 } = {}) {
  const signals = getOlfactiveSignals(product);
  const dna = Object.keys(product.dna_vector || {}).length ? product.dna_vector : signals.dna || generatePerfumeDNA(product);
  const shareability = classifyShareability(product, signals, dna);
  const generatedDominants = getDominantDNA(dna, { threshold: 0.18, limit: 12 });
  const dominantSource = Array.isArray(product.dominantDNA) ? product.dominantDNA : arrayFrom(product.dominantDNA);
  const existingDominants = dominantSource.map((entry) => {
    if (entry && typeof entry === 'object') {
      return { dimension: normalized(entry.dimension || entry.id || entry.label), value: clamp(entry.value ?? entry.score ?? 0.74) };
    }

    return { dimension: normalized(entry), value: 0.74 };
  });
  existingDominants.push({ dimension: 'shareability', value: shareability.value });
  const merged = [...generatedDominants, ...existingDominants]
    .filter(({ dimension }) => DIMENSION_META[dimension])
    .reduce((acc, entry) => {
      const current = acc.get(entry.dimension);
      if (!current || entry.value > current.value) acc.set(entry.dimension, entry);
      return acc;
    }, new Map());

  const dimensions = [...merged.values()]
    .map(({ dimension, value }) => ({
      id: dimension,
      label: DIMENSION_META[dimension].label,
      tone: DIMENSION_META[dimension].tone,
      value: Math.max(0.24, Math.round(clamp(value) * 100) / 100),
      level: dimension === 'shareability' ? shareability.level : qualitativeLabel(value),
      priorityScore: clamp(value) * DIMENSION_META[dimension].priority,
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.label.localeCompare(b.label))
    .slice(0, max);

  if (dimensions.length >= min) return dimensions;

  const fallbackOrder = ['elegant', 'versatility', 'projection', 'nightlife', 'fresh', 'sweet', 'woody', 'seductive'];
  for (const dimension of fallbackOrder) {
    if (dimensions.length >= min) break;
    if (dimensions.some((item) => item.id === dimension)) continue;
    const value = clamp(dna[dimension] ?? (dimension === 'elegant' ? 0.46 : 0.32));
    dimensions.push({
      id: dimension,
      label: DIMENSION_META[dimension].label,
      tone: DIMENSION_META[dimension].tone,
      value: Math.max(0.24, Math.round(value * 100) / 100),
      level: qualitativeLabel(value),
      priorityScore: value * DIMENSION_META[dimension].priority,
      inferred: true,
    });
  }

  return dimensions.slice(0, max);
}

function pickSignatureLead(signals, dimensions) {
  const source = [...signals.accords, ...signals.family, ...dimensions.map((item) => item.label)];
  const text = normalized(source.join(' '));
  if (text.includes('ambar') || text.includes('oriental')) return 'Ambarado quente';
  if (text.includes('madeira') || text.includes('amadeir')) return 'Amadeirado elegante';
  if (text.includes('fresco') || text.includes('citrico') || text.includes('azul')) return 'Fresco sofisticado';
  if (text.includes('floral') || text.includes('rosa') || text.includes('jasmim')) return 'Floral luminoso';
  if (text.includes('baunilha') || text.includes('gourmand') || text.includes('doce')) return 'Doce envolvente';
  return 'Perfil olfativo em curadoria';
}

export function createOlfactiveSignature(product = {}) {
  const profile = buildOlfactiveProfile(product);
  const hasAccords = profile.accords.length > 0 || profile.notes.length > 0;

  if (!hasAccords) {
    return {
      text: 'Perfil olfativo em curadoria.',
      facets: unique([product.brand, product.category, getCommercialStatusMeta(product).badge]).slice(0, 3),
      inCuration: true,
    };
  }

  return {
    text: buildOlfactiveNarrative(profile),
    facets: unique([
      ...formatSemanticLabels(profile.accords.slice(0, 3)),
      humanizeSignature(profile.signature),
      humanizeSemanticTag(profile.personality),
      humanizeSemanticTag(profile.occasion),
    ]).slice(0, 6),
    inCuration: false,
  };
}

export function createIdealUsageProfile(product = {}) {
  const signals = getOlfactiveSignals(product);
  const dimensions = getDominantExperienceDimensions(product, { min: 3, max: 6 });
  const enrichment = buildOlfactiveProfile(product);
  const chips = [];
  const push = (label, type = 'curadoria') => {
    const clean = titleCase(label);
    if (clean && !chips.some((chip) => normalized(chip.label) === normalized(clean))) chips.push({ label: clean, type });
  };

  signals.occasions.slice(0, 3).forEach((item) => push(item, 'ocasião'));
  signals.weather.slice(0, 2).forEach((item) => push(item, 'clima'));

  const dimensionIds = new Set(dimensions.map((item) => item.id));
  if (dimensionIds.has('nightlife')) push('Noite', 'período');
  if (dimensionIds.has('office')) push('Trabalho', 'ocasião');
  if (dimensionIds.has('fresh')) push('Clima quente/ameno', 'clima');
  if (dimensionIds.has('sweet') || dimensionIds.has('woody') || dimensionIds.has('arabic')) push('Clima frio/ameno', 'clima');
  if (dimensionIds.has('seductive')) push('Encontros', 'ocasião');
  if (dimensionIds.has('projection')) push('Presença marcante', 'estilo');
  if (dimensionIds.has('versatility')) push('Rotina premium', 'estilo');

  push(humanizeSignature(enrichment.signature), 'assinatura');
  push(humanizeSemanticTag(enrichment.personality), 'personalidade');
  push(humanizeSemanticTag(enrichment.occasion), 'contexto');

  if (!chips.length) {
    push(getCommercialStatus(product) === COMMERCIAL_STATUS.REFERENCE_ONLY ? 'Curadoria sob consulta' : 'Uso versátil', 'curadoria');
  }

  return chips.slice(0, 7);
}

export function createPerformanceProfile(product = {}) {
  const signals = getOlfactiveSignals(product);
  const dna = signals.dna || generatePerfumeDNA(product);
  const performanceText = unique([product.performanceLabel, product.projectionLabel, product.performance, ...signals.performance]).join(' ');
  const allowBeastMode = normalized(performanceText).includes('beast');
  const projectionBase = Math.max(clamp(dna.projection), safeValueFromText(performanceText, 0.5));
  const intensityBase = Math.max(projectionBase, clamp(dna.nightlife) * 0.72, clamp(dna.seductive) * 0.68);
  const versatilityBase = Math.max(clamp(dna.versatility), clamp(dna.office) * 0.76, clamp(dna.fresh) * 0.58, 0.34);
  const fixationBase = Math.max(safeValueFromText(performanceText, 0.48), clamp(dna.woody) * 0.72, clamp(dna.sweet) * 0.68, clamp(dna.arabic) * 0.74);

  return [
    { id: 'fixation', label: 'Fixação percebida', value: Math.round(clamp(fixationBase) * 100) / 100, level: qualitativeLabel(fixationBase, { allowBeastMode }), disclaimer: 'varia conforme pele, clima e aplicação' },
    { id: 'projection', label: 'Projeção', value: Math.round(clamp(projectionBase) * 100) / 100, level: qualitativeLabel(projectionBase, { allowBeastMode }) },
    { id: 'intensity', label: 'Intensidade', value: Math.round(clamp(intensityBase) * 100) / 100, level: qualitativeLabel(intensityBase, { allowBeastMode }) },
    { id: 'versatility', label: 'Versatilidade', value: Math.round(clamp(versatilityBase) * 100) / 100, level: qualitativeLabel(versatilityBase) },
  ].map((item) => ({ ...item, promiseSafe: true }));
}

export function getStatusExperienceCTA(product = {}) {
  const meta = getCommercialStatusMeta(product);
  const copy = {
    [COMMERCIAL_STATUS.IN_STOCK]: 'Disponível na curadoria LAZULE.',
    [COMMERCIAL_STATUS.ON_REQUEST]: 'Podemos verificar disponibilidade e valor para você.',
    [COMMERCIAL_STATUS.REFERENCE_ONLY]: 'Este perfume faz parte da nossa base olfativa. Podemos buscar alternativas ou consultar disponibilidade.',
  };

  return {
    status: meta.status,
    ctaLabel: meta.ctaLabel,
    shortCtaLabel: meta.shortCtaLabel,
    supportingCopy: copy[meta.status],
  };
}

export function createPerfumeExperience(product = {}) {
  const signals = getOlfactiveSignals(product);
  const dimensions = getDominantExperienceDimensions(product);
  const dominantDimensions = dimensions.map((item) => item.id);

  return {
    productSlug: product.productSlug || createProductSlug(product.name),
    status: getCommercialStatus(product),
    dimensions,
    dominantDimensions,
    signature: createOlfactiveSignature(product),
    idealUsage: createIdealUsageProfile(product),
    performance: createPerformanceProfile(product),
    statusCta: getStatusExperienceCTA(product),
    inCuration: !hasMeaningfulExperienceData(product, signals),
  };
}

export { PERFORMANCE_LABELS };
