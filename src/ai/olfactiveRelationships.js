import { calculateDNASimilarity, DNA_LABELS, generatePerfumeDNA, getDominantDNA } from './perfumeDNA.js';
import { COMMERCIAL_STATUS, canDirectBuy, getCommercialStatus } from '../utils/commercialStatus.js';
import { createProductSlug } from '../utils/productRouting.js';
import { normalizeSearchText } from '../utils/search.js';

const DEFAULT_LIMIT = 4;
const MAX_SECTION_ITEMS = 6;
const MIN_RELATIONSHIP_SCORE = 0.24;
const MIN_ALTERNATIVE_SCORE = 0.3;

const SIGNAL_FIELDS = Object.freeze({
  accords: ['accords', 'keywords'],
  notes: ['notes'],
  vibes: ['vibeTags', 'vibe', 'tags'],
  occasions: ['occasionTags', 'occasions'],
  weather: ['weatherTags', 'weather'],
  inspirations: ['inspirations', 'similarTo', 'olfactoryReference'],
});

const ACCORD_LABELS = Object.freeze({
  ambar: 'âmbar',
  amber: 'âmbar',
  ambarado: 'âmbar',
  resin: 'resinas',
  resinoso: 'resinas',
  baunilha: 'baunilha',
  vanilla: 'baunilha',
  citrico: 'cítrico',
  citrus: 'cítrico',
  fresco: 'fresco',
  fresh: 'fresco',
  amadeirado: 'madeiras',
  woody: 'madeiras',
  madeira: 'madeiras',
  limpo: 'limpo',
  clean: 'limpo',
  azul: 'azul',
  aromatico: 'aromático',
  floral: 'floral',
  doce: 'doce',
  sweet: 'doce',
  especiado: 'especiado',
  spicy: 'especiado',
  oud: 'oud',
  couro: 'couro',
  musk: 'almiscarado',
  almiscado: 'almiscarado',
  gourmand: 'gourmand',
});

const NOTE_TO_ACCORD = Object.freeze({
  ambroxan: 'âmbar',
  ambergris: 'âmbar',
  ambar: 'âmbar',
  amber: 'âmbar',
  labdano: 'resinas',
  benjoim: 'resinas',
  olibanum: 'resinas',
  incenso: 'resinas',
  baunilha: 'baunilha',
  vanilla: 'baunilha',
  tonka: 'doce',
  caramelo: 'doce',
  bergamota: 'cítrico',
  limao: 'cítrico',
  laranja: 'cítrico',
  grapefruit: 'cítrico',
  cedro: 'madeiras',
  sandalo: 'madeiras',
  santal: 'madeiras',
  vetiver: 'madeiras',
  patchouli: 'madeiras',
  oud: 'oud',
  rosa: 'floral',
  jasmim: 'floral',
  lavanda: 'aromático',
  musk: 'almiscarado',
  almíscar: 'almiscarado',
});

const DNA_TO_DIRECTION = Object.freeze({
  sweet: 'doce',
  fresh: 'fresco',
  woody: 'madeiras',
  seductive: 'sedutor',
  elegant: 'elegante',
  office: 'limpo',
  nightlife: 'noturno',
  projection: 'intenso',
  masculine: 'masculino',
  feminine: 'feminino',
  arabic: 'oriental',
  designer: 'moderno',
  luxury: 'sofisticado',
});

const memoizedSignals = new WeakMap();
const relationshipCache = new Map();

function unique(values = []) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function normalizeToken(value) {
  return normalizeSearchText(value).replace(/\bambar\b/g, 'ambar').trim();
}

function displayTerm(value) {
  const normalized = normalizeToken(value);
  return ACCORD_LABELS[normalized] || String(value ?? '').trim().toLowerCase();
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value.flatMap(arrayFrom);
  if (value === undefined || value === null) return [];
  return String(value).split(/[;,|]/).map((entry) => entry.trim()).filter(Boolean);
}

function readSignalField(product = {}, fieldNames = []) {
  return unique(fieldNames.flatMap((fieldName) => arrayFrom(product[fieldName])));
}

function normalizedSet(values = []) {
  return new Set(unique(values).map(normalizeToken).filter(Boolean));
}

function overlapDetails(current = [], candidate = []) {
  const candidateSet = normalizedSet(candidate);
  const shared = unique(current.filter((value) => candidateSet.has(normalizeToken(value))).map(displayTerm));
  const denominator = Math.max(1, Math.min(unique(current).length, unique(candidate).length));
  return { shared, ratio: Math.min(1, shared.length / denominator) };
}

