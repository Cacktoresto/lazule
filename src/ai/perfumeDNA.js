import { normalizeSearchText } from '../utils/search.js';

export const DNA_DIMENSIONS = [
  'sweet', 'fresh', 'woody', 'seductive', 'elegant', 'office', 'nightlife', 'projection',
  'versatility', 'masculine', 'feminine', 'arabic', 'designer', 'luxury', 'youthful', 'mature',
];

export const DNA_LABELS = {
  sweet: 'doce', fresh: 'fresco', woody: 'amadeirado', seductive: 'sedutor', elegant: 'elegante',
  office: 'trabalho', nightlife: 'noite', projection: 'presença', versatility: 'versátil',
  masculine: 'masculino', feminine: 'feminino', arabic: 'árabe', designer: 'importado',
  luxury: 'luxo', youthful: 'jovem', mature: 'maduro',
};

const ZERO_DNA = Object.freeze(Object.fromEntries(DNA_DIMENSIONS.map((dimension) => [dimension, 0])));

const TERM_SIGNALS = [
  { terms: ['doce', 'adocicado', 'baunilha', 'vanilla', 'tonka', 'caramelo', 'chocolate', 'gourmand', 'mel', 'ambar'], weights: { sweet: 0.28, seductive: 0.08, nightlife: 0.06 } },
  { terms: ['fresco', 'fresca', 'fresh', 'citrico', 'citrica', 'citrus', 'aquatico', 'aquatica', 'blue', 'limpo', 'leve', 'calor', 'verao', 'praia', 'dia'], weights: { fresh: 0.3, office: 0.1, versatility: 0.08, youthful: 0.05 } },
  { terms: ['madeira', 'amadeirado', 'amadeirada', 'cedro', 'santalo', 'sandalwood', 'oud', 'vetiver', 'patchouli'], weights: { woody: 0.28, mature: 0.08, elegant: 0.05 } },
  { terms: ['sedutor', 'sedutora', 'sensual', 'sexy', 'date', 'encontro', 'balada', 'marcante', 'atraente'], weights: { seductive: 0.28, nightlife: 0.18, projection: 0.08 } },
  { terms: ['elegante', 'sofisticado', 'sofisticada', 'chique', 'fino', 'fina', 'premium', 'assinatura', 'classico', 'refinado'], weights: { elegant: 0.28, luxury: 0.12, office: 0.05, mature: 0.05 } },
  { terms: ['trabalho', 'office', 'escritorio', 'reuniao', 'profissional', 'formal', 'discreto', 'discreta', 'versatil'], weights: { office: 0.3, versatility: 0.2, elegant: 0.08, projection: -0.05 } },
  { terms: ['noite', 'night', 'noturno', 'noturna', 'festa', 'jantar', 'intenso', 'intensa'], weights: { nightlife: 0.28, projection: 0.14, seductive: 0.08 } },
  { terms: ['forte', 'potente', 'projecao', 'fixacao', 'performance', 'duradouro', 'duradoura', 'edp', 'extrait', 'elixir'], weights: { projection: 0.25, nightlife: 0.08, luxury: 0.04 } },
  { terms: ['masculino', 'homem', 'masc', 'man', 'men', 'pour homme'], weights: { masculine: 0.44, feminine: -0.16 } },
  { terms: ['feminino', 'mulher', 'fem', 'woman', 'women', 'pour femme'], weights: { feminine: 0.44, masculine: -0.16 } },
  { terms: ['unissex', 'unisex', 'compartilhavel'], weights: { masculine: 0.18, feminine: 0.18, versatility: 0.08 } },
  { terms: ['arabe', 'arabes', 'oriental', 'dubai', 'lattafa', 'armaf', 'afnan', 'alhambra', 'rasasi'], weights: { arabic: 0.5, projection: 0.12, luxury: 0.08, nightlife: 0.06 } },
  { terms: ['importado', 'designer', 'internacional', 'dior', 'chanel', 'armani', 'versace', 'rabanne', 'ysl', 'creed', 'prada'], weights: { designer: 0.35, luxury: 0.1, elegant: 0.06 } },
  { terms: ['luxo', 'luxury', 'nicho', 'niche', 'premium', 'maison'], weights: { luxury: 0.28, elegant: 0.12 } },
  { terms: ['jovem', 'moderno', 'moderna', 'energia', 'vibrante'], weights: { youthful: 0.22, fresh: 0.06 } },
  { terms: ['maduro', 'madura', 'classico', 'classica', 'serio', 'sério'], weights: { mature: 0.22, elegant: 0.06 } },
];

