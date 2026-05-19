const SEARCH_SOURCES = Object.freeze([
  { source: 'google', reputation: 'acceptable' },
  { source: 'duckduckgo', reputation: 'weak' },
]);

export function generateGenericSearchCandidates(query) {
  const encoded = encodeURIComponent(`\"${String(query).trim()}\" perfume notes`);
  return SEARCH_SOURCES.map((source) => ({
    source: source.source,
    sourceType: 'generic_search',
    reputation: source.reputation,
    qualityHint: 'search',
    url: source.source === 'google'
      ? `https://www.google.com/search?q=${encoded}`
      : `https://duckduckgo.com/?q=${encoded}`,
  }));
}