function getProductKey(product = {}) {
  return String(product.productSlug ?? product.slug ?? createProductSlug(product.name) ?? product.id ?? product.name ?? '');
}

function getCatalogSignature(catalog = []) {
  return catalog.map((product) => getProductKey(product)).join('|');
}

function isSameProduct(current, candidate) {
  const currentKeys = new Set([current?.id, current?.productSlug, current?.slug, createProductSlug(current?.name)].filter(Boolean).map(String));
  return [candidate?.id, candidate?.productSlug, candidate?.slug, createProductSlug(candidate?.name)].filter(Boolean).some((key) => currentKeys.has(String(key)));
}

function inferAccordsFromText(product = {}) {
  const text = normalizeSearchText([
    product.name,
    product.brand,
    product.category,
    product.catalogType,
    product.family,
    product.description,
    product.searchIndex,
    product.olfactoryReference,
    product.performanceLabel,
    product.projectionLabel,
    product.gender,
    product.badges,
  ].flat(Infinity).filter(Boolean).join(' '));

  return Object.entries(ACCORD_LABELS)
    .filter(([token]) => text.includes(token))
    .map(([, label]) => label);
}

function inferAccordsFromNotes(notes = []) {
  return notes.map((note) => NOTE_TO_ACCORD[normalizeToken(note)]).filter(Boolean);
}

function getFamilyTerms(product = {}) {
  return unique([product.family, product.category, product.catalogType].flatMap(arrayFrom));
}

function getPopularityScore(product = {}) {
  const tier = normalizeToken(product.popularityTier);
  if (tier.includes('alta')) return 0.05;
  if (tier.includes('media')) return 0.03;
  if (product.featured) return 0.035;
  if (Number(product.salePrice) > 0) return 0.02;
  return 0.01;
}

function getPerformanceTerms(product = {}) {
  return unique([product.performanceLabel, product.projectionLabel, product.performance].flatMap(arrayFrom));
}

export function getOlfactiveSignals(product = {}) {
  if (product && memoizedSignals.has(product)) return memoizedSignals.get(product);

  const notes = readSignalField(product, SIGNAL_FIELDS.notes);
  const accords = unique([
    ...readSignalField(product, SIGNAL_FIELDS.accords),
    ...inferAccordsFromNotes(notes),
    ...inferAccordsFromText(product),
  ]).slice(0, 14);
  const vibes = readSignalField(product, SIGNAL_FIELDS.vibes);
  const occasions = readSignalField(product, SIGNAL_FIELDS.occasions);
  const weather = readSignalField(product, SIGNAL_FIELDS.weather);
  const inspirations = readSignalField(product, SIGNAL_FIELDS.inspirations);
  const family = getFamilyTerms(product);
  const performance = getPerformanceTerms(product);
  const dna = product.dna_vector ?? generatePerfumeDNA({
    ...product,
    vibe: vibes,
    occasions,
    keywords: [...accords, ...weather, ...inspirations],
    performance: performance.join(' '),
  });
  const dominantDNA = getDominantDNA(dna, { threshold: 0.34, limit: 6 });
  const directions = unique([
    ...accords.slice(0, 4).map(displayTerm),
    ...dominantDNA.map(({ dimension }) => DNA_TO_DIRECTION[dimension] || DNA_LABELS[dimension]),
  ]).slice(0, 8);

  const signals = { notes, accords, vibes, occasions, weather, inspirations, family, performance, dna, dominantDNA, directions };
  if (product) memoizedSignals.set(product, signals);
  return signals;
}

