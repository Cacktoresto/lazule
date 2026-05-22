import { normalizeSearchText } from '../utils/search.js';

const TERM_TAXONOMY = Object.freeze({
  accords: {
    aquatic: ['aquatico', 'aquática', 'aquatic', 'marine', 'marinho', 'ozonic', 'ozonico', 'algas'],
    citrus: ['citrico', 'cítrico', 'citrus', 'bergamota', 'limao', 'limão', 'grapefruit', 'neroli'],
    woody: ['amadeirado', 'madeira', 'madeiras', 'cedro', 'sandalo', 'sândalo', 'vetiver', 'patchouli'],
    spicy: ['especiado', 'spicy', 'pimenta', 'canela', 'cardamomo', 'cravo'],
    sweet: ['doce', 'adocicado', 'gourmand', 'caramelo', 'praline', 'chocolate', 'mel'],
    amber: ['ambar', 'âmbar', 'amber', 'resinoso', 'incenso', 'labdano', 'benjoim'],
    aromatic: ['aromatico', 'aromático', 'lavanda', 'sálvia', 'salvia', 'geranio'],
    floral: ['floral', 'rosa', 'jasmim', 'tuberosa', 'ylang'],
    clean: ['limpo', 'clean', 'sabao', 'sabão', 'musk', 'almiscarado'],
    metallic: ['metalico', 'metálico', 'aldeidico', 'aldeídico', 'mineral'],
    leathery: ['couro', 'leather', 'suede'],
  },
});

const OCCASION_RULES = [
  { id: 'executivo', when: (ctx) => ctx.clean + ctx.citrus + ctx.aromatic >= 2 && ctx.intensity < 0.7 },
  { id: 'sedutor_noturno', when: (ctx) => ctx.sweet + ctx.spicy + ctx.amber >= 2 && ctx.intensity >= 0.65 },
  { id: 'casual_urbano', when: (ctx) => ctx.woody + ctx.aromatic >= 1 && ctx.intensity >= 0.45 && ctx.intensity < 0.75 },
  { id: 'verao_energetico', when: (ctx) => ctx.citrus + ctx.aquatic + ctx.clean >= 2 },
  { id: 'inverno_refinado', when: (ctx) => ctx.amber + ctx.woody + ctx.spicy >= 2 },
];

function arr(v) { return Array.isArray(v) ? v.flatMap(arr) : v == null ? [] : String(v).split(/[;,|]/).map((x) => x.trim()).filter(Boolean); }
function uniq(v = []) { return [...new Set(v)]; }
function n(v) { return normalizeSearchText(v); }

function textFromProduct(product = {}) {
  return n([
    product.name, product.brand, product.description, product.notes, product.keywords, product.accords,
    product.vibe, product.tags, product.occasions, product.weather, product.performance, product.olfactoryReference,
  ].flat(Infinity).filter(Boolean).join(' '));
}

function extractMatches(text, dictionary) {
  return Object.entries(dictionary).filter(([, tokens]) => tokens.some((token) => text.includes(n(token)))).map(([key]) => key);
}

export function classifyOlfactiveTemperature({ accords = [] } = {}) {
  const warm = ['amber', 'sweet', 'spicy', 'woody', 'leathery'].filter((a) => accords.includes(a)).length;
  const cool = ['citrus', 'aquatic', 'clean', 'metallic', 'aromatic'].filter((a) => accords.includes(a)).length;
  if (warm - cool >= 2) return 'quente';
  if (cool - warm >= 2) return 'fria';
  return 'morna';
}

export function inferProjection({ intensity = 0.5, accords = [] } = {}) {
  if (intensity >= 0.82 || (accords.includes('amber') && accords.includes('sweet'))) return 'explosiva';
  if (intensity >= 0.64) return 'marcante';
  if (intensity >= 0.42) return 'moderada';
  return 'intimista';
}

export function inferSignatureStyle({ accords = [], temperature } = {}) {
  if (accords.includes('clean') && accords.includes('aquatic')) return 'assinatura limpa';
  if (accords.includes('spicy') && accords.includes('amber')) return 'assinatura especiada';
  if (accords.includes('sweet') && accords.includes('amber')) return 'assinatura cremosa';
  if (accords.includes('metallic')) return 'assinatura metálica';
  return temperature === 'quente' ? 'assinatura densa' : 'assinatura luminosa';
}

export function inferPersonality({ accords = [], projection = 'moderada' } = {}) {
  if (projection === 'explosiva' || accords.includes('metallic')) return 'provocativo';
  if (accords.includes('clean') && accords.includes('citrus')) return 'energético';
  if (accords.includes('sweet') && accords.includes('amber')) return 'sedutor';
  if (projection === 'intimista') return 'discreto';
  return 'elegante casual';
}

export function inferOccasion(profile) {
  const ctx = {
    ...Object.fromEntries(Object.keys(TERM_TAXONOMY.accords).map((k) => [k, profile.accords.includes(k) ? 1 : 0])),
    intensity: profile.intensity,
  };
  const hit = OCCASION_RULES.find((rule) => rule.when(ctx));
  return hit?.id ?? 'uso_versatil';
}

export function buildOlfactiveProfile(product = {}) {
  const text = textFromProduct(product);
  const accords = uniq([...(arr(product.accords).map(n)), ...extractMatches(text, TERM_TAXONOMY.accords)]);
  const notes = uniq(arr(product.notes).map((x) => x.toLowerCase()));
  const intensity = Math.min(1, Math.max(0.28, (accords.includes('amber') || accords.includes('sweet') ? 0.68 : 0.48) + (n(product.performance).includes('intens') ? 0.18 : 0)));
  const temperature = classifyOlfactiveTemperature({ accords });
  const projection = inferProjection({ intensity, accords });
  const signature = inferSignatureStyle({ accords, temperature });
  const personality = inferPersonality({ accords, projection });
  const occasion = inferOccasion({ accords, intensity });
  const vibe = uniq([personality, signature, temperature === 'quente' ? 'noturno' : 'solar']).slice(0, 3);
  return { accords, notes, intensity, projection, fixation: intensity >= 0.7 ? 'alta' : intensity >= 0.5 ? 'moderada' : 'suave', occasion, climate: temperature === 'quente' ? 'frio/ameno' : 'quente/ameno', vibe, signature, personality, temperature };
}

export function buildOlfactiveNarrative(profile = {}) {
  const accordLead = profile.accords.slice(0, 2).join(' + ') || 'perfil olfativo';
  const opening = profile.temperature === 'fria' ? 'abertura limpa e arejada' : profile.temperature === 'quente' ? 'abertura densa e envolvente' : 'abertura equilibrada';
  const body = profile.signature;
  return `${accordLead} com ${opening}, ${body} e presença ${profile.projection}.`;
}
