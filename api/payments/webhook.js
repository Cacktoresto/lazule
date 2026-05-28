import state from './_store.js';
import { getPayment } from '../../src/server/payments/mercadoPagoApi.js';
import { reconcilePaymentState } from '../../src/commerce/orders/orderSourceOfTruth.js';
import { appendOrderEvent } from '../../src/commerce/orders/orderEventEngine.js';
import { guardIdempotentProcessing } from '../../src/commerce/payments/idempotencyEngine.js';
import { acquireOrderLock, releaseOrderLock } from '../../src/commerce/orders/orderLockingEngine.js';
import { createCommerceTrace } from '../../src/commerce/observability/commerceTrace.js';
import { createCommerceRepository } from '../../src/commerce/db/commerceRepository.js';
import { confirmInventorySale, releaseInventoryReservation } from '../../src/commerce/inventory/inventoryEngine.js';
import { enqueueJob } from '../../src/commerce/jobs/jobQueue.js';

const DEV = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production';

export function extractPaymentId(payload = {}, query = {}) {
  return String(payload?.data?.id || payload?.id || query?.['data.id'] || query?.id || query?.payment_id || '');
}

export function extractPixData(payment = {}) {
  const data = payment.point_of_interaction?.transaction_data || {};
  return {
    qrCode: data.qr_code || null,
    qrCodeBase64: data.qr_code_base64 || null,
    ticketUrl: data.ticket_url || null,
  };
}

async function applyInventoryTransition(repository, order, nextStatus) {
  if (nextStatus === 'paid') return confirmInventorySale(repository, order.items || [], { orderId: order.id });
  if (['failed', 'cancelled', 'refunded'].includes(nextStatus)) return releaseInventoryReservation(repository, order.items || [], { orderId: order.id });
  return [];
}

export async function processMercadoPagoWebhook({ payload = {}, query = {}, store = state, paymentFetcher = getPayment, repository = null } = {}) {
  const paymentId = extractPaymentId(payload, query);
  if (!paymentId) return { ok: true, ignored: 'missing_payment_id' };

  const repo = repository || createCommerceRepository({ store });
  const trace = createCommerceTrace({ operation: 'webhook_received', paymentId, source: 'mercado_pago_webhook' });
  const payment = await paymentFetcher(paymentId);
  const orderId = payment.external_reference || payment.metadata?.orderId || payment.metadata?.order_id;
  const order = (await repo.getOrder(orderId)) || store.orders?.get(orderId);
  const eventType = `webhook:${payment.status}`;
  const guarded = guardIdempotentProcessing({
    store,
    order,
    orderId,
    paymentId: payment.id || paymentId,
    eventType,
    source: 'mercado_pago_webhook',
    payload: { mpStatus: payment.status },
  });

  if (guarded.duplicate) {
    if (guarded.order) await repo.saveOrder(guarded.order);
    trace.log('info', 'duplicate webhook ignored', { orderId, status: payment.status });
    return { ok: true, deduped: true };
  }

  if (!order) {
    trace.log('error', 'webhook without order', { orderId, status: payment.status });
    return { ok: true, ignored: 'order_not_found' };
  }

  const locked = acquireOrderLock(order, 'mercado_pago_webhook');
  if (!locked.acquired) {
    const manualReview = appendOrderEvent(order, {
      type: 'manual_review_required',
      source: 'mercado_pago_webhook',
      paymentId: payment.id || paymentId,
      payload: { reason: 'order_locked_during_webhook', mpStatus: payment.status },
    });
    await repo.saveOrder(manualReview);
    await enqueueJob(repo, { type: 'reconcile_payment', orderId, payload: { orderId, paymentId: payment.id || paymentId }, source: 'mercado_pago_webhook' });
    return { ok: true, deferred: true };
  }

  let nextOrder = appendOrderEvent(locked.order, {
    type: 'webhook_received',
    source: 'mercado_pago_webhook',
    paymentId: payment.id || paymentId,
    payload: { mpStatus: payment.status, action: payload.action || payload.type || null },
  });
  nextOrder = reconcilePaymentState(nextOrder, { ...payment, id: payment.id || paymentId, source: 'mercado_pago_webhook' });
  await applyInventoryTransition(repo, nextOrder, nextOrder.status);
  nextOrder = releaseOrderLock(nextOrder, 'mercado_pago_webhook');
  await repo.saveOrder(nextOrder);

  await enqueueJob(repo, { type: 'send_transactional_email', orderId, payload: { orderId, status: nextOrder.status }, source: 'mercado_pago_webhook' });
  await enqueueJob(repo, { type: 'update_customer_memory', orderId, payload: { orderId, status: nextOrder.status }, source: 'mercado_pago_webhook' });
  await repo.trackAnalyticsEvent({ event_type: `payment_${nextOrder.status}`, order_id: orderId, payment_id: payment.id || paymentId, source: 'mercado_pago_webhook', payload_json: { mpStatus: payment.status }, created_at: new Date().toISOString() });
  trace.log('info', 'order status updated', { orderId, status: nextOrder.status });
  return { ok: true, status: nextOrder.status, order: nextOrder };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    if (DEV) console.info('[MP] webhook received');
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const result = await processMercadoPagoWebhook({ payload, query: req.query || {}, store: state });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[LZL][webhook_received]', { error: error?.message || String(error) });
    return res.status(200).json({ ok: true });
  }
}
