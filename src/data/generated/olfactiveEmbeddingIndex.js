import { OLFATIVE_EMBEDDING_DOCUMENTS } from './olfactiveEmbeddingDocuments.js';
import { SEMANTIC_VOCABULARY } from './semanticVocabulary.js';
import { normalizeSearchText } from '../../utils/search.js';

function tokenize(text = '') {
  const terms = normalizeSearchText(text).split(' ').filter(Boolean);
  const bigrams = terms.slice(0, -1).map((term, index) => `${term}_${terms[index + 1]}`);
  return [...terms, ...bigrams];
}

function vectorize(tokens = []) {
  return tokens.reduce((vector, token) => {
    vector[token] = (vector[token] ?? 0) + 1;
    return vector;
  }, {});
}

export const OLFATIVE_EMBEDDING_INDEX = {
  version: 'phase-9-olfactive-embeddings-foundation-v1',
  generatedAt: '2026-05-19T00:00:00.000Z',
  embeddingDocuments: OLFATIVE_EMBEDDING_DOCUMENTS,
  localVectorIndex: Object.fromEntries(OLFATIVE_EMBEDDING_DOCUMENTS.map((doc) => [doc.slug, vectorize(tokenize(doc.embeddingText))])),
  vocabularyExpansion: Object.fromEntries(Object.entries(SEMANTIC_VOCABULARY).map(([token, data]) => [token, {
    accords: data.accords ?? [], vibes: data.vibes ?? [], moods: data.moods ?? [], occasions: data.occasions ?? [], weather: data.weather ?? [], families: data.families ?? [],
  }])),
};
