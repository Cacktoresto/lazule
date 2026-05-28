import state from './_store.js';
import { appendOrderEvent } from '../../src/commerce/orders/orderEventEngine.js';
import { buildCheckoutSession, markCheckoutSessionStatus, upsertCheckoutSession } from '../../src/commerce/checkout/checkoutSessionEngine.js';
import { createIdempotencyKey, markProcessedEvent } from '../../src/commerce/payments/idempotencyEngine.js';
import { createCommerceTrace } from '../../src/commerce/observability/commerceTrace.js';
import { createCommerceRepository } from '../../src/commerce/db/commerceRepository.js';
import { reserveInventory } from '../../src/commerce/inventory/inventoryEngine.js';
import { enqueueJob } from '../../src/commerce/jobs/jobQueue.js';

const DEV = process.env.NODE_ENV !== 'production';
const MAX_QUANTITY = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function resolveBaseUrl(req) {
  return process.env.SITE_URL || req.headers.origin || 'https://lazule.store';
}

function resolveWebhookUrl() {
  const base = process.env.PUBLIC_WEBHOOK_URL || process.env.SITE_URL;
  if (!base || base.includes('localhost')) return null;
  return `${base.replace(/\/$/, '')}/api/payments/webhook`;
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
}

function clientKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'anonymous';
}

function enforceRateLimit(req, store) {
  const key = `create_preference:${clientKey(req)}`;
  const now = Date.now();
  const current = store.rateLimits.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  const next = now > current.resetAt ? { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS } : { ...current, count: current.count + 1 };
  store.rateLimits.set(key, next);
  return next.count <= RATE_LIMIT_MAX;
}

function cartFingerprint(items, customer = {}) {
  const normalized = items.map((item) => `${item.id}:${item.quantity}:${item.unit_price}`).sort().join('|');
  return `${normalized}:${customer.email || ''}`;
}

function normalizeItem(item) {
  const unitPrice = Number(item?.unit_price);
  const quantity = Number(item?.quantity);
  const title = typeof item?.title === 'string' ? item.title.trim() : '';
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) return null;
  if (!title) return null;
  return { ...item, unit_price: unitPrice, quantity, title, currency_id: 'BRL' };
}

