import assert from 'node:assert/strict';
import test from 'node:test';
import { appendOrderEvent } from '../src/commerce/orders/orderEventEngine.js';
import { reconcilePaymentState, resolveCanonicalPaymentState } from '../src/commerce/orders/orderSourceOfTruth.js';
import { createIdempotencyKey, guardIdempotentProcessing } from '../src/commerce/payments/idempotencyEngine.js';
import { buildCheckoutSession, markCheckoutSessionStatus, upsertCheckoutSession } from '../src/commerce/checkout/checkoutSessionEngine.js';
import { acquireOrderLock, releaseOrderLock } from '../src/commerce/orders/orderLockingEngine.js';

test('order event engine is append-only and keeps previous timeline entries', () => {
  const order = { id: 'order-1', events: [] };
  const created = appendOrderEvent(order, { type: 'order_created', source: 'test' });
  const paid = appendOrderEvent(created, { type: 'payment_approved', source: 'test', paymentId: 'pay-1' });

  assert.equal(order.events.length, 0);
  assert.equal(created.events.length, 1);
  assert.equal(paid.events.length, 2);
  assert.deepEqual(paid.events.map((event) => event.type), ['order_created', 'payment_approved']);
});

test('idempotency guard detects duplicate webhook events without reprocessing', () => {
  const store = { processedEvents: new Set() };
  const order = { id: 'order-1', events: [] };
  const args = { store, order, orderId: 'order-1', paymentId: 'pay-1', eventType: 'webhook:approved', source: 'mercado_pago_webhook' };

  const first = guardIdempotentProcessing(args);
  const second = guardIdempotentProcessing(args);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(store.processedEvents.has(createIdempotencyKey(args)), true);
  assert.equal(second.order.events.at(-1).type, 'webhook_duplicate_ignored');
});

test('payment reconciliation maps Mercado Pago status into canonical backend state', () => {
  const order = { id: 'order-1', status: 'awaiting_payment', events: [], paymentStatusHistory: [] };
  const reconciled = reconcilePaymentState(order, { id: 'pay-1', status: 'approved', source: 'test' });
  const canonical = resolveCanonicalPaymentState(reconciled);

  assert.equal(reconciled.status, 'paid');
  assert.equal(reconciled.mpPaymentId, 'pay-1');
  assert.equal(canonical.commercialState, 'paid');
  assert.equal(canonical.sourceOfTruth, 'backend_order_state');
  assert.equal(reconciled.events.at(-1).type, 'payment_approved');
});

test('checkout session separates cart, order and payment lifecycle state', () => {
  const store = { checkoutSessions: new Map() };
  const session = buildCheckoutSession({ cartSnapshot: [{ id: 'sku-1', quantity: 1 }], customerContext: { email: 'a@b.test' } });
  const redirected = markCheckoutSessionStatus(session, 'redirected', { orderId: 'order-1', preferenceId: 'pref-1' });
  upsertCheckoutSession(store, redirected);

  assert.equal(store.checkoutSessions.get(session.id).status, 'redirected');
  assert.equal(store.checkoutSessions.get(session.id).orderId, 'order-1');
  assert.equal(store.checkoutSessions.get(session.id).cartSnapshot[0].id, 'sku-1');
});

test('order lock prevents concurrent processing until release', () => {
  const order = { id: 'order-1' };
  const first = acquireOrderLock(order, 'webhook');
  const second = acquireOrderLock(first.order, 'polling');
  const released = releaseOrderLock(first.order, 'webhook');
  const third = acquireOrderLock(released, 'polling');

  assert.equal(first.acquired, true);
  assert.equal(second.acquired, false);
  assert.equal(third.acquired, true);
});