const REFERENCE_PROFILES = [
  { terms: ['sauvage', 'bleu de chanel', 'bleu'], weights: { fresh: 0.35, masculine: 0.3, designer: 0.25, office: 0.14, projection: 0.1, elegant: 0.08 } },
  { terms: ['aventus', 'hacivat'], weights: { fresh: 0.22, woody: 0.18, masculine: 0.24, luxury: 0.16, projection: 0.1, elegant: 0.1 } },
  { terms: ['one million', '1 million', 'invictus'], weights: { sweet: 0.28, seductive: 0.2, nightlife: 0.2, youthful: 0.1, designer: 0.18 } },
  { terms: ['baccarat', 'br540'], weights: { sweet: 0.25, luxury: 0.2, projection: 0.18, seductive: 0.1, nightlife: 0.08 } },
  { terms: ['delina', 'good girl'], weights: { feminine: 0.35, seductive: 0.16, elegant: 0.14, sweet: 0.12, luxury: 0.1 } },
  { terms: ['erba pura'], weights: { sweet: 0.2, fresh: 0.16, projection: 0.16, luxury: 0.1, youthful: 0.08 } },
];

function clamp(value) { return Math.min(1, Math.max(0, Number(value) || 0)); }
function round(value) { return Math.round(clamp(value) * 100) / 100; }
function emptyDNA(seed = 0) { return Object.fromEntries(DNA_DIMENSIONS.map((dimension) => [dimension, seed])); }

function addWeights(dna, weights = {}, multiplier = 1) {
  for (const [dimension, weight] of Object.entries(weights)) {
    if (dimension in dna) dna[dimension] = clamp(dna[dimension] + weight * multiplier);
  }
}

function normalizeTextParts(parts = []) { return normalizeSearchText(parts.flat(Infinity).filter(Boolean).join(' ')); }

function getProductText(product = {}) {
  return normalizeTextParts([
    product.name, product.brand, product.category, product.gender, product.catalogType, product.type,
    product.olfactoryReference, product.description, product.performance, product.searchIndex,
    product.keywords, product.notes, product.occasions, product.vibe, product.badges,
  ]);
}

function applySignals(dna, text, multiplier = 1) {
  for (const signal of TERM_SIGNALS) {
    if (signal.terms.some((term) => text.includes(normalizeSearchText(term)))) addWeights(dna, signal.weights, multiplier);
  }
  for (const profile of REFERENCE_PROFILES) {
    if (profile.terms.some((term) => text.includes(normalizeSearchText(term)))) addWeights(dna, profile.weights, multiplier);
  }
}

export function normalizeDNA(dna = {}) {
  return Object.fromEntries(DNA_DIMENSIONS.map((dimension) => [dimension, round(dna[dimension])]));
}

export function generatePerfumeDNA(product = {}) {
  const dna = emptyDNA(0.03);
  const text = getProductText(product);
  applySignals(dna, text, 1);
  applySignals(dna, normalizeTextParts([product.olfactoryReference]), 1.25);

  const categoryText = normalizeTextParts([product.category, product.catalogType, product.type]);
  if (categoryText.includes('arabe')) addWeights(dna, { arabic: 0.5, projection: 0.08, nightlife: 0.05 });
  if (categoryText.includes('nicho')) addWeights(dna, { luxury: 0.22, elegant: 0.08 });
  if (categoryText.includes('import')) addWeights(dna, { designer: 0.28, luxury: 0.05 });

  const genderText = normalizeTextParts([product.gender, product.category, product.badges]);
  if (genderText.includes('masculino')) addWeights(dna, { masculine: 0.5, feminine: -0.18 });
  if (genderText.includes('feminino')) addWeights(dna, { feminine: 0.5, masculine: -0.18 });
  if (genderText.includes('unissex')) addWeights(dna, { masculine: 0.2, feminine: 0.2, versatility: 0.08 });

  if (product.featured) addWeights(dna, { luxury: 0.05, versatility: 0.04 });
  if (product.available !== false) addWeights(dna, { versatility: 0.03 });
  if (Number(product.salePrice ?? product.price) >= 450) addWeights(dna, { luxury: 0.08, mature: 0.03 });
  return normalizeDNA(dna);
}

