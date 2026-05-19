const BASE_SOURCES = Object.freeze([
  { source: 'fragrantica', reputation: 'trusted', baseUrl: 'https://www.fragrantica.com' },
  { source: 'parfumo', reputation: 'acceptable', baseUrl: 'https://www.parfumo.com' },
  { source: 'basenotes', reputation: 'weak', baseUrl: 'https://basenotes.com' },
]);

const normalizeToken = (value = '') => String(value).toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const slugify = (value = '') => normalizeToken(value).replace(/\s+/g, '-');

export function generateFragrancePatternCandidates(query) {
  const clean = normalizeToken(query);
  const slug = slugify(query);
  const compact = clean.replace(/\s+/g, '-');
  const encoded = encodeURIComponent(clean);

  return BASE_SOURCES.flatMap((entry) => ([
    { url: `${entry.baseUrl}/search/${encoded}`, source: entry.source, sourceType: 'fragrance_pattern', reputation: entry.reputation, qualityHint: 'search' },
    { url: `${entry.baseUrl}/perfume/${compact}`, source: entry.source, sourceType: 'fragrance_pattern', reputation: entry.reputation, qualityHint: 'slug' },
    { url: `${entry.baseUrl}/fragrance/${slug}`, source: entry.source, sourceType: 'fragrance_pattern', reputation: entry.reputation, qualityHint: 'slug' },
  ]));
}
