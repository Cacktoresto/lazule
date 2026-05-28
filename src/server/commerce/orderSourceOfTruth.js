const { appendOrderEvent } = require('./orderEventEngine.js');

const FINAL_RANK = { refunded: 50, cancelled: 40, paid: 30, failed: 25, awaiting_payment: 10, pending: 10, processing: 15, created: 0 };

function normalizeMercadoPagoPaymentState(mpStatus) {
  if (mpStatus === 'approved') return 'paid';
  if (mpStatus === 'pending') return 'awaiting_payment';
  if (mpStatus === 'in_process' || mpStatus === 'authorized') return 'processing';
  if (mpStatus === 'rejected') return 'failed';
  if (mpStatus === 'cancelled') return 'cancelled';
  if (mpStatus === 'refunded' || mpStatus === 'charged_back') return 'refunded';
  return 'awaiting_payment';
}

function deriveUiState(status = 'awaiting_payment', technicalState = 'syncing', stale = false) {
  if (technicalState === 'reconciling') return 'reconciling';
  if (technicalState === 'syncing') return 'syncing';
  if (stale) return 'awaiting_confirmation';
  if (status === 'paid') return 'finalizing';
  if (status === 'processing' || status === 'awaiting_payment' || status === 'pending') return 'awaiting_confirmation';
  return status;
}

function resolveCanonicalPaymentState(order = {}) {
  const status = order.status || order.payment?.status || 'awaiting_payment';
  const technical = order.consistency?.technicalState || 'syncing';
  const isFinal = ['paid', 'failed', 'cancelled', 'refunded'].includes(status);
  const isStale = Boolean(order.consistency?.stale || technical === 'stale');
  return {
    commercialState: status,
    technicalState: isFinal ? 'synced' : (isStale ? 'stale' : technical),
    uiState: deriveUiState(status, technical, isStale),
    isFinal,
    sourceOfTruth: 'backend_order_state',
    updatedAt: order.updatedAt || order.createdAt || null,
  };
}

function reconcilePaymentState(order, paymentData = {}) {
  const current = order || {};
  const nextStatus = normalizeMercadoPagoPaymentState(paymentData.status);
  const currentStatus = current.status || 'awaiting_payment';
  const shouldUpdate = (FINAL_RANK[nextStatus] || 0) >= (FINAL_RANK[currentStatus] || 0) || currentStatus === 'awaiting_payment' || currentStatus === 'processing';
  const now = new Date().toISOString();
  const reconciled = {
    ...current,
    status: shouldUpdate ? nextStatus : currentStatus,
    mpPaymentId: paymentData.id || current.mpPaymentId || null,
    payment: {
      ...(current.payment || {}),
      id: paymentData.id || current.payment?.id || null,
      status: nextStatus,
      rawStatus: paymentData.status || current.payment?.rawStatus || null,
      lastSyncedAt: now,
    },
    consistency: {
      ...(current.consistency || {}),
      technicalState: 'synced',
      stale: false,
      lastReconciledAt: now,
      conflicted: !shouldUpdate && nextStatus !== currentStatus,
    },
    updatedAt: now,
    paymentStatusHistory: [
      ...(current.paymentStatusHistory || []),
      { paymentId: paymentData.id, mpStatus: paymentData.status, mappedStatus: nextStatus, at: now },
    ],
  };

  return appendOrderEvent(reconciled, {
    type: nextStatus === 'paid' ? 'payment_approved' : (nextStatus === 'refunded' ? 'payment_refunded' : (nextStatus === 'cancelled' ? 'payment_cancelled' : (nextStatus === 'failed' ? 'payment_rejected' : 'payment_pending'))),
    source: paymentData.source || 'payment_reconciliation',
    paymentId: paymentData.id,
    payload: { previousStatus: currentStatus, nextStatus, mpStatus: paymentData.status, applied: shouldUpdate },
  });
}

function getOrderState(orderId, { store } = {}) {
  const order = store?.orders?.get(orderId) || null;
  if (!order) return null;
  return {
    ...order,
    canonicalState: resolveCanonicalPaymentState(order),
  };
}

module.exports = {
  deriveUiState,
  getOrderState,
  normalizeMercadoPagoPaymentState,
  reconcilePaymentState,
  resolveCanonicalPaymentState,
};
