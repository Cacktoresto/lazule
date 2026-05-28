import test from 'node:test';
import assert from 'node:assert/strict';
import { markCheckoutAbandoned, markCheckoutStarted, markPreferenceCreated, recoverAbandonedCheckout } from '../src/commerce/checkout/checkoutAbandonmentEngine.js';

function installStorage() {
  const data = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => data.get(key) || null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: (key) => data.delete(key),
    },
    sessionStorage: {
      getItem: (key) => data.get(`s:${key}`) || null,
      setItem: (key, value) => data.set(`s:${key}`, String(value)),
    },
    location: { pathname: '/checkout', search: '' },
  };
}

test('detects abandoned checkout before payment', () => {
  installStorage();
  const session = markCheckoutStarted({ sessionId: 's1', items: [{ id: 'p1', quantity: 1 }], total: 100 });
  const abandoned = markCheckoutAbandoned({ sessionId: session.sessionId, ttlMinutes: 0, now: Date.now() + 1 });
  assert.equal(abandoned.status, 'abandoned_before_payment');
});

test('detects abandoned pending payment and restores session', () => {
  installStorage();
  markCheckoutStarted({ sessionId: 's2', items: [{ id: 'p2', quantity: 1 }], total: 200 });
  markPreferenceCreated({ sessionId: 's2', preferenceId: 'pref-1', orderId: 'order-2' });
  const abandoned = markCheckoutAbandoned({ sessionId: 's2', ttlMinutes: 0, now: Date.now() + 1 });
  assert.equal(abandoned.status, 'abandoned_pending_payment');
  const recovered = recoverAbandonedCheckout('s2');
  assert.equal(recovered.status, 'recovered');
  assert.equal(recovered.items[0].id, 'p2');
});
