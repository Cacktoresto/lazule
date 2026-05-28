import { trackCommerceEvent } from '../analytics/commerceAnalytics.js';

const KEY = 'lazule_checkout_sessions_v1';
const DEFAULT_TTL_MINUTES = 30;

function nowIso() { return new Date().toISOString(); }
function getStorage() { return typeof window !== 'undefined' ? window.localStorage : null; }
function readSessions() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function writeSessions(sessions) {
  const storage = getStorage();
  if (storage) storage.setItem(KEY, JSON.stringify(sessions.slice(0, 30)));
}
function upsertSession(session) {
  const current = readSessions().filter((item) => item.sessionId !== session.sessionId);
  writeSessions([session, ...current]);
  return session;
}

export function getCheckoutSessions() { return readSessions(); }

export function markCheckoutStarted({ sessionId, items = [], total = 0, source = 'checkout' } = {}) {
  const id = sessionId || `recover_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = upsertSession({
    sessionId: id,
    status: 'started',
    items,
    total,
    source,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    preferenceId: null,
    orderId: null,
  });
  trackCommerceEvent('checkout_started', { sessionId: id, productIds: items.map((item) => item.id), total, source });
  return session;
}

export function markPreferenceCreated({ sessionId, preferenceId, orderId, items = [], total = 0 } = {}) {
  const existing = readSessions().find((item) => item.sessionId === sessionId) || markCheckoutStarted({ sessionId, items, total });
  const session = upsertSession({ ...existing, status: 'preference_created', preferenceId, orderId, items: items.length ? items : existing.items, total: total || existing.total, updatedAt: nowIso() });
  trackCommerceEvent('checkout_preference_created', { sessionId: session.sessionId, productIds: session.items.map((item) => item.id), total: session.total, metadata: { preferenceId, orderId } });
  return session;
}

export function markCheckoutAbandoned({ sessionId, reason, ttlMinutes = DEFAULT_TTL_MINUTES, now = Date.now() } = {}) {
  const sessions = readSessions();
  const candidates = sessionId ? sessions.filter((item) => item.sessionId === sessionId) : sessions;
  const abandoned = [];
  for (const session of candidates) {
    if (['paid', 'recovered', 'abandoned_pending_payment', 'abandoned_before_payment'].includes(session.status)) continue;
    const ageMinutes = (now - new Date(session.updatedAt || session.createdAt).getTime()) / 60000;
    if (ageMinutes < ttlMinutes) continue;
    const status = session.preferenceId ? 'abandoned_pending_payment' : 'abandoned_before_payment';
    const next = { ...session, status, abandonedReason: reason || status, abandonedAt: nowIso(), updatedAt: nowIso() };
    abandoned.push(next);
    upsertSession(next);
    trackCommerceEvent('checkout_abandoned', { sessionId: next.sessionId, productIds: next.items.map((item) => item.id), total: next.total, metadata: { reason: next.abandonedReason } });
  }
  return sessionId ? (abandoned[0] || null) : abandoned;
}

export function recoverAbandonedCheckout(sessionId) {
  const session = readSessions().find((item) => item.sessionId === sessionId);
  if (!session) return null;
  const next = upsertSession({ ...session, status: 'recovered', recoveredAt: nowIso(), updatedAt: nowIso() });
  trackCommerceEvent('recovery_clicked', { sessionId, productIds: next.items.map((item) => item.id), total: next.total });
  return next;
}
