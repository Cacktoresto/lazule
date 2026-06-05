import { buildOlfactiveProfile } from './olfactiveEnrichment.js';
import { getSimilarPerfumesForProduct } from './similarPerfumeEngine.js';
import { similarPerfumes } from '../data/generated/similarPerfumes.js';
import { createProductSlug } from '../utils/productRouting.js';

const METRIC_DEFINITIONS = [
  { key: 'freshness', label: 'Frescor', shortLabel: 'Frescor' },
  { key: 'sweetness', label: 'Doçura', shortLabel: 'Doçura' },
  { key: 'elegance', label: 'Elegância', shortLabel: 'Elegância' },
  { key: 'versatility', label: 'Versatilidade', shortLabel: 'Versátil' },
  { key: 'heat', label: 'Calor', shortLabel: 'Calor' },
  { key: 'night', label: 'Noite', shortLabel: 'Noite' },
  { key: 'office', label: 'Escritório', shortLabel: 'Office' },
  { key: 'signature', label: 'Assinatura', shortLabel: 'Assinatura' },
  { key: 'sophistication', label: 'Sofisticação', shortLabel: 'Sofisticação' },
  { key: 'projection', label: 'Projeção', shortLabel: 'Projeção' },
  { key: 'shareability', label: 'Compartilhabilidade', shortLabel: 'Agrada fácil' },
];

const TOKEN_WEIGHTS = {
  freshness: ['fresh', 'fresco', 'citrus', 'citrico', 'aquatic', 'marine', 'clean', 'limpo', 'blue', 'bergamot', 'grapefruit', 'lemon', 'daily', 'summer', 'tropical_heat'],
  sweetness: ['sweet', 'doce', 'vanilla', 'baunilha', 'tonka', 'amber', 'gourmand', 'caramel', 'fruity'],
  elegance: ['elegant', 'luxury', 'luxurious', 'premium', 'clean_luxury', 'executive', 'office', 'formal', 'iris', 'woody', 'musk'],
  versatility: ['daily', 'office', 'casual', 'fresh', 'clean', 'citrus', 'aquatic', 'moderate', 'high', 'unissex'],
  heat: ['summer', 'tropical_heat', 'hot_weather', 'fresh', 'cold', 'citrus', 'aquatic', 'marine', 'clean'],
  night: ['nightlife', 'night', 'romantic', 'seductive', 'sensual', 'amber', 'sweet', 'smoky', 'oud', 'leathery', 'high', 'beast_mode'],
  office: ['office', 'executive', 'daily', 'clean', 'fresh', 'musk', 'iris', 'moderate', 'clean_luxury'],
  signature: ['signature', 'clean_luxury', 'masculine_woody', 'modern_fresh', 'seductive_night', 'high', 'beast_mode', 'woody', 'amber', 'musk'],
  sophistication: ['luxury', 'luxurious', 'premium', 'elegant', 'clean_luxury', 'iris', 'woody', 'oud', 'musk', 'nicho', 'formal'],
  projection: ['high', 'beast_mode', 'intensa', 'marcante', 'loud', 'provocative', 'amber', 'sweet', 'smoky', 'oud'],
  shareability: ['fresh', 'clean', 'citrus', 'aquatic', 'daily', 'office', 'musk', 'moderate', 'unissex', 'clean_luxury'],
};

const COPY = {
  freshness: ['sensação de banho tomado', 'frescor mais evidente', 'saída limpa e luminosa'],
  sweetness: ['toque mais doce', 'calor envolvente', 'lado gourmand ou ambarado'],
  elegance: ['luxo clean', 'elegância discreta', 'acabamento mais refinado'],
  versatility: ['uso diário', 'versatilidade real', 'fácil de encaixar na rotina'],
  heat: ['melhor para calor', 'leveza em clima quente', 'boa saída em dias quentes'],
  night: ['presença à noite', 'mais impacto social', 'perfil mais marcante'],
  office: ['ambiente corporativo', 'assinatura profissional', 'presença limpa no escritório'],
  signature: ['assinatura diária', 'identidade olfativa clara', 'marca presença sem confundir'],
  sophistication: ['sofisticação', 'leitura premium', 'acabamento elegante'],
  projection: ['mais projeção', 'rastro mais perceptível', 'presença no ar'],
  shareability: ['agrada facilmente', 'perfil compartilhável', 'boa aceitação social'],
};

