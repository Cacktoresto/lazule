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

export const PRODUCT_MATCH_THRESHOLDS = {
  direct: 760,
  suggestion: 520,
};

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

function getLevenshteinSimilarity(a, b) {
  const normalizedA = normalizeSearchText(a).replace(/\s/g, '');
  const normalizedB = normalizeSearchText(b).replace(/\s/g, '');
  const longestLength = Math.max(normalizedA.length, normalizedB.length);

  if (!normalizedA || !normalizedB || longestLength === 0) {
    return 0;
  }

  const maxDistance = Math.max(2, Math.ceil(longestLength * 0.35));
  const distance = getBoundedDistance(normalizedA, normalizedB, maxDistance);

  if (distance > maxDistance) {
    return 0;
  }

  return (longestLength - distance) / longestLength;
}

function getDiceBigrams(text) {
  const compactText = normalizeSearchText(text).replace(/\s/g, '');

  if (compactText.length < 2) {
    return compactText ? [compactText] : [];
  }

  return Array.from({ length: compactText.length - 1 }, (_, index) => compactText.slice(index, index + 2));
}

function getDiceSimilarity(a, b) {
  const aBigrams = getDiceBigrams(a);
  const bBigrams = getDiceBigrams(b);

  if (aBigrams.length === 0 || bBigrams.length === 0) {
    return 0;
  }

  const bCounts = new Map();
  bBigrams.forEach((bigram) => bCounts.set(bigram, (bCounts.get(bigram) ?? 0) + 1));

  const intersections = aBigrams.reduce((count, bigram) => {
    const currentCount = bCounts.get(bigram) ?? 0;

    if (currentCount === 0) {
      return count;
    }

    bCounts.set(bigram, currentCount - 1);
    return count + 1;
  }, 0);

  return (2 * intersections) / (aBigrams.length + bBigrams.length);
}

function getStringSimilarity(a, b) {
  return Math.max(getLevenshteinSimilarity(a, b), getDiceSimilarity(a, b));
}

function termMatchesToken(term, token) {
  if (token.includes(term) || (token.length >= 4 && term.includes(token))) {
    return true;
  }

  const allowedDistance = getAllowedDistance(term);
  return allowedDistance > 0 && getBoundedDistance(term, token, allowedDistance) <= allowedDistance;
}

function getBestTokenSimilarity(term, tokens) {
  if (!term || tokens.length === 0) {
    return 0;
  }

  return Math.max(
    0,
    ...tokens.map((token) => {
      if (token === term) {
        return 1;
      }

      if (token.startsWith(term) || term.startsWith(token)) {
        return Math.min(term.length, token.length) / Math.max(term.length, token.length);
      }

      if ((term.length >= 4 && token.includes(term)) || (token.length >= 4 && term.includes(token))) {
        return 0.82;
      }

      return getStringSimilarity(term, token);
    }),
  );
}

