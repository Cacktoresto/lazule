import { normalizeSearchText } from '../utils/search.js';

export const COLLECTION_STATES = Object.freeze({
  owned: 'owned',
  hadBefore: 'had_before',
  wantToTry: 'want_to_try',
  wishlist: 'wishlist',
  dailySignature: 'daily_signature',
  seasonalFavorite: 'seasonal_favorite',
  nighttimeFavorite: 'nighttime_favorite',
  inspiration: 'inspiration',
});

const WARM_TOKENS = ['ambar', 'âmbar', 'resina', 'baunilha', 'oud', 'oriental', 'quente'];
const FRESH_TOKENS = ['fresco', 'clean', 'limpo', 'citrico', 'cítrico', 'azul', 'aquatico'];
const NIGHT_TOKENS = ['noite', 'noturno', 'intenso', 'sedutor', 'jantar'];
const OFFICE_TOKENS = ['trabalho', 'office', 'executivo', 'profissional', 'formal'];

function norm(value = '') { return normalizeSearchText(String(value || '')); }
function unique(values = []) { return [...new Set(values.filter(Boolean))]; }
function asArray(value) { return Array.isArray(value) ? value : (value ? [value] : []); }

function extractProfile(product = {}) {
  const text = norm([
    product.name, product.brand, product.description, product.searchIndex,
    ...asArray(product.vibe), ...asArray(product.occasions), ...asArray(product.notes), ...asArray(product.badges),
  ].join(' '));
  return {
    warm: WARM_TOKENS.some((token) => text.includes(norm(token))),
    fresh: FRESH_TOKENS.some((token) => text.includes(norm(token))),
    night: NIGHT_TOKENS.some((token) => text.includes(norm(token))),
    office: OFFICE_TOKENS.some((token) => text.includes(norm(token))),
  };
}

export function aggregateCollection(collectionEntries = []) {
  const normalized = collectionEntries.filter(Boolean).map((entry, index) => ({
    id: entry.id ?? `${entry.product?.productSlug ?? entry.product?.name ?? 'item'}-${index}`,
    state: entry.state ?? COLLECTION_STATES.owned,
    product: entry.product ?? {},
    ts: Number(entry.ts) || index,
    profile: extractProfile(entry.product),
  }));

  const byState = normalized.reduce((acc, item) => {
    acc[item.state] = (acc[item.state] || 0) + 1;
    return acc;
  }, {});

  return { items: normalized, byState, count: normalized.length };
}

export function analyzeCollectionWardrobe(collectionEntries = [], { tasteMemory = null } = {}) {
  const aggregated = aggregateCollection(collectionEntries);
  const owned = aggregated.items.filter((item) => [COLLECTION_STATES.owned, COLLECTION_STATES.dailySignature, COLLECTION_STATES.seasonalFavorite, COLLECTION_STATES.nighttimeFavorite].includes(item.state));
  const profileCounts = owned.reduce((acc, item) => {
    Object.entries(item.profile).forEach(([key, value]) => { if (value) acc[key] = (acc[key] || 0) + 1; });
    return acc;
  }, { warm: 0, fresh: 0, night: 0, office: 0 });

  const redundancySignals = [];
  if (profileCounts.fresh >= 3 && profileCounts.fresh > profileCounts.warm + 1) redundancySignals.push('Você já explora com força assinaturas limpas e frescas.');
  if (profileCounts.office >= 3) redundancySignals.push('Sua rotação tende para presença executiva recorrente.');

  const gaps = [];
  if (profileCounts.warm === 0) gaps.push('missing_warm');
  if (profileCounts.night === 0) gaps.push('missing_night');
  if (profileCounts.fresh === 0) gaps.push('missing_fresh');

  const balancingDirections = unique([
    gaps.includes('missing_warm') ? 'Explorar assinaturas âmbar mais quentes' : null,
    gaps.includes('missing_night') ? 'Adicionar presença noturna refinada' : null,
    gaps.includes('missing_fresh') ? 'Abrir espaço para frescor elegante' : null,
    profileCounts.office > 2 ? 'Adicionar contraste intimista e macio' : null,
  ]).slice(0, 4);

  const feelLike = profileCounts.warm > profileCounts.fresh
    ? 'Sua coleção transmite calor sofisticado e profundidade discreta.'
    : 'Sua coleção transmite luxo discreto e frescor refinado.';

  const atmosphere = profileCounts.night > profileCounts.fresh
    ? 'cinematic_night'
    : (profileCounts.warm >= profileCounts.fresh ? 'warm_editorial' : 'clean_luminous');

  const evolution = {
    summary: tasteMemory?.evolution?.summary ?? 'Sua direção olfativa está em construção com consistência elegante.',
    timeline: [
      'Exploração inicial orientada por versatilidade.',
      'Curadoria evoluindo para assinaturas mais autorais.',
    ],
  };

  return {
    aggregated,
    profileCounts,
    redundancySignals,
    gaps,
    balancingDirections,
    feelLike,
    atmosphere,
    evolution,
    recommendationsBrief: balancingDirections.map((label) => ({ label, type: 'wardrobe_balance' })),
  };
}
