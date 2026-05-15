import assert from 'node:assert/strict';
import test from 'node:test';

import { formatBRL } from '../src/utils/currency.js';
import { createProductPath, createProductSlug, getProductSlugFromPath, normalizeSpaPath } from '../src/utils/productRouting.js';
import { createProductWhatsAppLink, createProductWhatsAppMessage, createWhatsAppLink } from '../src/utils/whatsapp.js';

import {
  createProductAnalyticsPayload,
  createSearchAnalyticsPayload,
  normalizeAnalyticsPayload,
  resetAnalyticsForTests,
  shouldTrackEvent,
  trackProductView,
} from '../src/utils/analytics.js';

test('formatBRL formats valid prices and falls back safely', () => {
  assert.equal(formatBRL(320), 'R$ 320,00');
  assert.equal(formatBRL(undefined), 'Consulte');
});

test('product routing normalizes accents, spaces and trailing slashes', () => {
  assert.equal(createProductSlug('Âmbar Oud Gold 100ml'), 'ambar-oud-gold-100ml');
  assert.equal(createProductPath({ name: 'Âmbar Oud Gold 100ml' }), '/produto/ambar-oud-gold-100ml');
  assert.equal(normalizeSpaPath('/catalogo/'), '/catalogo');
  assert.equal(getProductSlugFromPath('/produto/%E0%A4%A'), 'e0-a4-a');
});

test('WhatsApp product message includes premium checkout details with safe fallbacks', () => {
  const message = createProductWhatsAppMessage(
    { name: 'Afnan Turathi EDP', brand: 'AFNAN', salePrice: 350, size: '90ml' },
    undefined,
    'https://lazulefragrances.com.br/produto/afnan-turathi-edp-90ml',
    { quantity: 2 },
  );

  assert.match(message, /Produto: Afnan Turathi EDP/);
  assert.match(message, /Marca: AFNAN/);
  assert.match(message, /Preço: R\$\s*350,00/);
  assert.match(message, /Variação\/tamanho: 90ml/);
  assert.match(message, /Quantidade: 2/);
  assert.match(message, /Link: https:\/\/lazulefragrances\.com\.br\/produto\/afnan-turathi-edp-90ml/);
});

test('WhatsApp links encode messages exactly once and never break on missing product data', () => {
  const genericLink = createWhatsAppLink('Olá & LAZULE?');
  assert.equal(decodeURIComponent(new URL(genericLink).searchParams.get('text')), 'Olá & LAZULE?');

  const productLink = createProductWhatsAppLink({});
  const decodedMessage = decodeURIComponent(new URL(productLink).searchParams.get('text'));
  assert.match(decodedMessage, /fragrância da curadoria LAZULE/);
  assert.match(decodedMessage, /Preço: sob consulta/);
});


test('analytics normalizes product payloads and handles incomplete products safely', () => {
  const payload = createProductAnalyticsPayload({ id: 'abc-123', name: 'Âmbar Oud', brand: 'LAZULE', salePrice: '420', catalogType: 'Árabe' });

  assert.equal(payload.product_id, 'abc-123');
  assert.equal(payload.product_name, 'Âmbar Oud');
  assert.equal(payload.brand, 'LAZULE');
  assert.equal(payload.price, 420);
  assert.equal(payload.category, 'Árabe');
  assert.equal(payload.page_path, '/');

  const incompletePayload = createProductAnalyticsPayload({});
  assert.equal(incompletePayload.page_path, '/');
  assert.ok(!Object.hasOwn(incompletePayload, 'product_name'));
});

test('analytics creates search payloads with consistent fields', () => {
  const payload = createSearchAnalyticsPayload({ searchTerm: 'sauvage', resultCount: 3, sourcePage: 'catalog' });

  assert.equal(payload.search_term, 'sauvage');
  assert.equal(payload.result_count, 3);
  assert.equal(payload.source_page, 'catalog');
});

test('analytics deduplicates events and falls back safely without configured pixels', () => {
  resetAnalyticsForTests();
  const payload = normalizeAnalyticsPayload('search', { searchTerm: 'asad', resultCount: 1 });

  assert.equal(shouldTrackEvent('search', payload, { dedupeKey: 'test-search', dedupeMs: 5000 }), true);
  assert.equal(shouldTrackEvent('search', payload, { dedupeKey: 'test-search', dedupeMs: 5000 }), false);

  resetAnalyticsForTests();
  const event = trackProductView({ name: 'Produto incompleto' });
  assert.equal(event.name, 'product_view');
  assert.equal(event.gaEventName, 'view_item');
  assert.equal(event.metaStandardName, 'ViewContent');
});