export function generateQueryDNA(query = '') {
  const dna = emptyDNA(0);
  const text = normalizeSearchText(query);
  if (!text) return { ...ZERO_DNA };
  applySignals(dna, text, 1.2);
  if (text.includes('presente')) addWeights(dna, { versatility: 0.22, elegant: 0.12, luxury: 0.06 });
  if (text.includes('barato') || text.includes('custo beneficio') || text.includes('promocao')) addWeights(dna, { versatility: 0.14, luxury: -0.08 });
  if (text.includes('calor') || text.includes('verao')) addWeights(dna, { fresh: 0.18, office: 0.08, nightlife: -0.08 });
  if (text.includes('frio') || text.includes('inverno')) addWeights(dna, { sweet: 0.12, woody: 0.12, nightlife: 0.1 });
  return normalizeDNA(dna);
}

export function getDominantDNA(dna = {}, { threshold = 0.35, limit = 4 } = {}) {
  return DNA_DIMENSIONS
    .map((dimension) => ({ dimension, value: clamp(dna[dimension]) }))
    .filter((entry) => entry.value >= threshold)
    .sort((a, b) => b.value - a.value || a.dimension.localeCompare(b.dimension))
    .slice(0, limit);
}

export function calculateDNASimilarity(firstDNA = {}, secondDNA = {}, weights = {}) {
  let dot = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  for (const dimension of DNA_DIMENSIONS) {
    const weight = Number(weights[dimension]) || 1;
    const first = clamp(firstDNA[dimension]) * weight;
    const second = clamp(secondDNA[dimension]) * weight;
    dot += first * second;
    firstMagnitude += first * first;
    secondMagnitude += second * second;
  }
  if (!firstMagnitude || !secondMagnitude) return 0;
  return Math.round((dot / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude))) * 1000) / 1000;
}

export function generateRecommendationReason(product = {}, { queryDNA, perfumeDNA = generatePerfumeDNA(product), matchedIntents = [], fallback = false } = {}) {
  const dominant = getDominantDNA(perfumeDNA, { threshold: 0.42, limit: 3 }).map(({ dimension }) => dimension);
  const queryDominant = getDominantDNA(queryDNA, { threshold: 0.35, limit: 3 }).map(({ dimension }) => dimension);
  const overlap = dominant.filter((dimension) => queryDominant.includes(dimension));
  const traits = (overlap.length ? overlap : dominant).map((dimension) => DNA_LABELS[dimension]).filter(Boolean);

  if (matchedIntents.includes('parecido') || product.olfactoryReference) {
    const base = traits.slice(0, 2).join(' e ') || 'perfil próximo da referência';
    return `Tem construção olfativa próxima da referência e puxa para ${base}.`;
  }
  if (traits.includes('doce') && traits.includes('noite')) return 'Perfil intenso, doce e ideal para noite.';
  if (traits.includes('fresco') && (traits.includes('trabalho') || traits.includes('versátil'))) return 'Boa escolha para clima quente, rotina e uso diário.';
  if (traits.includes('elegante') && traits.includes('fresco')) return 'Combina elegância, frescor e alta versatilidade.';
  if (traits.includes('árabe') || perfumeDNA.arabic >= 0.55) return 'Perfil árabe de presença forte, com rastro envolvente.';
  if (traits.includes('sedutor')) return `Entrega assinatura ${traits.slice(0, 2).join(' e ')} para ocasiões de impacto.`;
  if (traits.length >= 2) return `Combina ${traits.slice(0, 3).join(', ')} com identidade olfativa clara.`;
  if (traits.length === 1) return `Boa escolha para quem quer um perfil ${traits[0]} sem neutralizar presença.`;
  if (fallback) return 'Entrada segura da curadoria, com perfil útil para começar sem perder assinatura.';
  return 'Aderente ao pedido pela leitura do DNA olfativo e contexto do catálogo.';
}
