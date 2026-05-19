import { normalizeSearchText } from '../utils/search.js';
import { generatePerfumeDNA } from './perfumeDNA.js';

const SEMANTIC_TAXONOMY = {
  luxury: { accords: ['amber', 'woody', 'musky'], vibes: ['elegante', 'sofisticado', 'premium'], occasions: ['formal', 'trabalho'], weather: ['frio', 'ameno'], projection: ['moderada'] },
  clean: { accords: ['citrus', 'musky', 'soapy'], vibes: ['limpo', 'fresco', 'white shirt'], occasions: ['office'], weather: ['calor'], projection: ['moderada'] },
  seductive: { accords: ['amber', 'spicy', 'woody'], vibes: ['sedutor', 'sensual', 'noturno'], occasions: ['date', 'noite'], weather: ['ameno', 'frio'], projection: ['moderada', 'alta'] },
  mysterious: { accords: ['smoky', 'resinous', 'oud'], vibes: ['misterioso', 'dark', 'intenso'], occasions: ['noite'], weather: ['frio'], projection: ['alta'] },
  executive: { accords: ['woody', 'citrus', 'aromatic'], vibes: ['executivo', 'refinado', 'classico'], occasions: ['trabalho', 'reuniao'], weather: ['ameno', 'calor'], projection: ['moderada'] },
  intimate: { accords: ['musky', 'soft woods', 'powdery'], vibes: ['discreto', 'pele', 'confortavel'], occasions: ['date', 'casual'], weather: ['ameno'], projection: ['baixa', 'moderada'] },
  winter: { accords: ['amber', 'spicy', 'vanilla', 'woody'], vibes: ['inverno', 'aconchegante', 'elegante'], occasions: ['formal', 'noite'], weather: ['frio'], projection: ['moderada', 'alta'] },
};

const INTENT_MAP = {
  'cheiro de homem rico': ['luxury', 'clean', 'executive'],
  'perfume de milionario': ['luxury', 'executive'],
  'energia old money': ['luxury', 'executive', 'clean'],
  'perfume silenciosamente rico': ['luxury', 'intimate'],
  'perfume de vilao elegante': ['mysterious', 'seductive', 'luxury'],
  'perfume de vilao': ['mysterious', 'seductive'],
  'cheiro de homem perigoso': ['mysterious', 'seductive'],
  'cheiro de hotel de luxo': ['clean', 'luxury'],
  'perfume sexy discreto': ['seductive', 'intimate'],
  'perfume sexy sem ser doce': ['seductive', 'clean'],
  'perfume frio elegante': ['winter', 'luxury'],
  'perfume de inverno elegante': ['winter', 'luxury'],
  'perfume de camisa branca': ['clean', 'executive'],
  'cheiro de homem limpo': ['clean', 'executive'],
  'perfume tipo executivo': ['executive', 'luxury'],
  'aura executiva': ['executive', 'clean'],
  'cheiro de academia premium': ['clean', 'executive'],
  'cheiro de academia rica': ['clean', 'luxury'],
  'presenca sedutora': ['seductive', 'luxury'],
  'luxo discreto': ['luxury', 'intimate'],
  'assinaturas limpas': ['clean', 'executive'],
  'frescor sofisticado': ['clean', 'luxury'],
  'perfis noturnos intensos': ['mysterious', 'seductive'],
  'perfume intelectual': ['executive', 'intimate'],
  'cheiro de ceo': ['executive', 'luxury'],
  'perfume de homem calmo': ['intimate', 'clean'],
  'perfume de mulher elegante': ['luxury', 'clean'],
};

const SIGNAL_WEIGHTS = { vibe: 0.28, accord: 0.22, notes: 0.12, dna: 0.2, occasion: 0.09, weather: 0.05, projection: 0.04 };

function tokenize(text = '') { return normalizeSearchText(text).split(' ').filter(Boolean); }

function extractSignalsFromProduct(product = {}) {
  const text = normalizeSearchText([
    product.name, product.brand, product.description, product.olfactoryReference, product.performance,
    product.vibe, product.vibeTags, product.occasions, product.occasionTags, product.weatherTags,
    product.accords, product.notes, product.keywords,
  ].flat(Infinity).filter(Boolean).join(' '));
  return { text, dna: generatePerfumeDNA(product) };
}

