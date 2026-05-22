import { normalizeSearchText } from '../utils/search.js';

const TAXONOMY = Object.freeze({
  accords: {
    aquatic: ['aquatico', 'aquática', 'aquatic', 'marine', 'marinho', 'ozonic', 'ozonico', 'salty'],
    citrus: ['citrico', 'cítrico', 'citrus', 'bergamota', 'limao', 'limão', 'grapefruit', 'neroli', 'mandarina'],
    woody: ['amadeirado', 'madeira', 'madeiras', 'cedro', 'sandalo', 'sândalo', 'vetiver', 'patchouli'],
    spicy: ['especiado', 'spicy', 'pimenta', 'canela', 'cardamomo', 'cravo'],
    fresh_spicy: ['fresh spicy', 'especiado fresco', 'aromatic spicy'],
    sweet: ['doce', 'adocicado', 'gourmand', 'caramelo', 'praline', 'chocolate', 'mel'],
    amber: ['ambar', 'âmbar', 'amber', 'resinoso', 'incenso', 'labdano', 'benjoim'],
    aromatic: ['aromatico', 'aromático', 'lavanda', 'sálvia', 'salvia', 'geranio'],
    musky: ['musk', 'almiscarado', 'muskado'],
    powdery: ['atalcado', 'powdery', 'talco', 'iris'],
    smoky: ['defumado', 'smoky', 'fumaça', 'incenso queimado'],
    vanilla: ['baunilha', 'vanilla'],
    green: ['verde', 'green', 'folhas', 'grama'],
    metallic: ['metalico', 'metálico', 'aldeidico', 'aldeídico', 'mineral'],
    creamy: ['cremoso', 'creamy', 'lactonico', 'lactônico'],
    balsamic: ['balsamico', 'balsâmico', 'resina', 'benjoim'],
    floral: ['floral', 'rosa', 'jasmim', 'tuberosa', 'ylang'],
    tropical: ['tropical', 'manga', 'abacaxi', 'maracuja', 'coco'],
    leathery: ['couro', 'leather', 'suede'],
    fruity: ['frutado', 'fruity', 'maçã', 'pera', 'framboesa']
  },
  notes: {
    bergamot: ['bergamot', 'bergamota'], grapefruit: ['grapefruit', 'toranja'], lemon: ['lemon', 'limao', 'limão'],
    lavender: ['lavender', 'lavanda'], cardamom: ['cardamom', 'cardamomo'], iris: ['iris', 'orris'],
    tonka_bean: ['tonka', 'fava tonka'], ambergris: ['ambergris', 'ambar gris'], patchouli: ['patchouli', 'patchouly'],
    vanilla: ['vanilla', 'baunilha'], sandalwood: ['sandalwood', 'sândalo', 'sandalo'], musk: ['musk', 'almiscar'],
  }
});

const CONTROLLED_ENUMS = Object.freeze({
  temperature: ['cold', 'fresh', 'balanced', 'warm', 'hot'],
  personality: ['executive', 'seductive', 'urban', 'loud', 'intimate', 'clean', 'provocative', 'luxurious', 'sporty', 'mysterious', 'playful', 'dominant', 'elegant', 'rebellious', 'sensual', 'mature', 'youthful'],
  usage: ['office', 'daily', 'nightlife', 'luxury_dinner', 'hot_weather', 'winter', 'gym', 'signature', 'formal', 'casual', 'romantic', 'beach', 'upscale_social'],
  signature: ['clean_luxury', 'seductive_night', 'modern_fresh', 'dark_smoky', 'tropical_energy', 'creamy_comfort', 'loud_clubbing', 'elegant_amber', 'masculine_woody', 'citrus_executive', 'sweet_attention'],
  climate: ['summer', 'winter', 'spring', 'autumn', 'tropical_heat', 'cold_night', 'rainy_weather'],
});

