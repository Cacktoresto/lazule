import state from './_store.js';
import { getPayment } from '../../src/server/payments/mercadoPagoApi.js';
import { reconcilePaymentState } from '../../src/commerce/orders/orderSourceOfTruth.js';
import { appendOrderEvent } from '../../src/commerce/orders/orderEventEngine.js';
import { guardIdempotentProcessing } from '../../src/commerce/payments/idempotencyEngine.js';
import { acquireOrderLock, releaseOrderLock } from '../../src/commerce/orders/orderLockingEngine.js';
import { createCommerceTrace } from '../../src/commerce/observability/commerceTrace.js';

const DEV = process.env.NODE_ENV !== 'production';

function extractPaymentId(req, payload) {
  return payload?.data?.id || payload?.id || req.query?.['data.id'] || req.query?.id || req.query?.payment_id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    if (DEV) console.info('[MP] webhook received');
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const paymentId = extractPaymentId(req, payload);
    if (!paymentId) return res.status(200).json({ ok: true, ignored: 'missing_payment_id' });

    const trace = createCommerceTrace({ operation: 'webhook_received', paymentId, source: 'mercado_pago_webhook' });
    const payment = await getPayment(paymentId);
    if (DEV) console.info('[MP] payment fetched', { paymentId: payment.id, status: payment.status });

    const orderId = payment.external_reference || payment.metadata?.orderId || payment.metadata?.order_id;
    const order = state.orders.get(orderId);
    const eventType = `webhook:${payment.status}`;
    const guarded = guardIdempotentProcessing({
      store: state,
      order,
      orderId,
      paymentId: payment.id || paymentId,
      eventType,
      source: 'mercado_pago_webhook',
      payload: { mpStatus: payment.status },
    });

    if (guarded.duplicate) {
      if (guarded.order) state.orders.set(orderId, guarded.order);
      trace.log('info', 'duplicate webhook ignored', { orderId, status: payment.status });
      return res.status(200).json({ ok: true, deduped: true });
    }

    if (!order) {
      trace.log('error', 'webhook without order', { orderId, status: payment.status });
      return res.status(200).json({ ok: true, ignored: 'order_not_found' });
    }

    const locked = acquireOrderLock(order, 'mercado_pago_webhook');
    if (!locked.acquired) {
      const manualReview = appendOrderEvent(order, {
        type: 'manual_review_required',
        source: 'mercado_pago_webhook',
        paymentId: payment.id || paymentId,
        payload: { reason: 'order_locked_during_webhook', mpStatus: payment.status },
      });
      state.orders.set(orderId, manualReview);
      return res.status(200).json({ ok: true, deferred: true });
    }

    let nextOrder = appendOrderEvent(locked.order, {
      type: 'webhook_received',
      source: 'mercado_pago_webhook',
      paymentId: payment.id || paymentId,
      payload: { mpStatus: payment.status, action: payload.action || payload.type || null },
    });
    nextOrder = reconcilePaymentState(nextOrder, { ...payment, id: payment.id || paymentId, source: 'mercado_pago_webhook' });
    nextOrder = releaseOrderLock(nextOrder, 'mercado_pago_webhook');
    state.orders.set(orderId, nextOrder);
    trace.log('info', 'order status updated', { orderId, status: nextOrder.status });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[LZL][webhook_received]', { error: error?.message || String(error) });
    return res.status(200).json({ ok: true });
  }
}