export function scoreOlfactiveRelationship(currentProduct, candidateProduct, options = {}) {
  if (!currentProduct || !candidateProduct || isSameProduct(currentProduct, candidateProduct)) return null;

  const current = getOlfactiveSignals(currentProduct);
  const candidate = getOlfactiveSignals(candidateProduct);
  const accordOverlap = overlapDetails(current.accords, candidate.accords);
  const noteOverlap = overlapDetails(current.notes, candidate.notes);
  const vibeOverlap = overlapDetails(current.vibes, candidate.vibes);
  const occasionOverlap = overlapDetails(current.occasions, candidate.occasions);
  const weatherOverlap = overlapDetails(current.weather, candidate.weather);
  const familyOverlap = overlapDetails(current.family, candidate.family);
  const inspirationOverlap = overlapDetails(current.inspirations, candidate.inspirations);
  const performanceOverlap = overlapDetails(current.performance, candidate.performance);
  const dnaSimilarity = calculateDNASimilarity(current.dna, candidate.dna, {
    sweet: 1.08,
    fresh: 1.08,
    woody: 1.1,
    seductive: 1.08,
    elegant: 1.06,
    nightlife: 1.06,
    projection: 1.04,
  });
  const sameCatalogType = normalizeToken(currentProduct.catalogType ?? currentProduct.category) === normalizeToken(candidateProduct.catalogType ?? candidateProduct.category) ? 0.035 : 0;
  const availabilityBoost = options.preferInStock && canDirectBuy(candidateProduct) ? 0.09 : canDirectBuy(candidateProduct) ? 0.018 : 0;
  const score = Math.max(0,
    accordOverlap.ratio * 0.24 +
    noteOverlap.ratio * 0.13 +
    dnaSimilarity * 0.28 +
    vibeOverlap.ratio * 0.12 +
    occasionOverlap.ratio * 0.07 +
    weatherOverlap.ratio * 0.05 +
    familyOverlap.ratio * 0.05 +
    inspirationOverlap.ratio * 0.07 +
    performanceOverlap.ratio * 0.035 +
    sameCatalogType +
    availabilityBoost +
    getPopularityScore(candidateProduct)
  );

  return {
    product: candidateProduct,
    score: Math.round(score * 1000) / 1000,
    dnaSimilarity: Math.round(dnaSimilarity * 1000) / 1000,
    overlaps: {
      accords: accordOverlap.shared,
      notes: noteOverlap.shared,
      vibes: vibeOverlap.shared,
      occasions: occasionOverlap.shared,
      weather: weatherOverlap.shared,
      family: familyOverlap.shared,
      inspirations: inspirationOverlap.shared,
      performance: performanceOverlap.shared,
    },
    explanation: createRelationshipExplanation({ current: currentProduct, candidate: candidateProduct, overlaps: { accords: accordOverlap.shared, notes: noteOverlap.shared, vibes: vibeOverlap.shared, occasions: occasionOverlap.shared, weather: weatherOverlap.shared }, dnaSimilarity }),
  };
}

function applyRelationshipDiversity(scoredItems = [], { limit = DEFAULT_LIMIT } = {}) {
  const brandCounts = new Map();
  const leadAccordCounts = new Map();

  return scoredItems
    .map((item) => {
      const signals = getOlfactiveSignals(item.product);
      const brand = normalizeToken(item.product.brand);
      const leadAccord = normalizeToken(item.overlaps.accords[0] ?? signals.accords[0] ?? signals.directions[0]);
      const penalty = (brandCounts.get(brand) ?? 0) * 0.055 + (leadAccordCounts.get(leadAccord) ?? 0) * 0.04;
      brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
      leadAccordCounts.set(leadAccord, (leadAccordCounts.get(leadAccord) ?? 0) + 1);
      return { ...item, diversityPenalty: Math.round(penalty * 1000) / 1000, score: Math.max(0, Math.round((item.score - penalty) * 1000) / 1000) };
    })
    .sort(compareRelationshipScore)
    .slice(0, limit);
}

function compareRelationshipScore(a, b) {
  return b.score - a.score || String(a.product.name).localeCompare(String(b.product.name), 'pt-BR');
}

function rankRelationships(currentProduct, catalog = [], options = {}) {
  const minimumScore = options.minimumScore ?? MIN_RELATIONSHIP_SCORE;
  return catalog
    .filter((candidate) => candidate && !isSameProduct(currentProduct, candidate))
    .map((candidate) => scoreOlfactiveRelationship(currentProduct, candidate, options))
    .filter((item) => item && item.score >= minimumScore)
    .sort(compareRelationshipScore);
}

function getLeadAccord(product) {
  return getOlfactiveSignals(product).accords.map(displayTerm).find(Boolean);
}

function getLeadVibe(product) {
  return getOlfactiveSignals(product).vibes.map(displayTerm).find(Boolean);
}

function relationshipSection(id, title, subtitle, scoredItems, options = {}) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const items = applyRelationshipDiversity(scoredItems, { limit }).map((item) => ({ ...item, relationshipType: id }));
  if (items.length < (options.minItems ?? 2)) return null;
  return { id, title, subtitle, items };
}

