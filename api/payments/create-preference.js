const DEV = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const MAX_QUANTITY = 10;

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

function normalizeItem(item) {
  const unitPrice = Number(item?.unit_price);
  const quantity = Number(item?.quantity);
  const title = typeof item?.title === 'string' ? item.title.trim() : '';
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) return null;
  if (!title) return null;
  return { ...item, unit_price: unitPrice, quantity, title, currency_id: 'BRL' };
}

function getClientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function enforceRateLimit(req, state) {
  const key = getClientKey(req);
  const now = Date.now();
  const bucket = state.rateLimits.get(key) || [];
  const recent = bucket.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  state.rateLimits.set(key, [...recent, now]);
  return true;
}

function cartFingerprint(items, customer = {}) {
  const compact = items.map((item) => `${item.id}:${item.quantity}`).sort().join('|');
  return `${customer?.email || 'anon'}:${compact}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const { products } = await import('../../src/data/products.js');
    const { default: state } = await import('./_store.js');
    const { createPreference } = await import('../../src/server/payments/mercadoPagoApi.js');

    if (!enforceRateLimit(req, state)) return res.status(429).json({ error: 'rate_limited' });
    if (DEV) console.info('[MP] create preference requested', { hasToken: Boolean(process.env.MP_ACCESS_TOKEN), vercelEnv: process.env.VERCEL_ENV });
    if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN missing');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const incomingItems = Array.isArray(body.items) ? body.items : [];
    if (!incomingItems.length) return res.status(400).json({ error: 'empty_cart' });
    if (incomingItems.some((item) => Number(item?.quantity) > MAX_QUANTITY || Number(item?.quantity) <= 0)) return res.status(400).json({ error: 'invalid_quantity' });

    const validated = incomingItems.map((item) => {
      const source = products.find((p) => p.id === item.id && p.available);
      if (!source) return null;
      const quantity = Math.floor(Number(item.quantity) || 1);
      return { id: source.id, title: source.name, quantity, currency_id: 'BRL', unit_price: Number(source.salePrice), image: source.image };
    }).map(normalizeItem).filter(Boolean);

    if (!validated.length || validated.length !== incomingItems.length) return res.status(400).json({ error: 'invalid_cart' });
    if (DEV) console.info('[MP] validated cart items', { count: validated.length });

    const fingerprint = cartFingerprint(validated, body.customer || {});
    const existingOrderId = state.checkoutFingerprints.get(fingerprint);
    const existingOrder = existingOrderId ? state.orders.get(existingOrderId) : null;
    if (existingOrder && existingOrder.status === 'awaiting_payment' && Date.now() - new Date(existingOrder.createdAt).getTime() < 10 * 60_000) {
      return res.status(200).json({
        orderId: existingOrder.id,
        preferenceId: existingOrder.mpPreferenceId,
        init_point: existingOrder.initPoint,
        sandbox_init_point: existingOrder.sandboxInitPoint,
        status: existingOrder.status,
        deduped: true,
      });
    }

    const subtotal = validated.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const discount = 0;
    const total = Math.max(0, subtotal - discount);
    const orderId = `lz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const baseUrl = resolveBaseUrl(req).replace(/\/$/, '');
    const webhookUrl = resolveWebhookUrl();

    const cleanMetadata = Object.fromEntries(Object.entries({
      orderId,
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
    if (DEV) console.info('[MP] preference created', { preferenceId: mpPreference.id, orderId });

    const now = new Date().toISOString();
    state.orders.set(orderId, {
      id: orderId,
      status: 'awaiting_payment',
      items: validated,
      subtotal,
      discount,
      total,
      coupon: body.coupon || null,
      customer: body.customer || null,
      mpPreferenceId: mpPreference.id,
      mpPaymentId: null,
      externalReference: orderId,
      initPoint: mpPreference.init_point || null,
      sandboxInitPoint: mpPreference.sandbox_init_point || null,
      createdAt: now,
      updatedAt: now,
      paymentStatusHistory: [],
      timeline: [{ type: 'order_created', label: 'Seleção criada', status: 'awaiting_payment', at: now }],
    });
    state.checkoutFingerprints.set(fingerprint, orderId);

    return res.status(200).json({
      orderId,
      preferenceId: mpPreference.id,
      init_point: mpPreference.init_point,
      sandbox_init_point: mpPreference.sandbox_init_point,
      status: 'awaiting_payment',
    });
  } catch (error) {
    console.error('CREATE PREFERENCE ERROR', { message: error?.message, stack: DEV ? error?.stack : undefined });
    return res.status(500).json({
      error: true,
      code: 'function_crash',
      message: isProductionRuntime() ? 'Não conseguimos iniciar o pagamento agora.' : (error?.message || String(error)),
      ...(isProductionRuntime() ? {} : { stack: error?.stack }),
    });
  }
}
