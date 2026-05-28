import { trackEvent } from '../../utils/analytics.js';
export const COMMERCE_EVENTS = Object.freeze([
  'product_viewed', 'add_to_selection', 'remove_from_selection', 'cart_opened',
  'checkout_started', 'checkout_preference_created', 'checkout_redirected',
  'payment_pending', 'payment_approved', 'payment_failed', 'order_status_viewed',
  'checkout_abandoned', 'recovery_clicked',
]);

const KEY = 'lazule_commerce_analytics_v1';
const MAX_EVENTS = 200;

function safeWindow() {
  return typeof window !== 'undefined' ? window : null;
}

export function getCommerceSessionId() {
  const w = safeWindow();
  if (!w) return 'server-session';
  const key = 'lazule_commerce_session_id';
  let value = w.sessionStorage.getItem(key);
  if (!value) {
    value = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    w.sessionStorage.setItem(key, value);
  }
  return value;
}

function normalizeEvent(name, payload = {}) {
  return {
    event: name,
    timestamp: new Date().toISOString(),
    sessionId: payload.sessionId || getCommerceSessionId(),
    userId: payload.userId || null,
    productIds: Array.isArray(payload.productIds) ? payload.productIds : [],
    total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : null,
    source: payload.source || 'lazule_web',
    route: payload.route || (safeWindow()?.location ? `${window.location.pathname}${window.location.search}` : ''),
    atmosphere: payload.atmosphere || payload.vibe || null,
    vibe: payload.vibe || payload.atmosphere || null,
    recommendationContext: payload.recommendationContext || null,
    metadata: payload.metadata || {},
  };
}

export function readCommerceAnalyticsEvents() {
  const w = safeWindow();
  if (!w) return [];
  try {
    const parsed = JSON.parse(w.localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function trackCommerceEvent(name, payload = {}, adapter) {
  try {
    const event = normalizeEvent(name, payload);
    const w = safeWindow();
    if (w) {
      const next = [event, ...readCommerceAnalyticsEvents()].slice(0, MAX_EVENTS);
      w.localStorage.setItem(KEY, JSON.stringify(next));
    }
    if (adapter?.track) adapter.track(event);
    else if (typeof console !== 'undefined' && (typeof import.meta === 'undefined' || import.meta.env?.DEV)) console.info('[CommerceAnalytics]', event);
    return event;
  } catch (error) {
    if (typeof console !== 'undefined') console.warn('[CommerceAnalytics] ignored failure', { message: error?.message });
    return null;
  }
}

export function clearCommerceAnalyticsEvents() {
  safeWindow()?.localStorage.removeItem(KEY);
}

export function trackCheckoutStep(step, payload = {}) {
  trackEvent('commerce_checkout_step', { step, ...payload });
  return trackCommerceEvent(`checkout_${step}`, payload);
}