export function createRelationshipExplanation({ overlaps = {}, dnaSimilarity = 0 } = {}) {
  const [accord] = overlaps.accords ?? [];
  const [note] = overlaps.notes ?? [];
  const [vibe] = overlaps.vibes ?? [];
  const [occasion] = overlaps.occasions ?? [];
  const [weather] = overlaps.weather ?? [];

  if (accord && ['âmbar', 'resinas', 'baunilha'].includes(accord)) return `Compartilha o mesmo perfil ${accord === 'âmbar' ? 'ambarado quente' : `${accord} quente`}.`;
  if (accord && ['fresco', 'cítrico', 'azul', 'limpo'].includes(accord)) return `Segue uma assinatura ${accord} e sofisticada.`;
  if (accord && accord.includes('madeira')) return 'Explora madeiras limpas e modernas.';
  if (vibe && normalizeToken(vibe).includes('noturn')) return 'Mantém a mesma vibe noturna intensa.';
  if (vibe) return `Preserva uma sensação ${vibe} dentro da curadoria.`;
  if (note) return `Conecta pela nota de ${note}, sem sugerir equivalência direta.`;
  if (occasion) return `Funciona na mesma intenção de uso: ${occasion}.`;
  if (weather) return `Conversa com o mesmo clima olfativo: ${weather}.`;
  if (dnaSimilarity >= 0.78) return 'Na mesma direção olfativa, com DNA próximo e leitura premium.';
  return 'Aproxima assinatura, ocasião e presença sem tratar como clone.';
}

export function getAvailableAlternatives(currentProduct, catalog = [], options = {}) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  return rankRelationships(currentProduct, catalog, {
    ...options,
    preferInStock: true,
    minimumScore: options.minimumScore ?? MIN_ALTERNATIVE_SCORE,
  })
    .filter((item) => canDirectBuy(item.product))
    .filter((item) => item.score >= MIN_ALTERNATIVE_SCORE || item.overlaps.accords.length || item.overlaps.vibes.length)
    .slice(0, MAX_SECTION_ITEMS)
    .sort(compareRelationshipScore)
    .slice(0, limit);
}

export function generateOlfactiveRelationships(currentProduct, catalog = [], options = {}) {
  if (!currentProduct || !Array.isArray(catalog) || catalog.length < 2) return [];

  const cacheKey = options.disableCache ? null : [getProductKey(currentProduct), getCommercialStatus(currentProduct), getCatalogSignature(catalog), options.limit ?? DEFAULT_LIMIT].join('::');
  if (cacheKey && relationshipCache.has(cacheKey)) return relationshipCache.get(cacheKey);

  const status = getCommercialStatus(currentProduct);
  const preferInStock = status === COMMERCIAL_STATUS.ON_REQUEST || status === COMMERCIAL_STATUS.REFERENCE_ONLY;
  const limit = Math.min(MAX_SECTION_ITEMS, Math.max(2, Number(options.limit) || DEFAULT_LIMIT));
  const ranked = rankRelationships(currentProduct, catalog, { preferInStock, minimumScore: options.minimumScore ?? MIN_RELATIONSHIP_SCORE });
  const signals = getOlfactiveSignals(currentProduct);
  const leadAccord = getLeadAccord(currentProduct);
  const leadVibe = getLeadVibe(currentProduct);
  const sections = [];

  if (preferInStock) {
    const alternatives = getAvailableAlternatives(currentProduct, catalog, { limit, minimumScore: 0.28 });
    sections.push(relationshipSection(
      'available_alternatives',
      'Alternativas disponíveis',
      leadAccord ? `Disponível na curadoria LAZULE com leitura de ${leadAccord}.` : 'Assinaturas em pronta entrega na mesma direção olfativa.',
      alternatives,
      { limit, minItems: 1 },
    ));
  }

  sections.push(relationshipSection(
    'shared_signature',
    'Compartilha a mesma assinatura',
    'Perfumes conectados por acordes, notas e proximidade de DNA.',
    ranked.filter((item) => item.dnaSimilarity >= 0.72 || item.overlaps.accords.length >= 2 || item.overlaps.notes.length >= 1),
    { limit },
  ));

  if (leadAccord) {
    sections.push(relationshipSection(
      `accord_${normalizeToken(leadAccord)}`,
      `Assinaturas com ${leadAccord}`,
      `Uma rota de descoberta para quem quer explorar ${leadAccord} com acabamento LAZULE.`,
      ranked.filter((item) => item.overlaps.accords.includes(leadAccord) || getOlfactiveSignals(item.product).accords.map(displayTerm).includes(leadAccord)),
      { limit },
    ));
  }

  if (leadVibe) {
    sections.push(relationshipSection(
      'similar_vibes',
      'Vibes semelhantes',
      `A mesma atmosfera ${leadVibe}, sem transformar a curadoria em comparação literal.`,
      ranked.filter((item) => item.overlaps.vibes.length || item.overlaps.occasions.length || item.dnaSimilarity >= 0.76),
      { limit },
    ));
  }

  sections.push(relationshipSection(
    'olfactive_direction',
    'Na mesma direção olfativa',
    signals.directions.length ? `Direções dominantes: ${signals.directions.slice(0, 3).join(', ')}.` : 'Caminhos próximos por família, ocasião e performance.',
    ranked.filter((item) => item.overlaps.family.length || item.overlaps.weather.length || item.overlaps.performance.length || item.dnaSimilarity >= 0.7),
    { limit },
  ));

  const dedupedSections = sections
    .filter(Boolean)
    .reduce((accumulator, section) => {
      const seen = new Set(accumulator.flatMap((existing) => existing.id === 'available_alternatives' ? [] : existing.items.map((item) => getProductKey(item.product))));
      const items = section.items.filter((item) => section.id === 'available_alternatives' || section.id === 'shared_signature' || !seen.has(getProductKey(item.product)));
      if (items.length >= (section.id === 'available_alternatives' ? 1 : 2)) accumulator.push({ ...section, items });
      return accumulator;
    }, [])
    .slice(0, preferInStock ? 4 : 3);

  if (cacheKey) relationshipCache.set(cacheKey, dedupedSections);
  return dedupedSections;
}

