import assert from 'node:assert/strict';

import { getCatalogProducts, getProductRecommendations } from '../src/utils/catalog.js';
import { createProductSlug } from '../src/utils/productRouting.js';
import { normalizeSearchText } from '../src/utils/search.js';

const LINE_GENERIC_NAME_TOKENS = new Set([
  'amostra',
  'deo',
  'edc',
  'edp',
  'edt',
  'elixir',
  'extrait',
  'for',
  'intense',
  'limited',
  'kit',
  'edition',
  'extreme',
  'man',
  'men',
  'ml',
  'of',
  'parfum',
  'perfume',
  'pour',
  'spray',
  'woman',
  'women',
  'the',
]);

function getLineTokens(text) {
  return normalizeSearchText(text)
    .split(' ')
    .filter((token) => token.length > 2 && !/^\d+$/.test(token) && !LINE_GENERIC_NAME_TOKENS.has(token));
}

function getRecommendationLineKey(product) {
  const brandTokens = new Set(getLineTokens(product.brand ?? product.normalizedBrand ?? ''));
  const displayName = String(product.name ?? '').split('|').pop() ?? '';
  const nameTokens = getLineTokens(displayName).filter((token) => !brandTokens.has(token));
  const baseKey = nameTokens.length > 0 ? nameTokens.slice(0, Math.min(3, nameTokens.length)).join(' ') : normalizeSearchText(product.name);

  return `${product.normalizedBrand ?? normalizeSearchText(product.brand)}::${baseKey}`;
}

function product(overrides) {
  return {
    id: overrides.id,
    name: overrides.name,
    brand: overrides.brand ?? 'LAZULE',
    category: overrides.category ?? 'Importado',
    gender: overrides.gender ?? 'Unissex',
    salePrice: overrides.salePrice ?? 300,
    image: '',
    badges: overrides.badges ?? [],
    description: '',
    olfactoryReference: overrides.olfactoryReference ?? '',
    available: true,
    featured: false,
    ...overrides,
  };
}