function getTokenCoverageScore(terms, text) {
  const normalizedText = normalizeSearchText(text);
  const tokens = normalizedText.split(' ').filter(Boolean);

  if (!normalizedText || terms.length === 0 || tokens.length === 0) {
    return 0;
  }

  const similarities = terms.map((term) => getBestTokenSimilarity(term, tokens));
  const coverage = similarities.reduce((sum, similarity) => sum + similarity, 0) / terms.length;
  const minimumSimilarity = Math.min(...similarities);

  if (minimumSimilarity < 0.72) {
    return 0;
  }

  if (coverage >= 0.99) {
    return 740;
  }

  if (coverage >= 0.86) {
    return 700;
  }

  if (coverage >= 0.72) {
    return 620;
  }

  return 0;
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

function getFieldMatchScore({ phrases, terms, text, exactScore, startsWithScore, includesScore, tokenScore = 0, fuzzyScore = 0 }) {
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

  const coveredTokenScore = tokenScore ? Math.min(tokenScore, getTokenCoverageScore(terms, normalizedText)) : 0;
  const coveredFuzzyScore = fuzzyScore && allSearchTermsMatchText(terms, normalizedText) ? fuzzyScore : 0;

  return Math.max(coveredTokenScore, coveredFuzzyScore);
}

function getFuzzyPhraseScore(phrases, candidates) {
  return Math.max(
    0,
    ...phrases.flatMap((phrase) =>
      candidates.map((candidate) => {
        const similarity = getStringSimilarity(phrase, candidate);
        const isMultiTermPhrase = phrase.includes(' ');

        if (similarity >= 0.9) {
          return 760;
        }

        if (!isMultiTermPhrase && similarity >= 0.82) {
          return 700;
        }

        return 0;
      }),
    ),
  );
}

function getNameMatchScore(product, phrases, terms) {
  const nameCandidates = getNormalizedNameCandidates(product);
  const structuredScore = Math.max(
    0,
    ...nameCandidates.map((nameCandidate) =>
      getFieldMatchScore({
        phrases,
        terms,
        text: nameCandidate,
        exactScore: 1000,
        startsWithScore: 900,
        includesScore: 820,
        tokenScore: 780,
        fuzzyScore: 760,
      }),
    ),
  );

  return Math.max(structuredScore, getFuzzyPhraseScore(phrases, nameCandidates));
}

function isKitOrCollectionName(product) {
  return /\b(kit|collection)\b/.test(normalizeSearchText(product.name));
}

function getProductNavigationScore(product, searchText) {
  const terms = getExpandedSearchTerms(searchText);
  const phrases = getExpandedSearchPhrases(searchText);

  if (terms.length === 0) {
    return 0;
  }

  const nameScore = getNameMatchScore(product, phrases, terms);
  const brandScore = getFieldMatchScore({ phrases, terms, text: product.brand, exactScore: 720, startsWithScore: 700, includesScore: 680, tokenScore: 660, fuzzyScore: 640 });
  const olfactoryScore = getFieldMatchScore({
    phrases,
    terms,
    text: product.olfactoryReference,
    exactScore: 690,
    startsWithScore: 670,
    includesScore: 650,
    tokenScore: 630,
    fuzzyScore: 610,
  });
  const descriptionScore = getFieldMatchScore({ phrases, terms, text: product.description, exactScore: 560, startsWithScore: 540, includesScore: 520, tokenScore: 500, fuzzyScore: 480 });
  const searchIndexScore = matchesSmartSearch(product, searchText) ? 460 : 0;
  const score = Math.max(nameScore, brandScore, olfactoryScore, descriptionScore, searchIndexScore);
  const queryAsksForKitOrCollection = terms.some((term) => term === 'kit' || term === 'collection');

  return isKitOrCollectionName(product) && !queryAsksForKitOrCollection && score >= 800 ? score - 20 : score;
}

export function findBestProductMatch(query, products) {
  const normalizedSearch = normalizeSearchText(query);

  if (!normalizedSearch) {
    return null;
  }

  const [bestMatch] = products
    .map((product, index) => ({ product, index, score: getProductNavigationScore(product, normalizedSearch) }))
    .filter((item) => item.score >= PRODUCT_MATCH_THRESHOLDS.suggestion)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.product.featured) - Number(a.product.featured) ||
        Number(b.product.available) - Number(a.product.available) ||
        Number(isKitOrCollectionName(a.product)) - Number(isKitOrCollectionName(b.product)) ||
        String(a.product.name ?? '').length - String(b.product.name ?? '').length ||
        a.index - b.index,
    );

  if (!bestMatch) {
    return null;
  }

  const destination = bestMatch.score >= PRODUCT_MATCH_THRESHOLDS.direct ? 'direct' : 'suggestion';

  return {
    product: bestMatch.product,
    score: bestMatch.score,
    destination,
  };
}

export function findBestProductSearchMatch(products, searchText) {
  return findBestProductMatch(searchText, products)?.product ?? null;
}

export function matchesSmartSearch(product, searchText) {
  const terms = getExpandedSearchTerms(searchText);

  if (terms.length === 0) {
    return true;
  }

  const tokens = product.searchTokens ?? product.searchIndex?.split(' ').filter(Boolean) ?? [];

  return terms.every((term) => product.searchIndex.includes(term) || tokens.some((token) => termMatchesToken(term, token)));
}