export function getExplorableOlfactiveTerms(product = {}, options = {}) {
  const signals = getOlfactiveSignals(product);
  const limit = options.limit ?? 10;
  return unique([
    ...signals.accords.slice(0, 5).map((term) => ({ type: 'accord', term: displayTerm(term), label: displayTerm(term) })),
    ...signals.notes.slice(0, 5).map((term) => ({ type: 'note', term: displayTerm(term), label: displayTerm(term) })),
    ...signals.directions.slice(0, 4).map((term) => ({ type: 'direction', term: displayTerm(term), label: displayTerm(term) })),
  ].map((entry) => JSON.stringify(entry))).map((entry) => JSON.parse(entry)).slice(0, limit);
}

export function exploreOlfactiveTerm(term, catalog = [], options = {}) {
  const normalizedTerm = normalizeToken(term);
  const limit = options.limit ?? DEFAULT_LIMIT;
  if (!normalizedTerm || !Array.isArray(catalog)) return [];

  return catalog
    .filter(Boolean)
    .map((product) => {
      const signals = getOlfactiveSignals(product);
      const haystack = [signals.accords, signals.notes, signals.vibes, signals.directions, signals.family, product.searchIndex, product.description].flat(Infinity).map(normalizeToken);
      const exactSignal = haystack.some((value) => value === normalizedTerm) ? 0.42 : 0;
      const partialSignal = haystack.some((value) => value.includes(normalizedTerm) || normalizedTerm.includes(value)) ? 0.16 : 0;
      const inStockBoost = canDirectBuy(product) ? 0.04 : 0;
      return { product, score: exactSignal + partialSignal + inStockBoost + getPopularityScore(product), explanation: `Explora ${displayTerm(term)} dentro de uma leitura olfativa curada.` };
    })
    .filter((item) => item.score > 0.12)
    .sort(compareRelationshipScore)
    .slice(0, limit);
}

export function createUnavailableDiscoveryConversion(currentProduct, catalog = [], options = {}) {
  const status = getCommercialStatus(currentProduct);
  const unavailable = status === COMMERCIAL_STATUS.ON_REQUEST || status === COMMERCIAL_STATUS.REFERENCE_ONLY || !canDirectBuy(currentProduct);
  if (!currentProduct || !unavailable) return null;

  const alternatives = getAvailableAlternatives(currentProduct, catalog, { limit: options.limit ?? DEFAULT_LIMIT, minimumScore: 0.26 });
  const leadAccord = getLeadAccord(currentProduct);

  return {
    original: currentProduct,
    status,
    title: 'Disponível na curadoria LAZULE',
    sourcingCta: 'Solicitar curadoria',
    message: leadAccord
      ? `Preservamos o contexto de ${currentProduct.name} e sugerimos assinaturas disponíveis com ${leadAccord}, sem tratar como clones.`
      : `Preservamos o contexto de ${currentProduct.name} e sugerimos assinaturas disponíveis na mesma direção olfativa.`,
    alternatives,
    conversionType: alternatives.length ? 'unavailable_to_in_stock' : 'sourcing_only',
  };
}

export default {
  getOlfactiveSignals,
  scoreOlfactiveRelationship,
  generateOlfactiveRelationships,
  getAvailableAlternatives,
  getExplorableOlfactiveTerms,
  exploreOlfactiveTerm,
  createRelationshipExplanation,
  createUnavailableDiscoveryConversion,
};
