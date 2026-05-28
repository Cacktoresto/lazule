import { ORDER_STATUS_COPY } from './orderStatusCopy.js';

export const MP_TO_ORDER_STATUS = Object.freeze({
  approved: 'paid',
  pending: 'pending_payment',
  in_process: 'processing_payment',
  rejected: 'payment_failed',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'chargeback',
});

const TERMINAL_STATUSES = new Set(['delivered', 'cancelled', 'refunded', 'chargeback']);
const PAYMENT_EVENT_MAP = Object.freeze({
  'payment.created': 'payment_pending',
  'payment.updated': 'payment_pending',
  'payment.approved': 'payment_approved',
  'payment.rejected': 'payment_failed',
  'payment.cancelled': 'payment_failed',
  'payment.refunded': 'payment_failed',
});

export function mapMercadoPagoStatus(mpStatus = 'pending') {
  return MP_TO_ORDER_STATUS[String(mpStatus)] || 'pending_payment';
}

export function resolvePaymentNotificationEvent({ eventType, orderStatus }) {
  if (orderStatus === 'paid') return 'payment_approved';
  if (orderStatus === 'payment_failed') return 'payment_failed';
  if (orderStatus === 'pending_payment' || orderStatus === 'processing_payment') return 'payment_pending';
  return PAYMENT_EVENT_MAP[eventType] || null;
}

export function canTransitionOrderStatus(currentStatus = 'draft', nextStatus = 'awaiting_payment') {
  if (currentStatus === nextStatus) return true;
  if (!ORDER_STATUS_COPY[nextStatus]) return false;
  if (TERMINAL_STATUSES.has(currentStatus) && nextStatus !== currentStatus) return false;
  if (currentStatus === 'paid' && ['awaiting_payment', 'pending_payment', 'processing_payment', 'payment_failed'].includes(nextStatus)) return false;
  return true;
}

export function resolveOrderStatusView(order = {}) {
  const status = ORDER_STATUS_COPY[order.status] ? order.status : 'awaiting_payment';
  const copy = ORDER_STATUS_COPY[status];
  return {
    status,
    label: copy.label,
    description: copy.description,
    nextStep: copy.nextStep,
    severity: copy.severity,
    progressStep: copy.progressStep,
    canRetryPayment: Boolean(copy.canRetryPayment),
    canContactSupport: Boolean(copy.canContactSupport || ['payment_failed', 'cancelled', 'refunded', 'chargeback'].includes(status)),
  };
}

export function appendOrderTimeline(order = {}, event = {}) {
  return {
    ...order,
    timeline: [...(Array.isArray(order.timeline) ? order.timeline : []), { ...event, at: event.at || new Date().toISOString() }],
  };
}