const fixture = getCatalogProducts([
  product({ id: 'masc-current', name: 'Dior | Sauvage EDP 100ml', brand: 'Dior', category: 'Masculinos', gender: 'Masculino', salePrice: 600, olfactoryReference: 'Sauvage' }),
  product({ id: 'masc-1', name: 'Dior | Sauvage Parfum 100ml', brand: 'Dior', category: 'Masculinos', gender: 'Masculino', salePrice: 620, olfactoryReference: 'Dior Sauvage' }),
  product({ id: 'masc-2', name: 'Chanel | Bleu de Chanel EDP 100ml', brand: 'Chanel', category: 'Masculinos', gender: 'Masculino', salePrice: 650, olfactoryReference: 'Bleu de Chanel' }),
  product({ id: 'masc-3', name: 'Prada | Luna Rossa Carbon EDT 100ml', brand: 'Prada', category: 'Masculinos', gender: 'Masculino', salePrice: 540 }),
  product({ id: 'masc-4', name: 'YSL | Y EDP 100ml', brand: 'YSL', category: 'Masculinos', gender: 'Masculino', salePrice: 590 }),
  product({ id: 'fem-current', name: 'Lancôme | Idôle EDP 100ml', brand: 'Lancome', category: 'Femininos', gender: 'Feminino', salePrice: 900 }),
  product({ id: 'fem-1', name: 'Carolina Herrera | Good Girl EDP 80ml', brand: 'CH', category: 'Femininos', gender: 'Feminino', salePrice: 950 }),
  product({ id: 'fem-2', name: 'Lancôme | La Vie Est Belle EDP 100ml', brand: 'Lancome', category: 'Femininos', gender: 'Feminino', salePrice: 900 }),
  product({ id: 'fem-3', name: 'Chloé | Nomade EDP 75ml', brand: 'Chloe', category: 'Femininos', gender: 'Feminino', salePrice: 820 }),
  product({ id: 'fem-4', name: 'Giorgio Armani | My Way EDP 90ml', brand: 'Armani', category: 'Femininos', gender: 'Feminino', salePrice: 930 }),
  product({ id: 'arab-current', name: 'Lattafa | Asad EDP 100ml', brand: 'Lattafa', category: 'Árabe', gender: 'Masculino', salePrice: 220, olfactoryReference: 'Sauvage Elixir' }),
  product({ id: 'arab-1', name: 'Lattafa | Asad Zanzibar EDP 100ml', brand: 'Lattafa', category: 'Árabe', gender: 'Masculino', salePrice: 240, olfactoryReference: 'Sauvage Elixir' }),
  product({ id: 'arab-2', name: 'Afnan | Turathi Blue EDP 90ml', brand: 'Afnan', category: 'Árabe', gender: 'Masculino', salePrice: 260, olfactoryReference: 'Bvlgari Tygar' }),
  product({ id: 'arab-3', name: 'Armaf | Club de Nuit Intense Man EDT 105ml', brand: 'Armaf', category: 'Árabe', gender: 'Masculino', salePrice: 300, olfactoryReference: 'Creed Aventus' }),
  product({ id: 'arab-4', name: 'Maison Alhambra | Salvo Elixir EDP 100ml', brand: 'Maison Alhambra', category: 'Árabe', gender: 'Masculino', salePrice: 210, olfactoryReference: 'Sauvage Elixir' }),
  product({ id: 'niche-current', name: 'Creed | Aventus EDP 100ml', brand: 'Creed', category: 'Nicho', gender: 'Masculino', salePrice: 2200, olfactoryReference: 'Aventus' }),
  product({ id: 'niche-1', name: 'Nishane | Hacivat Extrait 100ml', brand: 'Nishane', category: 'Nicho', gender: 'Masculino', salePrice: 1900, olfactoryReference: 'Creed Aventus' }),
  product({ id: 'niche-2', name: 'Amouage | Reflection Man EDP 100ml', brand: 'Amouage', category: 'Nicho', gender: 'Masculino', salePrice: 2100 }),
  product({ id: 'niche-3', name: 'Xerjoff | Naxos EDP 100ml', brand: 'Xerjoff', category: 'Nicho', gender: 'Masculino', salePrice: 2300 }),
  product({ id: 'niche-4', name: 'Initio | Oud for Greatness EDP 90ml', brand: 'Initio', category: 'Nicho', gender: 'Unissex', salePrice: 2500 }),
  product({ id: 'dupe-id', name: 'Dior | Sauvage EDP 100ml', brand: 'Dior', category: 'Masculinos', gender: 'Masculino', salePrice: 600, olfactoryReference: 'Sauvage' }),
  product({ id: 'dupe-slug-a', name: 'Dior | Homme Intense EDP 100ml', brand: 'Dior', category: 'Masculinos', gender: 'Masculino', salePrice: 610 }),
  product({ id: 'dupe-slug-b', name: 'Dior Homme Intense EDP 100ml', productSlug: createProductSlug('Dior | Homme Intense EDP 100ml'), brand: 'Dior', category: 'Masculinos', gender: 'Masculino', salePrice: 615 }),
]);

function findProduct(id) {
  return fixture.find((item) => item.id === id);
}

function recommend(id, options) {
  return getProductRecommendations(findProduct(id), fixture, options);
}

function assertNoDuplicateRecommendations(recommendations) {
  const ids = new Set();
  const slugs = new Set();
  const names = new Set();

  recommendations.forEach((recommendation) => {
    assert(!ids.has(recommendation.id), `ID duplicado: ${recommendation.id}`);
    assert(!slugs.has(recommendation.productSlug), `slug duplicado: ${recommendation.productSlug}`);

    const normalizedName = normalizeSearchText(recommendation.name);
    assert(!names.has(normalizedName), `nome duplicado: ${recommendation.name}`);

    ids.add(recommendation.id);
    slugs.add(recommendation.productSlug);
    names.add(normalizedName);
  });
}

function assertNoSameExactLine(recommendations) {
  const lineKeys = new Set();

  recommendations.forEach((recommendation) => {
    const lineKey = getRecommendationLineKey(recommendation);

    assert(!lineKeys.has(lineKey), `linha exata duplicada: ${recommendation.name}`);
    lineKeys.add(lineKey);
  });
}

const masculineRecommendations = recommend('masc-current', { min: 4, max: 8 });
assert(masculineRecommendations.length >= 4, 'produto masculino deveria ter recomendações masculinas suficientes');
assert(!masculineRecommendations.some((item) => item.normalizedGender === 'feminino'), 'produto masculino não deve recomendar feminino quando há masculino suficiente');

