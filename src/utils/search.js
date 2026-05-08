const IGNORED_BRAND_PREFIXES = new Set(['perfume', 'kit', 'the', 'a', 'o', 'la', 'el']);

const OLFACTORY_ALIASES = {
  sauvage: ['dior sauvage'],
  savauge: ['dior sauvage', 'sauvage'],
  bleu: ['bleu de chanel', 'chanel bleu'],
  aventus: ['creed aventus'],
  baccarat: ['maison francis kurkdjian baccarat rouge 540', 'baccarat rouge'],
  delina: ['parfums de marly delina'],
  invictus: ['paco rabanne invictus', 'rabanne invictus'],
  hacivat: ['nishane hacivat'],
  erba: ['xerjoff erba pura'],
  pura: ['xerjoff erba pura'],
};

export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferBrandFromName(name) {
  const normalizedName = String(name ?? '').trim();

  if (!normalizedName) {
    return 'LAZULE';
  }

  if (normalizedName.includes('|')) {
    return normalizedName.split('|')[0].trim() || 'LAZULE';
  }

  const relevantWord = normalizedName
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}-]/gu, '').trim())
    .find((word) => word && !IGNORED_BRAND_PREFIXES.has(normalizeSearchText(word)));

  return relevantWord || 'LAZULE';
}

function getAliasText(value) {
  const normalizedValue = normalizeSearchText(value);
  const terms = normalizedValue.split(' ').filter(Boolean);
  const aliases = terms.flatMap((term) => OLFACTORY_ALIASES[term] ?? []);

  return aliases.join(' ');
}

export function createSearchIndex(product) {
  const baseText = [
    product.name,
    product.brand,
    product.category,
    product.catalogType,
    product.gender,
    ...(product.badges ?? []),
    product.olfactoryReference,
    product.description,
    product.rawText,
  ].filter(Boolean).join(' ');

  return normalizeSearchText([baseText, getAliasText(baseText)].filter(Boolean).join(' '));
}

export function createSearchTokens(product) {
  return [...new Set(createSearchIndex(product).split(' ').filter(Boolean))];
}

function getExpandedSearchTerms(searchText) {
  const normalizedSearch = normalizeSearchText(searchText);
  const terms = normalizedSearch.split(' ').filter(Boolean);
  const aliasTerms = terms
    .flatMap((term) => OLFACTORY_ALIASES[term] ?? [])
    .flatMap((alias) => normalizeSearchText(alias).split(' ').filter(Boolean));

  return [...new Set([...terms, ...aliasTerms])];
}

function getBoundedDistance(a, b, maxDistance) {
  if (Math.abs(a.length - b.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];

    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + substitutionCost);
      rowMin = Math.min(rowMin, current[j]);
    }

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function getAllowedDistance(term) {
  if (term.length <= 3) {
    return 0;
  }

  if (term.length <= 6) {
    return 1;
  }

  return 2;
}

function termMatchesToken(term, token) {
  if (token.includes(term) || term.includes(token)) {
    return true;
  }

  const allowedDistance = getAllowedDistance(term);
  return allowedDistance > 0 && getBoundedDistance(term, token, allowedDistance) <= allowedDistance;
}

export function matchesSmartSearch(product, searchText) {
  const terms = getExpandedSearchTerms(searchText);

  if (terms.length === 0) {
    return true;
  }

  const tokens = product.searchTokens ?? product.searchIndex?.split(' ').filter(Boolean) ?? [];

  return terms.every((term) => product.searchIndex.includes(term) || tokens.some((token) => termMatchesToken(term, token)));
}
