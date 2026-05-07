const IGNORED_BRAND_PREFIXES = new Set(['perfume', 'kit', 'the', 'a', 'o', 'la', 'el']);

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

export function createSearchIndex(product) {
  return normalizeSearchText([
    product.name,
    product.brand,
    product.category,
    product.gender,
    ...(product.badges ?? []),
    product.olfactoryReference,
    product.description,
    product.rawText,
  ].filter(Boolean).join(' '));
}
