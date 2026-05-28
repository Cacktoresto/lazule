const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildCheckoutSession({ cartSnapshot = [], customerContext = null, orderId = null, preferenceId = null, status = 'active', ttlMs = DEFAULT_SESSION_TTL_MS } = {}) {
  const createdAt = nowIso();
  return {
    id: createId('cs'),
    cartSnapshot,
    customerContext,
    createdAt,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    status,
    preferenceId,
    orderId,
    recoveryToken: createId('rec'),
    lastActivityAt: createdAt,
    abandonmentState: 'none',
  };
}

function upsertCheckoutSession(store, session) {
  if (store?.checkoutSessions && session?.id) store.checkoutSessions.set(session.id, session);
  return session;
}

function markCheckoutSessionStatus(session, status, patch = {}) {
  return {
    ...(session || {}),
    ...patch,
    status,
    lastActivityAt: nowIso(),
    abandonmentState: status === 'abandoned' ? 'abandoned' : (patch.abandonmentState || session?.abandonmentState || 'none'),
  };
}

module.exports = { buildCheckoutSession, markCheckoutSessionStatus, upsertCheckoutSession };
