import { createProductSlug } from '../utils/productRouting.js';
import { normalizeSearchText } from '../utils/search.js';
import { SEMANTIC_VOCABULARY } from '../data/generated/semanticVocabulary.js';
import { OLFATIVE_EMBEDDING_INDEX } from '../data/generated/olfactiveEmbeddingIndex.js';
import { OLFATIVE_EMBEDDING_DOCUMENTS } from '../data/generated/olfactiveEmbeddingDocuments.js';

const WEIGHT_MAP = Object.freeze({ accords: 3.2, olfactiveFamily: 2.6, vibe: 2.2, mood: 2, occasion: 1.8, weather: 1.5, notes: 1.2, editorial: 0.7 });
const MAX_EXPANSIONS_PER_TOKEN = 8;

const unique = (values = []) => [...new Set(values.filter(Boolean))];
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function compactTokens(values = [], { limit = 24 } = {}) {
  return unique(values.flatMap((v) => normalizeSearchText(String(v)).split(' ').filter(Boolean))).slice(0, limit);
}

function buildWeightedSections(product = {}) {
  return {
    accords: compactTokens(asArray(product.accords), { limit: 16 }),
    olfactiveFamily: compactTokens([product.olfactiveFamily, ...(asArray(product.families)), ...(asArray(product.category))], { limit: 12 }),
    vibe: compactTokens([product.vibe, ...(asArray(product.vibeTags)), ...(asArray(product.semanticTags))], { limit: 14 }),
    mood: compactTokens(asArray(product.moods), { limit: 10 }),
    occasion: compactTokens([product.occasion, ...(asArray(product.occasions)), ...(asArray(product.occasionTags))], { limit: 10 }),
    weather: compactTokens([product.weather, ...(asArray(product.weatherTags))], { limit: 8 }),
    notes: compactTokens(asArray(product.notes), { limit: 16 }),
    editorial: compactTokens([product.description, product.aiSummary, product.olfactoryReference], { limit: 20 }),
  };
}

export function buildSemanticSearchVector(embeddingText = '', sectionWeight = 1) {
  return vectorizeTokens(tokenizeForVector(embeddingText), sectionWeight);
}



function tokenizeForVector(text = '') {
  const normalized = normalizeSearchText(text);
  const baseTokens = normalized.split(' ').filter((token) => token.length > 1);
  const bigrams = baseTokens.slice(0, -1).map((token, index) => `${token}_${baseTokens[index + 1]}`);
  return [...baseTokens, ...bigrams];
}

function expandSynonyms(tokens = []) {
  const expanded = [];
  tokens.forEach((token) => {
    const semantic = SEMANTIC_VOCABULARY[token];
    if (!semantic) return;
    const semanticTokens = unique([
      ...(semantic.accords ?? []), ...(semantic.vibes ?? []), ...(semantic.moods ?? []),
      ...(semantic.occasions ?? []), ...(semantic.weather ?? []), ...(semantic.families ?? []),
    ]).slice(0, MAX_EXPANSIONS_PER_TOKEN);
    expanded.push(...semanticTokens.map((value) => normalizeSearchText(value)));
  });
  return unique(expanded);
}

export function vectorizeTokens(tokens = [], sectionWeight = 1) {
  return tokens.reduce((vector, token) => {
    vector[token] = (vector[token] ?? 0) + sectionWeight;
    return vector;
  }, {});
}

function mergeVectors(...vectors) {
  return vectors.reduce((acc, vector) => {
    Object.entries(vector).forEach(([token, weight]) => { acc[token] = (acc[token] ?? 0) + weight; });
    return acc;
  }, {});
}

function cosineLikeSimilarity(a = {}, b = {}) {
  const keys = unique([...Object.keys(a), ...Object.keys(b)]);
  const dot = keys.reduce((sum, key) => sum + (a[key] ?? 0) * (b[key] ?? 0), 0);
  const magA = Math.sqrt(Object.values(a).reduce((sum, value) => sum + value * value, 0));
  const magB = Math.sqrt(Object.values(b).reduce((sum, value) => sum + value * value, 0));
  if (!magA || !magB) return 0;
  return Number((dot / (magA * magB)).toFixed(6));
}

export function calculateEmbeddingSimilarity(a = {}, b = {}) {
  return cosineLikeSimilarity(a, b);
}

