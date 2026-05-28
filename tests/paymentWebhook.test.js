import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPaymentId, extractPixData, processMercadoPagoWebhook } from '../api/payments/webhook.js';

function createStore() {
  return { orders: new Map(), processedEvents: new Set() };
}

test('extracts payment id from body and query variants', () => {
  assert.equal(extractPaymentId({ data: { id: 123 } }, {}), '123');
  assert.equal(extractPaymentId({}, { 'data.id': '456' }), '456');
});

test('approved webhook updates order to paid', async () => {
  const store = createStore();
  store.orders.set('order-1', { id: 'order-1', status: 'awaiting_payment', items: [] });
  const result = await processMercadoPagoWebhook({
    payload: { action: 'payment.updated', data: { id: 'pay-1' } },
    store,
    paymentFetcher: async () => ({ id: 'pay-1', status: 'approved', external_reference: 'order-1' }),
  });
  assert.equal(result.status, 'paid');
  assert.equal(store.orders.get('order-1').status, 'paid');
});

test('duplicate webhook is ignored safely', async () => {
  const store = createStore();
  store.orders.set('order-1', { id: 'order-1', status: 'awaiting_payment', items: [] });
  const payload = { action: 'payment.updated', data: { id: 'pay-1' } };
  const paymentFetcher = async () => ({ id: 'pay-1', status: 'pending', external_reference: 'order-1' });
  await processMercadoPagoWebhook({ payload, store, paymentFetcher });
  const duplicate = await processMercadoPagoWebhook({ payload, store, paymentFetcher });
  assert.equal(duplicate.deduped, true);
  assert.equal(store.orders.get('order-1').paymentStatusHistory.length, 1);
});

test('extracts Pix transaction data from payment payload', () => {
  const pix = extractPixData({ point_of_interaction: { transaction_data: { qr_code: 'pix-code', qr_code_base64: 'base64', ticket_url: 'https://ticket' } } });
  assert.equal(pix.qrCode, 'pix-code');
  assert.equal(pix.qrCodeBase64, 'base64');
  assert.equal(pix.ticketUrl, 'https://ticket');
});
