import { isAvailableForImmediateFilter } from './availability.js';
import { matchesSmartSearch, normalizeSearchText } from './search.js';

export const ALL_FILTER_VALUE = 'Todos';

export const CATALOG_TYPE_OPTIONS = ['Importado', 'Árabe', 'Nicho', 'Contratipo', 'Outros'];

export const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Unissex'];

export const AVAILABILITY_FILTER_OPTIONS = [
  { label: 'Todas', value: 'all' },
  { label: 'Pronta entrega', value: 'pronta' },
  { label: 'Sob encomenda', value: 'encomenda' },
  { label: 'Sob consulta', value: 'sob_consulta' },
  { label: 'Referência olfativa', value: 'referencia' },
  { label: 'Indisponível', value: 'indisponivel' },
];

export const PRICE_RANGES = [
  { label: 'Todos os preços', value: 'all', min: 0, max: Infinity },
  { label: 'Até R$ 150', value: 'until-150', min: 0, max: 150 },
  { label: 'R$ 150 a R$ 300', value: '150-300', min: 150, max: 300 },
  { label: 'R$ 300 a R$ 500', value: '300-500', min: 300, max: 500 },
  { label: 'Acima de R$ 500', value: 'above-500', min: 500, max: Infinity },
];

export const SORT_OPTIONS = [
  { label: 'Destaques', value: 'featured' },
  { label: 'Menor preço', value: 'price-asc' },
  { label: 'Maior preço', value: 'price-desc' },
  { label: 'Nome A-Z', value: 'name-asc' },
  { label: 'Nome Z-A', value: 'name-desc' },
];

const ARABIC_BRANDS = new Set([
  'afnan',
  'ajmal',
  'al haramain',
  'al wataniah',
  'ard al zaafaran',
  'armaf',
  'asdaaf',
  'aurora scents',
  'emper',
  'fragrance world',
  'french avenue',
  'khadlaj',
  'lattafa',
  'maison alhambra',
  'orientica',
  'paris corner',
  'rasasi',
  'rayhaan',
  'riiffs',
  'swiss arabian',
  'zimaya',
]);

const NICHE_BRANDS = new Set([
  'amouage',
  'creed',
  'initio',
  'nishane',
  'parfums de marly',
  'stephane humbert lucas',
  'xerjoff',
]);

const IMPORTED_DESIGNER_BRANDS = new Set([
  'acqua',
  'armani',
  'azzaro',
  'bvlgari',
  'ch',
  'chloe',
  'ck',
  'd g',
  'dior',
  'flower',
  'givenchy',
  'gucci',
  'hugo',
  'jpg',
  'lancome',
  'mugler',
  'pr',
  'prada',
  'sisterland',
  'tom ford',
  'valentino donna',
  'versace',
]);

const CONTRATYPE_TERMS = ['contratipo', 'contra tipo'];
const ARABIC_TERMS = ['arabe', 'arabes', 'oriental arabe'];
const NICHE_TERMS = ['nicho'];
const OTHER_TERMS = ['kit', 'outro', 'outros', 'presente'];

function containsAnyTerm(text, terms) {
  return terms.some((term) => text.includes(term));
}

function normalizeCatalogType(value) {
  const normalizedValue = normalizeSearchText(value);
  const catalogType = CATALOG_TYPE_OPTIONS.find((option) => normalizeSearchText(option) === normalizedValue);

  return catalogType ?? value;
}

function getPriceRange(value) {
  return PRICE_RANGES.find((range) => range.value === value) ?? PRICE_RANGES[0];
}

function compareByFeatured(a, b) {
  return (
    Number(b.featured) - Number(a.featured) ||
    Number(isAvailableForImmediateFilter(b)) - Number(isAvailableForImmediateFilter(a)) ||
    a.name.localeCompare(b.name, 'pt-BR')
  );
}

