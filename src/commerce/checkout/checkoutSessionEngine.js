const SESSION_STORAGE_KEY = 'lazule_checkout_sessions_v1';
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readBrowserSessions() {
  if (typeof window === 'undefined') return [];
  return JSON.parse(window.localStorage.getItem(SESSION_STORAGE_KEY) || '[]');
}

function writeBrowserSessions(sessions) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions.slice(0, 25)));
}

export function buildCheckoutSession({ cartSnapshot = [], customerContext = null, orderId = null, preferenceId = null, status = 'active', ttlMs = DEFAULT_SESSION_TTL_MS } = {}) {
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

export function upsertCheckoutSession(store, session) {
  if (store?.checkoutSessions && session?.id) store.checkoutSessions.set(session.id, session);
  return session;
}

export function markCheckoutSessionStatus(session, status, patch = {}) {
  return {
    ...(session || {}),
    ...patch,
    status,
    lastActivityAt: nowIso(),
    abandonmentState: status === 'abandoned' ? 'abandoned' : (patch.abandonmentState || session?.abandonmentState || 'none'),
  };
}

export function persistCheckoutSession(session) {
  if (!session?.id || typeof window === 'undefined') return session;
  const sessions = readBrowserSessions().filter((item) => item.id !== session.id && item.orderId !== session.orderId);
  writeBrowserSessions([session, ...sessions]);
  return session;
}

export function restoreCheckoutSession({ orderId, recoveryToken } = {}) {
  const sessions = readBrowserSessions();
  if (!orderId && !recoveryToken) {
    return sessions.find((session) => ['active', 'redirected', 'awaiting_payment', 'recovered'].includes(session.status)) || null;
  }
  return sessions.find((session) => (orderId && session.orderId === orderId) || (recoveryToken && session.recoveryToken === recoveryToken)) || null;
}

export async function createCheckoutSession(payload) {
  const response = await fetch('/api/commerce/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Não foi possível iniciar sua sessão de checkout.');
  }

  return response.json();
}
