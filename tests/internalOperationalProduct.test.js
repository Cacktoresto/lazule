import test from 'node:test';
import assert from 'node:assert/strict';

import { products as rawProducts } from '../src/data/products.js';
import { getLocalCatalogProducts } from '../src/data/localCatalogAdapter.js';
import { getProductBySlug, searchProducts, getFeaturedProducts } from '../src/data/catalogRepository.js';
import { filterAndSortCatalogProducts } from '../src/utils/catalogFilters.js';
import { getFeaturedCollections, getProductRecommendations } from '../src/utils/catalog.js';
import { buildDiscoveryGroups, getContextualRecommendations } from '../src/utils/catalogDiscovery.js';
import { heuristicRecommendationEngine, getRelatedProducts } from '../src/ai/recommendationEngine.js';
import { rankSemanticWithEmbeddings } from '../src/ai/semanticOlfactiveSearch.js';
import { rankWithHumanDiscoveryIntelligence } from '../src/ai/humanDiscoveryRankingEngine.js';
import { buildSimilarPerfumesArtifact } from '../src/ai/similarPerfumeEngine.js';

const catalog = getLocalCatalogProducts(rawProducts);
const internalProduct = catalog.find((product) => product.id === 'teste-operacional-lazule');
const publicProduct = catalog.find((product) => !product.isInternalTestProduct && product.available !== false && product.image);

function slugs(items) {
  return items.map((item) => item.product?.productSlug ?? item.productSlug ?? item.slug).filter(Boolean);
}

test('internal operational product is active and reachable by direct URL slug', () => {
  assert.ok(internalProduct);
  assert.equal(internalProduct.productSlug, 'teste-operacional-lazule');
  assert.equal(internalProduct.productPath, '/produto/teste-operacional-lazule');
  assert.equal(internalProduct.sku, 'TEST-LIVE-001');
  assert.equal(internalProduct.salePrice, 1);
  assert.equal(internalProduct.stock, 1);
  assert.equal(internalProduct.stockActive, true);
  assert.equal(internalProduct.available, true);
  assert.equal(internalProduct.isInternalTestProduct, true);
  assert.equal(getProductBySlug('teste-operacional-lazule', catalog)?.id, internalProduct.id);
});

test('internal operational product is excluded from public catalog search and home vitrines', () => {
  assert.equal(searchProducts('teste operacional lazule', catalog).some((product) => product.id === internalProduct.id), false);
  assert.equal(filterAndSortCatalogProducts(catalog, { category: 'Todos', gender: 'Todos', brand: 'Todos', priceRange: 'all', imageMode: 'all', availabilityStatus: 'all', availableOnly: false, sortBy: 'featured' }, '').some((product) => product.id === internalProduct.id), false);
  assert.equal(getFeaturedProducts(catalog, 200).some((product) => product.id === internalProduct.id), false);

  const collections = getFeaturedCollections(catalog);
  assert.equal(Object.values(collections).flat().some((product) => product.id === internalProduct.id), false);
});

test('internal operational product is excluded from discovery, recommendations, semantic ranking and related products', () => {
  const discoveryGroups = buildDiscoveryGroups(catalog, []);
  assert.equal(discoveryGroups.flatMap((group) => group.products).some((product) => product.id === internalProduct.id), false);
  assert.equal(getContextualRecommendations({ catalogProducts: catalog, filteredProducts: [internalProduct], searchTerm: 'teste operacional' }).some((product) => product.id === internalProduct.id), false);

  assert.equal(heuristicRecommendationEngine.search('teste operacional', [internalProduct, publicProduct], { analysis: { detectedIntents: ['presente'], referenceTerms: [] } }).some((entry) => entry.product.id === internalProduct.id), false);
  assert.equal(getRelatedProducts(publicProduct, [publicProduct, internalProduct], { limit: 4 }).some((entry) => entry.product.id === internalProduct.id), false);
  assert.equal(getProductRecommendations(publicProduct, [publicProduct, internalProduct]).some((product) => product.id === internalProduct.id), false);
  assert.equal(slugs(rankSemanticWithEmbeddings('teste operacional', [internalProduct, publicProduct]).ranked).includes(internalProduct.productSlug), false);
  assert.equal(slugs(rankWithHumanDiscoveryIntelligence([{ product: internalProduct, score: 1 }, { product: publicProduct, score: 0.5 }])).includes(internalProduct.productSlug), false);

  const artifact = buildSimilarPerfumesArtifact([internalProduct, publicProduct]);
  assert.equal(Object.hasOwn(artifact, internalProduct.productSlug), false);
});