function arr(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokensFromProduct(product = {}, profile = buildOlfactiveProfile(product)) {
  return [
    product.name,
    product.brand,
    product.category,
    product.catalogType,
    product.gender,
    product.family,
    product.description,
    product.olfactoryReference,
    product.performanceLabel,
    product.projectionLabel,
    product.signature,
    product.personality,
    product.occasion,
    product.temperature,
    product.projection,
    product.semanticCluster,
    ...arr(product.accords),
    ...arr(product.notes),
    ...arr(product.vibeTags),
    ...arr(product.occasionTags),
    ...arr(product.weatherTags),
    ...arr(product.semanticFacets),
    ...arr(product.semanticReasons),
    ...arr(profile.accords),
    ...arr(profile.notes),
    ...arr(profile.personalities),
    ...arr(profile.usageContext),
    ...arr(profile.climate),
    ...arr(profile.vibe),
    profile.signature,
    profile.temperature,
    profile.performance?.projection,
    profile.performance?.longevity,
    profile.performance?.sillage,
    profile.performance?.versatility,
  ].map(normalize).filter(Boolean);
}

function scoreMetric(tokens, key) {
  const haystack = ` ${tokens.join(' ')} `;
  const matches = (TOKEN_WEIGHTS[key] || []).reduce((count, token) => count + (haystack.includes(normalize(token)) ? 1 : 0), 0);
  const base = 5.2 + Math.min(3.8, matches * 0.58);
  return Number(Math.max(4.4, Math.min(9.8, base)).toFixed(1));
}

function labelScore(score) {
  if (score >= 9.1) return 'Excelente';
  if (score >= 8.2) return 'Muito bom';
  if (score >= 7.2) return 'Bom';
  if (score >= 6.2) return 'Correto';
  return 'Moderado';
}

function getDisplayName(product = {}) {
  return String(product.name || '').split('|').pop().trim() || product.name || 'Perfume';
}

function strongestMetrics(metrics, blocked = []) {
  const blockedSet = new Set(blocked);
  return Object.entries(metrics)
    .filter(([key]) => !blockedSet.has(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => key);
}


function fallbackSimilarity(base, candidate) {
  if (!base || !candidate || base.productSlug === candidate.productSlug) return 0;
  const baseProfile = buildOlfactiveProfile(base);
  const candidateProfile = buildOlfactiveProfile(candidate);
  const baseTokens = new Set(tokensFromProduct(base, baseProfile));
  const candidateTokens = new Set(tokensFromProduct(candidate, candidateProfile));
  const overlap = [...baseTokens].filter((token) => candidateTokens.has(token)).length / Math.max(1, Math.min(baseTokens.size, candidateTokens.size));
  const sameReference = normalize(base.olfactoryReference) && normalize(base.olfactoryReference) === normalize(candidate.olfactoryReference) ? 0.42 : 0;
  const sameCluster = normalize(base.semanticCluster) && normalize(base.semanticCluster) === normalize(candidate.semanticCluster) ? 0.22 : 0;
  const sameType = normalize(base.catalogType) && normalize(base.catalogType) === normalize(candidate.catalogType) ? 0.12 : 0;
  return overlap + sameReference + sameCluster + sameType;
}

function buildReasons(metricKeys) {
  return metricKeys.flatMap((key) => COPY[key]?.slice(0, 1) || []).slice(0, 4);
}

function buildUserProfile(metricKeys, product) {
  const labels = new Set(metricKeys.flatMap((key) => COPY[key] || []));
  const productText = normalize([product.category, product.catalogType, product.olfactoryReference, product.semanticReasons].flat().join(' '));
  if (productText.includes('arabe')) labels.add('gosta de perfumes modernos com presença');
  if (productText.includes('nicho')) labels.add('quer uma leitura mais autoral');
  return [...labels].slice(0, 5);
}

function buildProductInsight(product, profile, tokens) {
  const accords = arr(product.accords).length ? arr(product.accords) : arr(profile.accords);
  const occasions = arr(product.occasionTags).length ? arr(product.occasionTags) : arr(profile.usageContext);
  const weather = arr(product.weatherTags).length ? arr(product.weatherTags) : arr(profile.climate);
  return {
    product,
    name: getDisplayName(product),
    slug: product.productSlug || createProductSlug(product.name),
    brand: product.brand,
    image: product.image,
    price: product.salePrice || product.price,
    reference: product.olfactoryReference,
    accords: accords.slice(0, 6),
    notes: arr(product.notes).length ? arr(product.notes).slice(0, 7) : arr(profile.notes).slice(0, 7),
    vibe: arr(product.vibeTags).length ? arr(product.vibeTags).slice(0, 5) : arr(profile.vibe).slice(0, 5),
    occasions: occasions.slice(0, 5),
    weather: weather.slice(0, 4),
    semanticReasons: arr(product.semanticReasons).slice(0, 4),
    profile,
    metrics: Object.fromEntries(METRIC_DEFINITIONS.map(({ key }) => [key, scoreMetric(tokens, key)])),
  };
}

function buildComparisonNarrative(insights) {
  if (insights.length < 2) return '';
  const [first, second] = insights;
  const firstStrengths = strongestMetrics(first.metrics);
  const secondStrengths = strongestMetrics(second.metrics, firstStrengths.slice(0, 1));
  const firstWords = buildReasons(firstStrengths).slice(0, 2).join(' e ');
  const secondWords = buildReasons(secondStrengths).slice(0, 2).join(' e ');
  const shared = first.accords.filter((accord) => second.accords.map(normalize).includes(normalize(accord))).slice(0, 2);
  const sharedCopy = shared.length ? `Ambos conversam em ${shared.join(' + ')}, mas seguem caminhos diferentes.` : 'Eles ocupam territórios próximos de desejo, mas resolvem a compra de formas diferentes.';

  if (insights.length === 2) {
    return `${sharedCopy} O ${first.name} prioriza ${firstWords || 'equilíbrio e assinatura limpa'}. O ${second.name} entrega ${secondWords || 'outra leitura de presença e estilo'}.`;
  }

  const leader = pickFinalWinner(insights);
  return `${sharedCopy} Entre as opções, ${leader.name} aparece como a escolha mais segura para decidir primeiro, enquanto as outras alternativas ajudam a ajustar energia, presença e ocasião.`;
}

function pickFinalWinner(insights) {
  return [...insights].sort((a, b) => {
    const score = (item) => item.metrics.versatility * 0.28 + item.metrics.elegance * 0.22 + item.metrics.freshness * 0.18 + item.metrics.shareability * 0.18 + item.metrics.sophistication * 0.14;
    return score(b) - score(a);
  })[0];
}

export function getComparisonMetrics() {
  return METRIC_DEFINITIONS;
}

export function buildComparePath(products = []) {
  const slugs = products.map((product) => product?.productSlug || createProductSlug(product?.name || product)).filter(Boolean).slice(0, 4);
  return `/compare/${slugs.join('-vs-')}`;
}

export function getComparisonSuggestions(product, catalogProducts = [], limit = 4) {
  if (!product) return [];
  const groups = getSimilarPerfumesForProduct(product, similarPerfumes);
  const candidateSlugs = [...arr(groups.highlySimilar), ...arr(groups.complementary), ...arr(groups.adventurousAlternatives)].map((item) => item.slug);
  const seen = new Set([product.productSlug]);
  const artifactSuggestions = candidateSlugs
    .map((slug) => catalogProducts.find((candidate) => candidate.productSlug === slug))
    .filter((candidate) => candidate && !seen.has(candidate.productSlug) && seen.add(candidate.productSlug));

  if (artifactSuggestions.length >= limit) {
    return artifactSuggestions.slice(0, limit);
  }

  const fallbackSuggestions = catalogProducts
    .filter((candidate) => candidate?.productSlug && !seen.has(candidate.productSlug) && candidate.catalogVisibility !== 'internal')
    .map((candidate) => ({ candidate, score: fallbackSimilarity(product, candidate) }))
    .filter(({ score }) => score > 0.18)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name, 'pt-BR'))
    .map(({ candidate }) => candidate)
    .filter((candidate) => !seen.has(candidate.productSlug) && seen.add(candidate.productSlug));

  return [...artifactSuggestions, ...fallbackSuggestions].slice(0, limit);
}