export function interpretSemanticIntent(query = '') {
  const normalizedQuery = normalizeSearchText(query);
  const directEntry = Object.entries(INTENT_MAP).find(([key]) => normalizedQuery.includes(key));
  const semanticSignals = new Set(directEntry?.[1] ?? []);
  const tokens = tokenize(normalizedQuery);

  Object.entries(INTENT_MAP).forEach(([key, intents]) => {
    const keyTokens = tokenize(key);
    const overlap = keyTokens.filter((token) => tokens.includes(token)).length;
    if (overlap >= Math.max(2, Math.floor(keyTokens.length * 0.45))) intents.forEach((intent) => semanticSignals.add(intent));
  });

  const themes = [...semanticSignals];
  const confidence = Math.min(1, themes.length * 0.2 + (directEntry ? 0.35 : 0));
  return { normalizedQuery, themes, confidence, directMatch: directEntry?.[0] ?? null };
}

export function scoreSemanticMatch(product = {}, interpreted = {}) {
  const { text, dna } = extractSignalsFromProduct(product);
  const themeScores = interpreted.themes.map((theme) => {
    const taxonomy = SEMANTIC_TAXONOMY[theme];
    if (!taxonomy) return { theme, score: 0 };
    const vibeHit = taxonomy.vibes.some((v) => text.includes(normalizeSearchText(v))) ? 1 : 0;
    const accordHit = taxonomy.accords.some((v) => text.includes(normalizeSearchText(v))) ? 1 : 0;
    const noteHit = taxonomy.accords.some((v) => text.includes(normalizeSearchText(v))) ? 1 : 0;
    const occasionHit = taxonomy.occasions.some((v) => text.includes(normalizeSearchText(v))) ? 1 : 0;
    const weatherHit = taxonomy.weather.some((v) => text.includes(normalizeSearchText(v))) ? 1 : 0;
    const projectionHit = taxonomy.projection.some((v) => text.includes(normalizeSearchText(v))) ? 1 : 0;
    const dnaHit = Math.max(dna.elegant ?? 0, dna.seductive ?? 0, dna.fresh ?? 0, dna.warm ?? 0) > 0.45 ? 1 : 0;
    const score = vibeHit * SIGNAL_WEIGHTS.vibe + accordHit * SIGNAL_WEIGHTS.accord + noteHit * SIGNAL_WEIGHTS.notes + dnaHit * SIGNAL_WEIGHTS.dna + occasionHit * SIGNAL_WEIGHTS.occasion + weatherHit * SIGNAL_WEIGHTS.weather + projectionHit * SIGNAL_WEIGHTS.projection;
    return { theme, score: Number(score.toFixed(3)) };
  });

  const total = themeScores.reduce((sum, item) => sum + item.score, 0) / Math.max(1, themeScores.length);
  const confidence = Number((total * (0.55 + interpreted.confidence * 0.45)).toFixed(3));
  return { score: confidence, themeScores, confidence };
}

export function createSemanticExplanation(product, interpreted, scoring) {
  const topThemes = scoring.themeScores.filter((item) => item.score > 0.2).map((item) => item.theme).slice(0, 2);
  if (!topThemes.length) return 'Uma assinatura versátil e refinada para explorar novas direções olfativas com elegância.';
  const phrases = {
    luxury: 'explora madeiras refinadas e sofisticação limpa',
    clean: 'combina frescor limpo, musks e aura impecável',
    seductive: 'constrói presença sedutora com calor elegante',
    mysterious: 'traz profundidade escura, resinosa e envolvente',
    executive: 'projeta elegância executiva com segurança e discrição',
    intimate: 'mantém assinatura de pele sofisticada e próxima',
    winter: 'entrega calor ambarado ideal para clima frio',
  };
  return `Este perfil ${topThemes.map((theme) => phrases[theme]).filter(Boolean).join(' e ')}, alinhado à intenção “${interpreted.directMatch ?? interpreted.normalizedQuery}”.`;
}

export function getSemanticAnalyticsTags(interpreted = {}) {
  const tags = interpreted.themes.sort().slice(0, 3);
  return tags.length ? tags.map((tag) => `${tag}_${tags.includes('clean') ? 'clean' : 'core'}`) : ['fallback_exploratory'];
}

export const semanticLayeringHooks = {
  toBlendVector(product) {
    return generatePerfumeDNA(product);
  },
  getCompatibilitySignals(a, b) {
    const dnaA = generatePerfumeDNA(a);
    const dnaB = generatePerfumeDNA(b);
    return {
      overlap: Math.max(0, 1 - Math.abs((dnaA.fresh ?? 0) - (dnaB.fresh ?? 0)) - Math.abs((dnaA.warm ?? 0) - (dnaB.warm ?? 0))),
      sharedDirections: ['fresh', 'warm', 'woody', 'sweet'].filter((key) => Math.min(dnaA[key] ?? 0, dnaB[key] ?? 0) > 0.35),
    };
  },
  preferenceHooks: { likedVibes: [], dislikedAccords: [], preferredIntensity: null, preferredClimate: null },
};