const feminineRecommendations = recommend('fem-current', { min: 4, max: 8 });
assert(feminineRecommendations.length >= 4, 'produto feminino deveria ter recomendações femininas suficientes');
assert(!feminineRecommendations.some((item) => item.normalizedGender === 'masculino'), 'produto feminino não deve recomendar masculino quando há feminino suficiente');

const arabicRecommendations = recommend('arab-current', { min: 4, max: 8 });
const arabicCount = arabicRecommendations.filter((item) => item.catalogType === 'Árabe').length;
assert(arabicCount > arabicRecommendations.length / 2, 'produto Árabe deve recomendar majoritariamente Árabe');

const nicheRecommendations = recommend('niche-current', { min: 4, max: 8 });
const nicheCount = nicheRecommendations.filter((item) => item.catalogType === 'Nicho').length;
assert(nicheCount > nicheRecommendations.length / 2, 'produto Nicho deve recomendar majoritariamente Nicho');

[masculineRecommendations, feminineRecommendations, arabicRecommendations, nicheRecommendations].forEach(assertNoDuplicateRecommendations);
assert(!masculineRecommendations.some((item) => item.id === 'dupe-id'), 'não deve recomendar cópia do próprio produto por nome/slug normalizado');
assert(masculineRecommendations.filter((item) => item.productSlug === createProductSlug('Dior | Homme Intense EDP 100ml')).length <= 1, 'não deve retornar duplicados por slug');

[masculineRecommendations, feminineRecommendations, arabicRecommendations, nicheRecommendations].forEach(assertNoSameExactLine);

const diversityFixture = getCatalogProducts([
  product({ id: 'spread-current', name: 'Dior | Sauvage EDP 100ml', brand: 'Dior', category: 'Masculinos', gender: 'Masculino', salePrice: 600, olfactoryReference: 'Sauvage' }),
  product({ id: 'spread-1', name: 'Armaf | Club de Nuit EDT 105ml', brand: 'Armaf', category: 'Masculinos', gender: 'Masculino', salePrice: 590, olfactoryReference: 'Sauvage' }),
  product({ id: 'spread-2', name: 'Armaf | Club de Nuit Intense Man EDT 105ml', brand: 'Armaf', category: 'Masculinos', gender: 'Masculino', salePrice: 595, olfactoryReference: 'Sauvage' }),
  product({ id: 'spread-3', name: 'Armaf | Club de Nuit Limited Edition EDP 105ml', brand: 'Armaf', category: 'Masculinos', gender: 'Masculino', salePrice: 605, olfactoryReference: 'Sauvage' }),
  product({ id: 'spread-4', name: 'Chanel | Bleu de Chanel EDP 100ml', brand: 'Chanel', category: 'Masculinos', gender: 'Masculino', salePrice: 610, olfactoryReference: 'Bleu de Chanel' }),
  product({ id: 'spread-5', name: 'Prada | Luna Rossa Carbon EDT 100ml', brand: 'Prada', category: 'Masculinos', gender: 'Masculino', salePrice: 580, olfactoryReference: 'Luna Rossa Carbon' }),
  product({ id: 'spread-6', name: 'YSL | Y EDP 100ml', brand: 'YSL', category: 'Masculinos', gender: 'Masculino', salePrice: 620, olfactoryReference: 'Yves Saint Laurent Y' }),
]);
const diversityRecommendations = getProductRecommendations(diversityFixture[0], diversityFixture, { min: 4, max: 4 });
const diversityIds = diversityRecommendations.map((item) => item.id);
assertNoDuplicateRecommendations(diversityRecommendations);
assertNoSameExactLine(diversityRecommendations);
assert(diversityIds.filter((id) => ['spread-1', 'spread-2', 'spread-3'].includes(id)).length <= 1, 'não deve recomendar várias variações Club de Nuit ao mesmo tempo');
assert(diversityIds.some((id) => ['spread-4', 'spread-5', 'spread-6'].includes(id)), 'recomendações finais devem buscar itens além do primeiro bloco do ranking elegível');

console.log('Recommendation validation passed');