function createOrderId() {
  return `lz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findReusableCheckoutSession(checkoutSessionId) {
  if (!checkoutSessionId) return null;
  const session = state.checkoutSessions.get(checkoutSessionId);
  if (!session || !session.orderId) return null;
  const order = state.orders.get(session.orderId);
  if (!order || order.status === 'paid') return null;
  return { session, order };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const { products } = await import('../../src/data/products.js');
    const { createPreference } = await import('../../src/server/payments/mercadoPagoApi.js');
    const repository = createCommerceRepository({ store: state });

    if (!enforceRateLimit(req, state)) return res.status(429).json({ error: 'rate_limited' });
    if (DEV) console.info('[MP] create preference requested', { hasToken: Boolean(process.env.MP_ACCESS_TOKEN), vercelEnv: process.env.VERCEL_ENV });
    if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN missing');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const incomingItems = Array.isArray(body.items) ? body.items : [];
    if (!incomingItems.length) return res.status(400).json({ error: 'empty_cart' });
    if (incomingItems.some((item) => Number(item?.quantity) > MAX_QUANTITY || Number(item?.quantity) <= 0)) return res.status(400).json({ error: 'invalid_quantity' });

    const reusable = findReusableCheckoutSession(body.checkoutSessionId);
    if (reusable?.order?.mpPreferenceId) {
      const key = createIdempotencyKey({ orderId: reusable.order.id, paymentId: reusable.order.mpPreferenceId, eventType: 'preference_created', source: 'create_preference' });
      markProcessedEvent(state, key);
      return res.status(200).json({
        orderId: reusable.order.id,
        checkoutSessionId: reusable.session.id,
        recoveryToken: reusable.session.recoveryToken,
        preferenceId: reusable.order.mpPreferenceId,
        init_point: reusable.order.checkout?.initPoint || null,
        sandbox_init_point: reusable.order.checkout?.sandboxInitPoint || null,
        status: reusable.order.status,
        reused: true,
      });
    }

    const validated = incomingItems.map((item) => {
      const source = products.find((p) => p.id === item.id && p.available);
      if (!source) return null;
      const quantity = Math.floor(Number(item.quantity) || 1);
      return { id: source.id, title: source.name, quantity, currency_id: 'BRL', unit_price: Number(source.salePrice), image: source.image };
    }).map(normalizeItem).filter(Boolean);

    if (!validated.length || validated.length !== incomingItems.length) return res.status(400).json({ error: 'invalid_cart' });

    const fingerprint = cartFingerprint(validated, body.customer || {});
    const existingOrderId = state.checkoutFingerprints.get(fingerprint);
    const existingOrder = existingOrderId ? await repository.getOrder(existingOrderId) : null;
    if (existingOrder && existingOrder.status === 'awaiting_payment' && Date.now() - new Date(existingOrder.createdAt).getTime() < 10 * 60_000) {
      return res.status(200).json({
        orderId: existingOrder.id,
        preferenceId: existingOrder.mpPreferenceId,
        init_point: existingOrder.checkout?.initPoint || null,
        sandbox_init_point: existingOrder.checkout?.sandboxInitPoint || null,
        status: existingOrder.status,
        deduped: true,
      });
    }

    const subtotal = validated.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const discount = 0;
    const total = Math.max(0, subtotal - discount);
    const orderId = createOrderId();
    const baseUrl = resolveBaseUrl(req).replace(/\/$/, '');
    const webhookUrl = resolveWebhookUrl();
    const trace = createCommerceTrace({ operation: 'checkout_create_preference', orderId, checkoutSessionId: body.checkoutSessionId, source: body.source || 'lazule_checkout' });

    await reserveInventory(repository, validated, { orderId });

    const rawCheckoutSession = buildCheckoutSession({ cartSnapshot: validated, customerContext: body.customer || null, orderId, status: 'active' });
    const checkoutSession = upsertCheckoutSession(state, markCheckoutSessionStatus({ ...rawCheckoutSession, id: body.checkoutSessionId || rawCheckoutSession.id }, 'active'));
    await repository.saveCheckoutSession(checkoutSession);

    const cleanMetadata = Object.fromEntries(Object.entries({
      orderId,
      checkoutSessionId: checkoutSession.id,
      recoveryToken: checkoutSession.recoveryToken,
      productIds: validated.map((v) => v.id),
      source: body.source || 'lazule_checkout',
      coupon: body.coupon || null,
      identityContext: body.identityContext ? JSON.stringify(body.identityContext).slice(0, 500) : null,
    }).filter(([, value]) => value !== null && value !== undefined && value !== ''));

    const preferencePayload = {
      items: validated.map(({ image, ...item }) => item),
      payer: body.customer || undefined,
      back_urls: {
        success: `${baseUrl}/checkout/success?order_id=${orderId}`,
        pending: `${baseUrl}/checkout/pending?order_id=${orderId}`,
        failure: `${baseUrl}/checkout/failure?order_id=${orderId}`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      metadata: cleanMetadata,
      ...(webhookUrl ? { notification_url: webhookUrl } : {}),
    };

    const mpPreference = await createPreference(preferencePayload);
    const updatedSession = upsertCheckoutSession(state, markCheckoutSessionStatus(checkoutSession, 'awaiting_payment', { preferenceId: mpPreference.id, orderId }));
    await repository.saveCheckoutSession(updatedSession);

    let order = {
      id: orderId,
      status: 'awaiting_payment',
      items: validated,
      subtotal,
      discount,
      total,
      currency: 'BRL',
      coupon: body.coupon || null,
      customer: body.customer || null,
      mpPreferenceId: mpPreference.id,
      mpPaymentId: null,
      externalReference: orderId,
      checkoutSessionId: updatedSession.id,
      checkout: { sessionId: updatedSession.id, recoveryToken: updatedSession.recoveryToken, initPoint: mpPreference.init_point || null, sandboxInitPoint: mpPreference.sandbox_init_point || null },
      payment: { id: null, status: 'awaiting_payment', rawStatus: null, lastSyncedAt: null },
      consistency: { technicalState: 'syncing', stale: false, lastReconciledAt: null, conflicted: false },
      processing: { locked: false, lockedAt: null, lockOwner: null },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentStatusHistory: [],
      events: [],
    };

    order = appendOrderEvent(order, { type: 'order_created', source: 'create_preference', payload: { total, itemCount: validated.length } });
    order = appendOrderEvent(order, { type: 'checkout_started', source: 'create_preference', payload: { checkoutSessionId: updatedSession.id } });
    order = appendOrderEvent(order, { type: 'inventory_reserved', source: 'create_preference', payload: { itemCount: validated.length } });
    order = appendOrderEvent(order, { type: 'preference_created', source: 'create_preference', payload: { preferenceId: mpPreference.id } });
    await repository.saveOrder(order);
    state.checkoutFingerprints.set(fingerprint, orderId);
    markProcessedEvent(state, createIdempotencyKey({ orderId, paymentId: mpPreference.id, eventType: 'preference_created', source: 'create_preference' }));
    await enqueueJob(repository, { type: 'detect_abandoned_checkout', orderId, payload: { orderId, checkoutSessionId: updatedSession.id }, source: 'create_preference' });
    await repository.trackAnalyticsEvent({ event_type: 'checkout_preference_created', order_id: orderId, checkout_session_id: updatedSession.id, payload_json: { total, itemCount: validated.length }, source: 'create_preference', created_at: new Date().toISOString() });
    trace.log('info', 'preference created', { preferenceId: mpPreference.id, checkoutSessionId: updatedSession.id });

    return res.status(200).json({ orderId, checkoutSessionId: updatedSession.id, recoveryToken: updatedSession.recoveryToken, preferenceId: mpPreference.id, init_point: mpPreference.init_point, sandbox_init_point: mpPreference.sandbox_init_point, status: 'awaiting_payment' });
  } catch (error) {
    console.error('CREATE PREFERENCE ERROR', { message: error?.message, stack: DEV ? error?.stack : undefined });
    return res.status(500).json({ error: true, code: 'function_crash', message: isProductionRuntime() ? 'Não conseguimos iniciar o pagamento agora.' : (error?.message || String(error)), ...(isProductionRuntime() ? {} : { stack: error?.stack }) });
  }
}