export function buildProductEmbeddingInput(product = {}) {
  const slug = product.productSlug ?? createProductSlug(product.name ?? product.id ?? '');
  const sections = buildWeightedSections(product);
  const searchableSignals = unique([
    ...compactTokens([product.name, product.brand, product.catalogType, product.category], { limit: 12 }),
    ...Object.values(sections).flat(),
    ...compactTokens([product.similarPerfumes, product.similarTo], { limit: 8 }),
  ]);
  const embeddingText = unique(searchableSignals).join(' ').trim();
  const confidence = Number(product.semanticConfidence ?? product.confidenceScore ?? 0.72);
  const visibility = product.catalogVisibility ?? (product.available === false ? 'on_request' : 'catalog');

  return { slug, embeddingText, searchableSignals, confidence, visibility };
}

export function buildSemanticSearchDocument(product = {}) {
  const dna = [
    ...asArray(product.accords),
    ...asArray(product.vibeTags),
    ...asArray(product.occasions),
    ...asArray(product.weatherTags),
    ...asArray(product.signatures),
    ...asArray(product.personalities),
    ...asArray(product.semanticClusters),
    ...asArray(product.narratives),
    ...asArray(product.atmosphere),
    ...asArray(product.contextualRelationships),
  ].filter(Boolean).join(', ');
  return normalizeSearchText([
    product.olfactoryReference,
    product.vibe,
    product.description,
    dna,
  ].filter(Boolean).join('. '));
}

export function buildQueryEmbeddingInput(queryIntent = {}) {
  const rawQuery = queryIntent.query ?? queryIntent.rawQuery ?? '';
  const interpreted = queryIntent.interpreted ?? queryIntent;
  const baseTokens = compactTokens([rawQuery, interpreted.normalizedQuery], { limit: 14 });
  const inferred = compactTokens([
    interpreted.accords, interpreted.vibes, interpreted.moods, interpreted.occasions,
    interpreted.weather, interpreted.families, interpreted.semanticSessionProfile?.tokens,
  ], { limit: 32 });
  const expandedSynonyms = expandSynonyms(baseTokens);
  const embeddingText = unique([...baseTokens, ...inferred, ...expandedSynonyms]).join(' ');
  return { rawQuery, embeddingText, tokens: unique([...baseTokens, ...inferred]), expandedSynonyms, continuityProfile: interpreted.semanticSessionProfile ?? null };
}

export function generateSemanticEmbedding(text = '', options = {}) {
  if (!text?.trim()) return { vector: {}, provider: 'local-deterministic', dimensions: 0, fallback: true };
  const vector = buildSemanticSearchVector(text, options.weight ?? 1);
  return { vector, provider: options.provider ?? 'local-deterministic', dimensions: Object.keys(vector).length, fallback: false };
}

export function generateQueryEmbedding(queryIntent = {}) {
  const input = buildQueryEmbeddingInput(queryIntent);
  const result = generateSemanticEmbedding(input.embeddingText, { weight: 1.2 });
  return { ...result, input };
}

export function rankByEmbeddingSimilarity(queryIntent, products = [], options = {}) {
  const queryDoc = buildQueryEmbeddingInput(queryIntent);
  const queryVector = mergeVectors(buildSemanticSearchVector(queryDoc.embeddingText, 1.2), vectorizeTokens(queryDoc.expandedSynonyms, 0.9));
  const productDocs = products.map((product) => ({ product, embedding: buildProductEmbeddingInput(product) }));
  const ranked = productDocs.map(({ product, embedding }) => {
    const productVector = options.precomputedVectors?.[embedding.slug] ?? buildSemanticSearchVector(embedding.embeddingText, 1);
    const embeddingScore = calculateEmbeddingSimilarity(queryVector, productVector);
    return { product, embedding, embeddingScore, matchedTokens: Object.keys(productVector).filter((token) => queryVector[token]).slice(0, 12) };
  }).sort((a, b) => b.embeddingScore - a.embeddingScore);
  return { queryDoc, ranked };
}

export function optionallyLoadPrecomputedEmbeddings() {
  return {
    version: OLFATIVE_EMBEDDING_INDEX.version,
    generatedAt: OLFATIVE_EMBEDDING_INDEX.generatedAt,
    documents: OLFATIVE_EMBEDDING_DOCUMENTS,
    vectors: OLFATIVE_EMBEDDING_INDEX.localVectorIndex,
    vocabularyExpansion: OLFATIVE_EMBEDDING_INDEX.vocabularyExpansion,
    futureApi: 'optional_openai_embeddings_adapter',
  };
}
