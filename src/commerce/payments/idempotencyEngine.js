import { appendOrderEvent } from '../orders/orderEventEngine.js';

function normalizePart(value) {
  return String(value ?? 'none').trim().toLowerCase();
}

export function createIdempotencyKey({ orderId, paymentId, eventType, source } = {}) {
  return [orderId, paymentId, eventType, source].map(normalizePart).join(':');
}

export function hasProcessedEvent(store, key) {
  return Boolean(key && store?.processedEvents?.has(key));
}

export function markProcessedEvent(store, key) {
  if (key && store?.processedEvents) store.processedEvents.add(key);
  return key;
}

export function guardIdempotentProcessing({ store, order, orderId, paymentId, eventType, source = 'system', payload = {} } = {}) {
  const key = createIdempotencyKey({ orderId, paymentId, eventType, source });
  if (hasProcessedEvent(store, key)) {
    const duplicateOrder = order ? appendOrderEvent(order, {
      type: 'webhook_duplicate_ignored',
      source,
      paymentId,
      fingerprint: key,
      payload: { ...payload, idempotencyKey: key },
    }) : null;
    return { duplicate: true, key, order: duplicateOrder };
  }
  markProcessedEvent(store, key);
  return { duplicate: false, key, order };
}
