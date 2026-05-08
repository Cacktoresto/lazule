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

export function getExpandedSearchTerms(searchText) {
  const normalizedSearch = normalizeSearchText(searchText);
  const terms = normalizedSearch.split(' ').filter(Boolean);
  const aliasTerms = terms
    .flatMap((term) => OLFACTORY_ALIASES[term] ?? [])
    .flatMap((alias) => normalizeSearchText(alias).split(' ').filter(Boolean));

  return [...new Set([...terms, ...aliasTerms])];
}

function getExpandedSearchPhrases(searchText) {
  const normalizedSearch = normalizeSearchText(searchText);
  const aliasPhrases = normalizedSearch
    .split(' ')
    .filter(Boolean)
    .flatMap((term) => OLFACTORY_ALIASES[term] ?? [])
    .map(normalizeSearchText)
    .filter(Boolean);

  return [...new Set([normalizedSearch, ...aliasPhrases].filter(Boolean))];
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
  if (token.includes(term) || (token.length >= 4 && term.includes(token))) {
    return true;
  }

  const allowedDistance = getAllowedDistance(term);
  return allowedDistance > 0 && getBoundedDistance(term, token, allowedDistance) <= allowedDistance;
}

function allSearchTermsMatchText(terms, text) {
  if (!text || terms.length === 0) {
    return false;
  }

  const tokens = text.split(' ').filter(Boolean);

  return terms.every((term) => text.includes(term) || tokens.some((token) => termMatchesToken(term, token)));
}

function getNormalizedNameCandidates(product) {
  const rawName = String(product.name ?? '');
  const parts = rawName.split('|').map((part) => normalizeSearchText(part)).filter(Boolean);

  return [...new Set([normalizeSearchText(rawName), ...parts])];
}

function getFieldMatchScore({ phrases, terms, text, exactScore, startsWithScore, includesScore, fuzzyScore = 0 }) {
  const normalizedText = normalizeSearchText(text);

  if (!normalizedText) {
    return 0;
  }

  if (phrases.some((phrase) => phrase && normalizedText === phrase)) {
    return exactScore;
  }

  if (phrases.some((phrase) => phrase && normalizedText.startsWith(`${phrase} `))) {
    return startsWithScore;
  }

  if (phrases.some((phrase) => phrase && normalizedText.includes(phrase))) {
    return includesScore;
  }

  return fuzzyScore && allSearchTermsMatchText(terms, normalizedText) ? fuzzyScore : 0;
}

function getNameMatchScore(product, phrases, terms) {
  return Math.max(
    0,
    ...getNormalizedNameCandidates(product).map((nameCandidate) =>
      getFieldMatchScore({
        phrases,
        terms,
        text: nameCandidate,
        exactScore: 1000,
        startsWithScore: 900,
        includesScore: 800,
        fuzzyScore: 760,
      }),
    ),
  );
}

function getProductNavigationScore(product, searchText) {
  const terms = getExpandedSearchTerms(searchText);
  const phrases = getExpandedSearchPhrases(searchText);

  if (terms.length === 0) {
    return 0;
  }

  const nameScore = getNameMatchScore(product, phrases, terms);
  const brandScore = getFieldMatchScore({ phrases, terms, text: product.brand, exactScore: 720, startsWithScore: 700, includesScore: 680, fuzzyScore: 660 });
  const olfactoryScore = getFieldMatchScore({
    phrases,
    terms,
    text: product.olfactoryReference,
    exactScore: 620,
    startsWithScore: 600,
    includesScore: 580,
    fuzzyScore: 560,
  });
  const descriptionScore = getFieldMatchScore({ phrases, terms, text: product.description, exactScore: 520, startsWithScore: 500, includesScore: 480, fuzzyScore: 460 });
  const searchIndexScore = matchesSmartSearch(product, searchText) ? 420 : 0;
  const score = Math.max(nameScore, brandScore, olfactoryScore, descriptionScore, searchIndexScore);
  const normalizedName = normalizeSearchText(product.name);
  const isKitOrCollection = /\b(kit|collection)\b/.test(normalizedName);
  const queryAsksForKitOrCollection = terms.some((term) => term === 'kit' || term === 'collection');

  return isKitOrCollection && !queryAsksForKitOrCollection && score >= 800 ? score - 20 : score;
}

export function findBestProductSearchMatch(products, searchText) {
  const normalizedSearch = normalizeSearchText(searchText);

  if (!normalizedSearch) {
    return null;
  }

  const [bestMatch] = products
    .map((product, index) => ({ product, index, score: getProductNavigationScore(product, normalizedSearch) }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.product.featured) - Number(a.product.featured) ||
        Number(b.product.available) - Number(a.product.available) ||
        String(a.product.name ?? '').length - String(b.product.name ?? '').length ||
        a.index - b.index,
    );

  return bestMatch?.product ?? null;
}

export function matchesSmartSearch(product, searchText) {
  const terms = getExpandedSearchTerms(searchText);

  if (terms.length === 0) {
    return true;
  }

  const tokens = product.searchTokens ?? product.searchIndex?.split(' ').filter(Boolean) ?? [];

  return terms.every((term) => product.searchIndex.includes(term) || tokens.some((token) => termMatchesToken(term, token)));
}