function arr(v) { return Array.isArray(v) ? v.flatMap(arr) : v == null ? [] : String(v).split(/[;,|]/).map((x) => x.trim()).filter(Boolean); }
function uniq(v = []) { return [...new Set(v)]; }
function n(v) { return normalizeSearchText(v); }
const clamp = (x, min = 0, max = 1) => Math.max(min, Math.min(max, Number(x) || 0));

function textFromProduct(product = {}) {
  return n([product.name, product.brand, product.description, product.notes, product.keywords, product.accords, product.vibe, product.tags, product.occasions, product.weather, product.performance, product.olfactoryReference].flat(Infinity).filter(Boolean).join(' '));
}

function extractMatches(text, dictionary) {
  return Object.entries(dictionary).filter(([, tokens]) => tokens.some((token) => text.includes(n(token)))).map(([key]) => key);
}

function inferTemperature(accords = []) {
  const warm = ['amber', 'sweet', 'spicy', 'woody', 'leathery', 'vanilla', 'smoky'].filter((a) => accords.includes(a)).length;
  const cool = ['citrus', 'aquatic', 'musky', 'metallic', 'aromatic', 'green'].filter((a) => accords.includes(a)).length;
  if (warm >= 4) return 'hot';
  if (warm - cool >= 2) return 'warm';
  if (cool >= 4) return 'cold';
  if (cool - warm >= 2) return 'fresh';
  return 'balanced';
}

function inferPerformance(intensity, accords = [], text = '') {
  const normalized = n(text);
  const heavy = accords.includes('amber') || accords.includes('smoky') || accords.includes('sweet');
  const loudSignal = normalized.includes('beast') || normalized.includes('projecao alta') || normalized.includes('projeção alta');
  const projection = loudSignal || intensity > 0.86 ? 'beast_mode' : intensity > 0.72 ? 'high' : intensity > 0.52 ? 'moderate' : 'low';
  const longevity = heavy && intensity > 0.66 ? 'high' : intensity > 0.82 ? 'beast_mode' : intensity > 0.5 ? 'moderate' : 'low';
  const sillage = projection;
  const versatility = accords.includes('citrus') || accords.includes('aquatic') ? (intensity > 0.78 ? 'moderate' : 'high') : intensity > 0.75 ? 'low' : 'moderate';
  return { projection, longevity, sillage, versatility };
}

function inferSemanticContext({ accords = [], temperature = 'balanced', performance = {} } = {}) {
  const personality = [];
  const usageContext = [];
  const climate = [];
  let signature = 'modern_fresh';

  if (accords.includes('citrus') && accords.includes('aquatic')) { personality.push('clean', 'executive'); usageContext.push('office', 'daily'); signature = 'clean_luxury'; }
  if (accords.includes('sweet') && accords.includes('amber')) { personality.push('seductive', 'sensual'); usageContext.push('nightlife', 'romantic'); signature = 'seductive_night'; }
  if (accords.includes('smoky') || accords.includes('leathery')) { personality.push('dominant', 'mysterious'); if (signature !== 'seductive_night') signature = 'dark_smoky'; }
  if (accords.includes('tropical') || accords.includes('fruity')) { personality.push('playful', 'youthful'); usageContext.push('casual', 'beach'); signature = 'tropical_energy'; }
  if (accords.includes('woody') && accords.includes('spicy')) { personality.push('urban', 'elegant'); usageContext.push('formal', 'upscale_social'); signature = signature === 'modern_fresh' ? 'masculine_woody' : signature; }
  if (performance.projection === 'beast_mode') personality.push('loud', 'provocative');
  if (temperature === 'cold' || temperature === 'fresh') { climate.push('summer', 'tropical_heat'); usageContext.push('hot_weather'); }
  if (temperature === 'warm' || temperature === 'hot') { climate.push('winter', 'cold_night'); usageContext.push('winter', 'luxury_dinner'); }

  return {
    personality: uniq(personality).filter((x) => CONTROLLED_ENUMS.personality.includes(x)).slice(0, 4),
    usageContext: uniq(usageContext).filter((x) => CONTROLLED_ENUMS.usage.includes(x)).slice(0, 4),
    signature,
    climate: uniq(climate).filter((x) => CONTROLLED_ENUMS.climate.includes(x)).slice(0, 3),
  };
}

