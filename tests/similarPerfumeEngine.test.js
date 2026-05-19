import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSimilarPerfumesArtifact } from '../src/ai/similarPerfumeEngine.js';
import { getLocalCatalogProducts } from '../src/data/localCatalogAdapter.js';
import { products as rawProducts } from '../src/data/products.js';

const catalog = getLocalCatalogProducts(rawProducts);

test('deterministic recommendation artifact and stable ordering', () => {
  const first = buildSimilarPerfumesArtifact(catalog);
  const second = buildSimilarPerfumesArtifact(catalog);
  assert.deepEqual(first, second);
});

test('no self reference or duplicates per group', () => {
  const artifact = buildSimilarPerfumesArtifact(catalog);
  Object.entries(artifact).forEach(([slug, groups]) => {
    ['highlySimilar', 'complementary', 'adventurousAlternatives'].forEach((groupKey) => {
      const slugs = (groups[groupKey] || []).map((item) => item.slug);
      assert.equal(slugs.includes(slug), false);
      assert.equal(new Set(slugs).size, slugs.length);
    });
  });
});

test('no low-confidence or non-commercial pollution in recommendation cards', () => {
  const artifact = buildSimilarPerfumesArtifact(catalog);
  const bySlug = new Map(catalog.map((p) => [p.productSlug, p]));

  Object.values(artifact).forEach((groups) => {
    ['highlySimilar', 'complementary', 'adventurousAlternatives'].forEach((groupKey) => {
      (groups[groupKey] || []).forEach((item) => {
        const product = bySlug.get(item.slug);
        assert.ok(product);
        assert.equal(product.catalogVisibility, 'catalog');
        assert.equal(product.available, true);
        assert.ok(product.image);
      });
    });
  });
});
