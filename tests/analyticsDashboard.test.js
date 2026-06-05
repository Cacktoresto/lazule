import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateAICommerceIntelligence,
  aggregateFunnel,
  aggregateMetrics,
  aggregateNoResultSearchReport,
  aggregateTopProducts,
  aggregateTopSearches,
  aggregateInfluencerMetrics,
  calculateConversionRate,
  eventMatchesInfluencer,
  filterAnalyticsEventsByInfluencer,
  normalizeAnalyticsEvents,
} from '../src/utils/analyticsDashboard.js';

test('analytics dashboard aggregates empty metrics safely', () => {
  assert.deepEqual(aggregateMetrics([]), {
    pageViews: 0,
    productViews: 0,
    whatsappClicks: 0,
    productToWhatsappRate: 0,
    searches: 0,
    emptySearches: 0,
    brandClicks: 0,
    categoryClicks: 0,
    recommendationClicks: 0,
    addToCart: 0,
    cartViews: 0,
    beginCheckout: 0,
    purchases: 0,
    pageExits: 0,
    productToCartRate: 0,
    checkoutPurchaseRate: 0,
  });
});

test('analytics dashboard conversion rate protects division by zero', () => {
  assert.equal(calculateConversionRate(0, 3), 0);
  assert.equal(calculateConversionRate(4, 2), 0.5);
});

test('analytics dashboard ranks viewed products and WhatsApp intent', () => {
  const events = [
    { name: 'product_view', timestamp: '2026-05-15T10:00:00.000Z', payload: { product_id: 'asad', product_name: 'Asad', brand: 'Lattafa' } },
    { name: 'product_view', timestamp: '2026-05-15T10:01:00.000Z', payload: { product_id: 'asad', product_name: 'Asad', brand: 'Lattafa' } },
    { name: 'product_view', timestamp: '2026-05-15T10:02:00.000Z', payload: { product_id: 'turathi', product_name: 'Turathi', brand: 'Afnan' } },
    { name: 'whatsapp_click', timestamp: '2026-05-15T10:03:00.000Z', payload: { product_id: 'turathi', product_name: 'Turathi', brand: 'Afnan' } },
    { name: 'ADD_TO_CART', timestamp: '2026-05-15T10:04:00.000Z', payload: { product_id: 'asad', product_name: 'Asad', brand: 'Lattafa' } },
  ];

  const ranking = aggregateTopProducts(events);

  assert.equal(ranking.viewed[0].product_name, 'Asad');
  assert.equal(ranking.viewed[0].views, 2);
  assert.equal(ranking.whatsapp[0].product_name, 'Turathi');
  assert.equal(ranking.whatsapp[0].whatsapp_clicks, 1);
  assert.equal(ranking.added[0].product_name, 'Asad');
  assert.equal(ranking.added[0].add_to_cart, 1);
});

test('analytics dashboard ranks searches without result', () => {
  const ranking = aggregateTopSearches([
    { name: 'search', timestamp: '2026-05-15T10:00:00.000Z', payload: { search_term: 'oud', result_count: 2 } },
    { name: 'empty_search_result', timestamp: '2026-05-15T10:01:00.000Z', payload: { search_term: 'iris raro', result_count: 0 } },
    { name: 'search', timestamp: '2026-05-15T10:02:00.000Z', payload: { search_term: 'iris raro', result_count: 0 } },
  ]);

  assert.equal(ranking.all[0].search_term, 'iris raro');
  assert.equal(ranking.all[0].count, 2);
  assert.equal(ranking.empty[0].search_term, 'iris raro');
  assert.equal(ranking.empty[0].count, 2);
});

test('analytics dashboard aggregates a basic commercial funnel', () => {
  const funnel = aggregateFunnel([
    { name: 'HOME_VIEW', timestamp: '2026-05-15T10:00:00.000Z', payload: {} },
    { name: 'CATALOG_VIEW', timestamp: '2026-05-15T10:01:00.000Z', payload: {} },
    { name: 'product_card_click', timestamp: '2026-05-15T10:02:00.000Z', payload: { product_name: 'Asad' } },
    { name: 'product_view', timestamp: '2026-05-15T10:03:00.000Z', payload: { product_name: 'Asad' } },
    { name: 'ADD_TO_CART', timestamp: '2026-05-15T10:04:00.000Z', payload: { product_name: 'Asad' } },
    { name: 'BEGIN_CHECKOUT', timestamp: '2026-05-15T10:05:00.000Z', payload: { product_name: 'Asad' } },
    { name: 'PURCHASE', timestamp: '2026-05-15T10:06:00.000Z', payload: { order_id: 'o1' } },
  ]);

  assert.deepEqual(funnel.map((step) => step.value), [1, 1, 1, 1, 1, 1]);
  assert.equal(funnel[1].progressRate, 1);
  assert.equal(funnel[5].progressRate, 1);
});

