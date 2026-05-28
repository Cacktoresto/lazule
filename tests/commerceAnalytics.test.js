import test from 'node:test';
import assert from 'node:assert/strict';
import { clearCommerceAnalyticsEvents, readCommerceAnalyticsEvents, trackCommerceEvent } from '../src/commerce/analytics/commerceAnalytics.js';

function installStorage() {
  const data = new Map();
  global.window = {
    localStorage: { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key) },
    sessionStorage: { getItem: (key) => data.get(`s:${key}`) || null, setItem: (key, value) => data.set(`s:${key}`, String(value)) },
    location: { pathname: '/catalogo', search: '?x=1' },
  };
}

test('commerce analytics event has required funnel shape', () => {
  installStorage();
  clearCommerceAnalyticsEvents();
  const event = trackCommerceEvent('checkout_started', { productIds: ['p1'], total: 120, source: 'test' });
  assert.equal(event.event, 'checkout_started');
  assert.equal(event.productIds[0], 'p1');
  assert.equal(event.total, 120);
  assert.ok(event.timestamp);
  assert.ok(event.sessionId);
  assert.equal(readCommerceAnalyticsEvents().length, 1);
});
