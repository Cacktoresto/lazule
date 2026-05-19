import { products } from '../products.js';
import { createProductSlug } from '../../utils/productRouting.js';
import { shouldExposeInMainCatalog } from '../../utils/commercialStatus.js';
import { normalizeSearchText } from '../../utils/search.js';
import { OLFACTIVE_SEMANTIC_ENRICHMENT } from './olfactiveSemanticEnrichment.js';

const unique = (values = []) => [...new Set(values.filter(Boolean))];
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function compact(values = [], limit = 48) {
  return unique(values.flatMap((item) => normalizeSearchText(String(item)).split(' ').filter(Boolean))).slice(0, limit);
}

const enrichmentBySlug = new Map(OLFACTIVE_SEMANTIC_ENRICHMENT.map((item) => [item.slug, item]));

function buildSignals(product = {}) {
  const primary = compact([
    product.accords,
    product.olfactiveFamily,
    product.vibe,
    product.occasions,
    product.weather,
    product.notes,
  ], 36);
  const enrichment = enrichmentBySlug.get(product.productSlug ?? createProductSlug(product.name ?? product.id ?? '')) ?? {};
  const secondary = compact([
    product.semanticTags,
    product.olfactoryReference,
    product.description,
    product.aiSummary,
    product.similarTo,
    product.similarPerfumes,
    product.name,
    product.brand,
    product.category,
    product.catalogType,
    enrichment.olfactiveFamilies,
    enrichment.searchPhrases,
    enrichment.semanticDescriptors,
    enrichment.embeddingBoostText,
  ], 36);
  return unique([...primary, ...secondary]).slice(0, 64);
}

export const OLFATIVE_EMBEDDING_DOCUMENTS = products
  .filter((product) => shouldExposeInMainCatalog(product))
  .map((product) => {
    const signals = buildSignals(product);
    return {
      slug: product.productSlug ?? createProductSlug(product.name ?? product.id ?? ''),
      embeddingText: signals.join(' '),
      searchableSignals: signals,
      confidence: Number(product.semanticConfidence ?? product.confidenceScore ?? 0.72),
      visibility: product.catalogVisibility ?? 'catalog',
    };
  });
