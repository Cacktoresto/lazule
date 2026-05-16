import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateFunnel,
  aggregateMetrics,
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
  ];

  const ranking = aggregateTopProducts(events);

  assert.equal(ranking.viewed[0].product_name, 'Asad');
  assert.equal(ranking.viewed[0].views, 2);
  assert.equal(ranking.whatsapp[0].product_name, 'Turathi');
  assert.equal(ranking.whatsapp[0].whatsapp_clicks, 1);
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
    { name: 'page_view', timestamp: '2026-05-15T10:00:00.000Z', payload: {} },
    { name: 'page_view', timestamp: '2026-05-15T10:01:00.000Z', payload: {} },
    { name: 'product_card_click', timestamp: '2026-05-15T10:02:00.000Z', payload: { product_name: 'Asad' } },
    { name: 'product_view', timestamp: '2026-05-15T10:03:00.000Z', payload: { product_name: 'Asad' } },
    { name: 'whatsapp_click', timestamp: '2026-05-15T10:04:00.000Z', payload: { product_name: 'Asad' } },
  ]);

  assert.deepEqual(funnel.map((step) => step.value), [2, 1, 1, 1]);
  assert.equal(funnel[1].progressRate, 0.5);
  assert.equal(funnel[3].progressRate, 1);
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