test('analytics dashboard ignores malformed events and deduplicates identical snapshots', () => {
  const duplicateEvent = { name: 'page_view', timestamp: '2026-05-15T10:00:00.000Z', payload: { page_path: '/' } };
  const normalized = normalizeAnalyticsEvents([null, {}, duplicateEvent, { ...duplicateEvent }]);

  assert.equal(normalized.length, 1);
  assert.equal(aggregateMetrics([null, {}, duplicateEvent, { ...duplicateEvent }]).pageViews, 1);
});

test('analytics dashboard filters attribution by influencer ref or coupon only', () => {
  const events = [
    { name: 'influencer_route_visit', timestamp: '2026-05-15T10:00:00.000Z', payload: { ref: 'lucas', page_path: '/i/lucas' } },
    { name: 'product_view', timestamp: '2026-05-15T10:01:00.000Z', payload: { ref: 'lucas', coupon: 'LUCAS10', product_name: 'Asad' } },
    { name: 'whatsapp_click', timestamp: '2026-05-15T10:02:00.000Z', payload: { coupon: 'LUCAS10', product_name: 'Asad' } },
    { name: 'product_view', timestamp: '2026-05-15T10:03:00.000Z', payload: { ref: 'maria', coupon: 'MARIA10', product_name: 'Turathi' } },
  ];

  const influencer = { influencer_ref: '@Lucas', coupon_code: 'lucas10' };
  const filtered = filterAnalyticsEventsByInfluencer(events, influencer);
  const metrics = aggregateInfluencerMetrics(events, influencer);

  assert.equal(filtered.length, 3);
  assert.equal(metrics.attributedEvents, 3);
  assert.equal(metrics.referralVisits, 1);
  assert.equal(metrics.productViews, 1);
  assert.equal(metrics.whatsappClicks, 1);
  assert.equal(metrics.productToWhatsappRate, 1);
});

test('analytics dashboard does not attribute events when profile has no ref or coupon', () => {
  const event = { name: 'product_view', timestamp: '2026-05-15T10:00:00.000Z', payload: { ref: 'lucas', coupon: 'LUCAS10' } };

  assert.equal(eventMatchesInfluencer(event, {}), false);
  assert.equal(aggregateInfluencerMetrics([event], {}).attributedEvents, 0);
});


test('analytics dashboard aggregates AI commerce intelligence without raw query', () => {
  const ai = aggregateAICommerceIntelligence([
    { name: 'ai_assistant_query', timestamp: '2026-05-15T10:00:00.000Z', payload: { ai_intents: ['nightlife', 'sweet'], dna: { sweet: 0.8, nightlife: 0.9 }, result_count: 2, recommended_product_slugs: ['asad'] } },
    { name: 'ai_assistant_result_click', timestamp: '2026-05-15T10:01:00.000Z', payload: { product_slug: 'asad', product_name: 'Asad', product_category: 'Árabe', product_vibes: ['noite'] } },
    { name: 'ai_assistant_whatsapp_click', timestamp: '2026-05-15T10:02:00.000Z', payload: { product_slug: 'asad', product_name: 'Asad' } },
  ]);

  assert.equal(ai.aiQueries, 1);
  assert.equal(ai.aiWhatsappRate, 1);
  assert.equal(ai.dominantIntents[0].label, 'nightlife');
  assert.equal(ai.recommendedProducts[0].product_name, 'asad');
  assert.equal(ai.clickedProducts[0].product_name, 'Asad');
});


test('analytics dashboard builds no-result search report by source page', () => {
  const report = aggregateNoResultSearchReport([
    { name: 'SEARCH', timestamp: '2026-05-15T10:00:00.000Z', payload: { search_term: 'iris raro', result_count: 0, source_page: 'catalog' } },
    { name: 'empty_search_result', timestamp: '2026-05-15T10:01:00.000Z', payload: { search_term: 'iris raro', result_count: 0, source_page: 'home' } },
    { name: 'SEARCH', timestamp: '2026-05-15T10:02:00.000Z', payload: { search_term: 'oud', result_count: 4, source_page: 'catalog' } },
  ]);

  assert.equal(report[0].search_term, 'iris raro');
  assert.equal(report[0].frequency, 2);
  assert.equal(report[0].source_pages.length, 2);
});
