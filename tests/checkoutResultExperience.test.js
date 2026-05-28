import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCheckoutResultVariant } from '../src/commerce/checkout/checkoutResultResolver.js';

test('checkout result resolver uses real order status over URL intention', () => {
  assert.equal(resolveCheckoutResultVariant('paid', 'failure'), 'success');
  assert.equal(resolveCheckoutResultVariant('pending_payment', 'success'), 'pending');
  assert.equal(resolveCheckoutResultVariant('payment_failed', 'success'), 'failure');
});
