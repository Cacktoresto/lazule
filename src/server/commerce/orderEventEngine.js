const EVENT_TYPES = new Set([
  'order_created',
  'checkout_started',
  'preference_created',
  'checkout_redirected',
  'payment_pending',
  'payment_processing',
  'payment_approved',
  'payment_rejected',
  'payment_cancelled',
  'payment_refunded',
  'webhook_received',
  'webhook_duplicate_ignored',
  'status_reconciled',
  'recovery_started',
  'checkout_abandoned',
  'manual_review_required',
  'order_locked',
  'order_lock_released',
  'payment_retry_started',
]);

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function createHash(input) {
  let hash = 0x811c9dc5;
  const text = String(input);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function createEventFingerprint({ orderId, paymentId, type, source, payload = {} } = {}) {
  return createHash(stableStringify({ orderId, paymentId, type, source, payload }));
}

function createOrderEvent({ orderId, type, source = 'system', payload = {}, paymentId = null, fingerprint = null, timestamp = null } = {}) {
  const safeType = EVENT_TYPES.has(type) ? type : 'manual_review_required';
  const at = timestamp || new Date().toISOString();
  const eventFingerprint = fingerprint || createEventFingerprint({ orderId, paymentId, type: safeType, source, payload });
  return {
    id: `evt_${at.replace(new RegExp(['-', ':', '.', 'T', 'Z'].map((part) => `\\${part}`).join('|'), 'g'), '')}_${eventFingerprint}`,
    type: safeType,
    timestamp: at,
    source,
    payload,
    fingerprint: eventFingerprint,
  };
}

function appendOrderEvent(order, eventInput) {
  const current = order || {};
  const events = Array.isArray(current.events) ? current.events : [];
  const event = createOrderEvent({ orderId: current.id, ...eventInput });
  return {
    ...current,
    events: [...events, event],
    updatedAt: event.timestamp,
  };
}

function hasEventFingerprint(order, fingerprint) {
  if (!fingerprint) return false;
  return (order?.events || []).some((event) => event.fingerprint === fingerprint);
}

function listOrderEvents(order) {
  return [...(order?.events || [])].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
}

module.exports = {
  EVENT_TYPES,
  appendOrderEvent,
  createEventFingerprint,
  createOrderEvent,
  hasEventFingerprint,
  listOrderEvents,
};