export function inferCatalogType(product) {
  const normalizedCategory = normalizeSearchText(product?.category);
  const normalizedBrand = normalizeSearchText(product?.brand);
  const searchableText = normalizeSearchText([
    product?.name,
    product?.brand,
    product?.category,
    ...(product?.badges ?? []),
    product?.catalogType,
    product?.description,
  ].filter(Boolean).join(' '));

  if (ARABIC_BRANDS.has(normalizedBrand)) {
    return 'Árabe';
  }

  if (NICHE_BRANDS.has(normalizedBrand)) {
    return 'Nicho';
  }

  if (IMPORTED_DESIGNER_BRANDS.has(normalizedBrand)) {
    return 'Importado';
  }

  if (containsAnyTerm(searchableText, CONTRATYPE_TERMS)) {
    return 'Contratipo';
  }

  if (containsAnyTerm(searchableText, ARABIC_TERMS)) {
    return 'Árabe';
  }

  if (containsAnyTerm(searchableText, NICHE_TERMS)) {
    return 'Nicho';
  }

  if (containsAnyTerm(normalizedCategory, OTHER_TERMS) || containsAnyTerm(searchableText, OTHER_TERMS)) {
    return 'Outros';
  }

  return 'Outros';
}

export function countCatalogProductsByType(products) {
  return products.reduce((counts, product) => {
    const catalogType = product.catalogType ?? inferCatalogType(product);

    return {
      ...counts,
      [catalogType]: (counts[catalogType] ?? 0) + 1,
    };
  }, {});
}

export function matchesCatalogFilters(product, filters, searchTerm = '') {
  const normalizedSearch = normalizeSearchText(searchTerm);
  const priceRange = getPriceRange(filters.priceRange);
  const availabilityKey = product.availability?.key;
  const productPrice = Number(product.salePrice ?? product.price ?? 0);
  const productType = product.catalogType ?? inferCatalogType(product);
  const selectedCategory = normalizeCatalogType(filters.category);

  const matchesCategory = selectedCategory === ALL_FILTER_VALUE || productType === selectedCategory;
  const matchesGender = filters.gender === ALL_FILTER_VALUE || product.gender === filters.gender;
  const matchesBrand = filters.brand === ALL_FILTER_VALUE || product.brand === filters.brand;
  const matchesPrice = productPrice >= priceRange.min && productPrice <= priceRange.max;
  const matchesImage =
    filters.imageMode === 'all' ||
    (filters.imageMode === 'with' && Boolean(product.image)) ||
    (filters.imageMode === 'without' && !product.image);
  const matchesAvailabilityOnly = !filters.availableOnly || isAvailableForImmediateFilter(product);
  const selectedAvailabilityStatus = filters.availabilityStatus ?? 'all';
  const matchesAvailabilityStatus = selectedAvailabilityStatus === 'all' || availabilityKey === selectedAvailabilityStatus;

  return (
    matchesSmartSearch(product, normalizedSearch) &&
    matchesCategory &&
    matchesGender &&
    matchesBrand &&
    matchesPrice &&
    matchesImage &&
    matchesAvailabilityOnly &&
    matchesAvailabilityStatus
  );
}

export function sortCatalogProducts(productsToSort, sortBy) {
  const sortedProducts = [...productsToSort];

  if (sortBy === 'price-asc') {
    return sortedProducts.sort((a, b) => a.salePrice - b.salePrice || compareByFeatured(a, b));
  }

  if (sortBy === 'price-desc') {
    return sortedProducts.sort((a, b) => b.salePrice - a.salePrice || compareByFeatured(a, b));
  }

  if (sortBy === 'name-asc') {
    return sortedProducts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  if (sortBy === 'name-desc') {
    return sortedProducts.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
  }

  return sortedProducts.sort(compareByFeatured);
}

export function filterAndSortCatalogProducts(products, filters, searchTerm) {
  return sortCatalogProducts(
    products.filter((product) => matchesCatalogFilters(product, filters, searchTerm)),
    filters.sortBy,
  );
}