export function createPerfumeComparison(products = []) {
  const insights = products.slice(0, 4).map((product) => {
    const profile = buildOlfactiveProfile(product);
    const tokens = tokensFromProduct(product, profile);
    return buildProductInsight(product, profile, tokens);
  });
  const metrics = METRIC_DEFINITIONS.map((metric) => ({
    ...metric,
    values: insights.map((insight) => ({ slug: insight.slug, name: insight.name, score: insight.metrics[metric.key], label: labelScore(insight.metrics[metric.key]) })),
    leaderSlug: [...insights].sort((a, b) => b.metrics[metric.key] - a.metrics[metric.key])[0]?.slug,
  }));
  const summaries = insights.map((insight) => {
    const strengths = strongestMetrics(insight.metrics);
    return {
      slug: insight.slug,
      name: insight.name,
      reasons: buildReasons(strengths),
      userProfile: buildUserProfile(strengths, insight.product),
    };
  });
  const winner = pickFinalWinner(insights);

  return {
    products: insights,
    metrics,
    summaries,
    narrative: buildComparisonNarrative(insights),
    verdict: winner ? `Para a maioria das pessoas, ${winner.name} será a escolha mais versátil para comprar primeiro. As alternativas vencem quando você prioriza um traço específico como mais projeção, doçura, energia ou uso noturno.` : '',
  };
}
