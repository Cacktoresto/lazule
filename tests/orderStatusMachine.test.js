import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrderStatus, mapMercadoPagoStatus, resolveOrderStatusView } from '../src/commerce/orders/orderStatusMachine.js';

test('maps Mercado Pago statuses to internal order statuses', () => {
  assert.equal(mapMercadoPagoStatus('approved'), 'paid');
  assert.equal(mapMercadoPagoStatus('pending'), 'pending_payment');
  assert.equal(mapMercadoPagoStatus('rejected'), 'payment_failed');
  assert.equal(mapMercadoPagoStatus('charged_back'), 'chargeback');
});

test('resolves LAZULE order status copy', () => {
  const view = resolveOrderStatusView({ status: 'paid' });
  assert.equal(view.description, 'Sua seleção foi confirmada.');
  assert.equal(view.progressStep, 2);
  assert.equal(view.canRetryPayment, false);
});

test('does not regress paid orders back to payment pending', () => {
  assert.equal(canTransitionOrderStatus('paid', 'pending_payment'), false);
  assert.equal(canTransitionOrderStatus('paid', 'preparing'), true);
});
