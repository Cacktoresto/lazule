import assert from 'node:assert/strict';
import test from 'node:test';

import { getCatalogProductsFromRepository, getCatalogSource, shouldUseSupabaseCatalog } from '../src/data/catalogRepository.js';
import { getLocalCatalogProducts } from '../src/data/localCatalogAdapter.js';
import { mapSupabaseProductRows } from '../src/data/supabaseCatalogAdapter.js';
import { createSupabaseClient, getSupabaseConfig } from '../src/data/supabaseClient.js';

const sampleSupabaseRows = [
  {
    id: 'lattafa-asad-edp-100ml',
    name: 'Lattafa Asad EDP 100ml',
    brands: { name: 'Lattafa' },
    categories: { name: 'Árabe', catalog_type: 'Árabe' },
    gender: 'Masculino',
    product_prices: { sale_price: '189.9', original_price: '229.9' },
    product_images: [{ url: 'https://example.com/asad.jpg' }],
    badges: ['Árabes', 'Pronta entrega'],
    description: 'Baunilha especiada intensa.',
    olfactory_reference: 'Sauvage Elixir',
    product_inventory: { available: true, quantity: 3 },
    featured: true,
    volume_ml: 100,
  },
];

test('supabase adapter maps planned product tables to the normalized public catalog contract', () => {
  const [product] = mapSupabaseProductRows(sampleSupabaseRows);

  assert.equal(product.id, 'lattafa-asad-edp-100ml');
  assert.equal(product.name, 'Lattafa Asad EDP 100ml');
  assert.equal(product.brand, 'Lattafa');
  assert.equal(product.category, 'Árabe');
  assert.equal(product.catalogType, 'Árabe');
  assert.equal(product.gender, 'Masculino');
  assert.equal(product.salePrice, 189.9);
  assert.equal(product.originalPrice, 229.9);
  assert.equal(product.image, 'https://example.com/asad.jpg');
  assert.deepEqual(product.badges, ['Árabes', 'Pronta entrega']);
  assert.equal(product.olfactoryReference, 'Sauvage Elixir');
  assert.equal(product.available, true);
  assert.equal(product.featured, true);
  assert.equal(product.size, '100ml');

  assert.equal(product.productSlug, 'lattafa-asad-edp-100ml');
  assert.equal(product.brandSlug, 'lattafa');
  assert.equal(product.normalizedName, 'lattafa asad edp 100ml');
  assert.equal(product.normalizedBrand, 'lattafa');
  assert.ok(Array.isArray(product.searchTokens));
  assert.ok(product.searchIndex.includes('lattafa'));
});

test('catalog repository defaults to local and only enables supabase when flag and env are configured', () => {
  assert.equal(getCatalogSource({}), 'local');
  assert.equal(getCatalogSource({ VITE_CATALOG_SOURCE: 'supabase' }), 'supabase');
  assert.equal(shouldUseSupabaseCatalog({ VITE_CATALOG_SOURCE: 'supabase' }), false);
  assert.equal(
    shouldUseSupabaseCatalog({
      VITE_CATALOG_SOURCE: 'supabase',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon',
    }),
    true,
  );
});

test('supabase client is null when env is empty and does not break builds or tests', () => {
  const config = getSupabaseConfig({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' });

  assert.equal(config.isConfigured, false);
  assert.equal(createSupabaseClient(config), null);
});

test('catalog repository falls back to local products when supabase is selected but returns no rows', async () => {
  const products = await getCatalogProductsFromRepository({
    env: {
      VITE_CATALOG_SOURCE: 'supabase',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon',
    },
    supabaseClient: {
      async select() {
        return [];
      },
    },
  });

  assert.equal(products.length, getLocalCatalogProducts().length);
  assert.equal(products[0].productSlug, getLocalCatalogProducts()[0].productSlug);
});
