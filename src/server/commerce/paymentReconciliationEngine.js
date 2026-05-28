const { reconcilePaymentState } = require('./orderSourceOfTruth.js');
const { appendOrderEvent } = require('./orderEventEngine.js');
const { acquireOrderLock, releaseOrderLock } = require('./orderLockingEngine.js');
const { createCommerceTrace } = require('./commerceTrace.js');

async function reconcileOrderPayment(orderId, { store, getPayment, source = 'payment_reconciliation', paymentId = null } = {}) {
  const trace = createCommerceTrace({ operation: 'payment_reconciliation', orderId, paymentId, source });
  const order = store?.orders?.get(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };

  const locked = acquireOrderLock(order, source);
  if (!locked.acquired) return { ok: false, reason: 'order_locked', order };
  store.orders.set(orderId, appendOrderEvent(locked.order, { type: 'order_locked', source, payload: { lockOwner: source } }));

  try {
    const effectivePaymentId = paymentId || order.mpPaymentId || order.payment?.id;
    if (!effectivePaymentId) {
      const marked = appendOrderEvent(releaseOrderLock(store.orders.get(orderId), source), { type: 'manual_review_required', source, payload: { reason: 'missing_payment_id' } });
      store.orders.set(orderId, marked);
      return { ok: false, reason: 'missing_payment_id', order: marked };
    }

    const payment = await getPayment(effectivePaymentId);
    const reconciled = reconcilePaymentState(store.orders.get(orderId), { ...payment, id: payment.id || effectivePaymentId, source });
    const finalOrder = appendOrderEvent(releaseOrderLock(reconciled, source), {
      type: 'status_reconciled',
      source,
      paymentId: payment.id || effectivePaymentId,
      payload: { mpStatus: payment.status, orderStatus: reconciled.status },
    });
    store.orders.set(orderId, finalOrder);
    trace.log('info', 'order reconciled', { paymentId: payment.id || effectivePaymentId, status: finalOrder.status });
    return { ok: true, order: finalOrder, payment };
  } catch (error) {
    const failed = appendOrderEvent(releaseOrderLock(store.orders.get(orderId), source), {
      type: 'manual_review_required',
      source,
      payload: { reason: 'reconciliation_failed', message: error?.message || String(error) },
    });
    store.orders.set(orderId, failed);
    trace.log('error', 'reconciliation failed', { error: error?.message || String(error) });
    return { ok: false, reason: 'reconciliation_failed', error, order: failed };
  }
}

async function retryCheckoutPayment(orderId, { store, createPreference, baseUrl, webhookUrl, source = 'checkout_retry' } = {}) {
  const order = store?.orders?.get(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };
  if (order.status === 'paid') return { ok: false, reason: 'already_paid', order };

  const preferencePayload = {
    items: order.items || [],
    back_urls: {
      success: `${baseUrl}/checkout/success?order_id=${orderId}`,
      pending: `${baseUrl}/checkout/pending?order_id=${orderId}`,
      failure: `${baseUrl}/checkout/failure?order_id=${orderId}`,
    },
    auto_return: 'approved',
    external_reference: orderId,
    metadata: { orderId, source },
    ...(webhookUrl ? { notification_url: webhookUrl } : {}),
  };
  const preference = await createPreference(preferencePayload);
  const updated = appendOrderEvent({
    ...order,
    status: 'awaiting_payment',
    mpPreferenceId: preference.id,
    previousPreferenceIds: [...(order.previousPreferenceIds || []), order.mpPreferenceId].filter(Boolean),
    consistency: { ...(order.consistency || {}), technicalState: 'syncing', stale: false },
  }, {
    type: 'payment_retry_started',
    source,
    payload: { preferenceId: preference.id },
  });
  store.orders.set(orderId, updated);
  return { ok: true, order: updated, preference };
}

module.exports = { reconcileOrderPayment, retryCheckoutPayment };