function inferConfidence({ accords = [], notes = [], description = '', olfactoryReference = '' } = {}) {
  const derivedFrom = [];
  if (accords.length) derivedFrom.push('accords');
  if (notes.length) derivedFrom.push('notes');
  if (n(description)) derivedFrom.push('description');
  if (n(olfactoryReference)) derivedFrom.push('olfactoryReference');
  const signalCount = derivedFrom.length;
  const confidence = clamp((accords.length * 0.08) + (notes.length * 0.06) + signalCount * 0.14, 0.18, 0.96);
  return { confidence: Number(confidence.toFixed(2)), derivedFrom, signalCount, tier: confidence >= 0.75 ? 'high' : confidence >= 0.52 ? 'medium' : 'low' };
}

export function buildOlfactiveProfile(product = {}) {
  const text = textFromProduct(product);
  const accords = uniq([...(arr(product.accords).map(n)), ...extractMatches(text, TAXONOMY.accords)]);
  const notes = uniq([...(arr(product.notes).map(n)), ...extractMatches(text, TAXONOMY.notes)]);
  const topNotes = notes.filter((note) => ['bergamot', 'grapefruit', 'lemon'].includes(note));
  const middleNotes = notes.filter((note) => ['lavender', 'cardamom', 'iris'].includes(note));
  const baseNotes = notes.filter((note) => ['tonka_bean', 'ambergris', 'patchouli', 'vanilla', 'sandalwood', 'musk'].includes(note));
  const intensity = clamp((accords.includes('amber') || accords.includes('sweet') ? 0.68 : 0.45) + (n(product.performance).includes('intens') ? 0.18 : 0) + (baseNotes.length >= 2 ? 0.09 : 0), 0.24, 0.95);
  const temperature = inferTemperature(accords);
  const performance = inferPerformance(intensity, accords, [product.performance, product.performanceLabel, product.projectionLabel].join(' '));
  const context = inferSemanticContext({ accords, temperature, performance });
  const confidenceLayer = inferConfidence({ accords, notes, description: product.description, olfactoryReference: product.olfactoryReference });
  const vibe = uniq([
    context.personality.includes('clean') ? 'pós-banho' : '',
    context.usageContext.includes('office') ? 'executivo moderno' : '',
    context.usageContext.includes('nightlife') ? 'noite urbana' : '',
    context.usageContext.includes('beach') ? 'praia premium' : '',
    context.signature === 'dark_smoky' ? 'roupa social preta' : '',
  ].filter(Boolean)).slice(0, 3);

  return {
    accords,
    notes,
    topNotes,
    middleNotes,
    baseNotes,
    intensity,
    temperature,
    personality: context.personality[0] ?? 'elegant',
    personalities: context.personality,
    occasion: context.usageContext[0] ?? 'daily',
    usageContext: context.usageContext,
    signature: context.signature,
    climate: context.climate,
    vibe,
    performance,
    confidenceLayer,
  };
}

export function buildOlfactiveNarrative(profile = {}) {
  const leadRaw = profile.accords?.slice(0, 2).join(' + ') || 'perfil olfativo';
  const lead = leadRaw.charAt(0).toUpperCase() + leadRaw.slice(1);
  const tone = profile.temperature === 'hot' || profile.temperature === 'warm' ? 'textura quente e mais densa' : profile.temperature === 'cold' || profile.temperature === 'fresh' ? 'textura fresca e arejada' : 'textura equilibrada';
  const text = `${lead} com ${tone}, assinatura ${profile.signature || 'modern_fresh'} e presença ${profile.performance?.projection || 'moderate'}.`;
  return text.length <= 88 ? text : `${lead} ${profile.signature || 'modern_fresh'} com presença ${profile.performance?.projection || 'moderate'}.`;
}
