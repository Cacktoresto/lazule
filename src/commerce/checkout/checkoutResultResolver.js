export function resolveCheckoutResultVariant(status, fallbackMode = 'pending') {
  if (status === 'paid' || status === 'preparing' || status === 'shipped' || status === 'delivered') return 'success';
  if (status === 'pending_payment' || status === 'processing_payment' || status === 'awaiting_payment') return 'pending';
  if (status === 'payment_failed' || status === 'cancelled' || status === 'refunded' || status === 'chargeback') return 'failure';
  if (status === 'loading') return 'loading';
  return ['success', 'pending', 'failure', 'loading', 'unknown'].includes(fallbackMode) ? fallbackMode : 'unknown';
}
