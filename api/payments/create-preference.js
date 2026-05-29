const state = require('./_store');
const { createPreference } = require('../../src/server/payments/mercadoPagoApi');

const MAX_QUANTITY = 10;
const CHECKOUT_TTL_MS = 10 * 60 * 1000;

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
}

function safeErrorPayload(error) {
  return {
    error: true,
    code: error?.code || 'create_preference_failed',
    message: isProductionRuntime() ? 'Não conseguimos iniciar o pagamento agora.' : (error?.message || String(error)),
    ...(isProductionRuntime() ? {} : { stack: error?.stack }),
  };
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body || '{}');
  return body;
}

function createOrderId() {
  return `lz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSessionId() {
  return `cs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createRecoveryToken() {
  return Math.random().toString(36).slice(2, 12);
}

function resolveBaseUrl(req) {
  return process.env.SITE_URL || req.headers.origin || 'https://lazule.store';
}

function resolveWebhookUrl() {
  const base = process.env.PUBLIC_WEBHOOK_URL || process.env.SITE_URL;
  if (!base || base.includes('localhost')) return null;
  return `${base.replace(/\/$/, '')}/api/payments/webhook`;
}

function normalizeCustomer(customer) {
  if (!customer || typeof customer !== 'object') return null;
  return {
    name: typeof customer.name === 'string' ? customer.name.slice(0, 120) : undefined,
    surname: typeof customer.surname === 'string' ? customer.surname.slice(0, 120) : undefined,
    email: typeof customer.email === 'string' ? customer.email.slice(0, 160) : undefined,
    phone: customer.phone,
  };
}

function cartFingerprint(items, customer) {
  const normalizedItems = items
    .map((item) => ({ id: item.id, quantity: item.quantity }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return JSON.stringify({ items: normalizedItems, customer: customer?.email || '' });
}

async function loadProducts() {
  const mod = await import('../../src/data/products.js');
  return Array.isArray(mod.products) ? mod.products : [];
}

function validateIncomingItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Carrinho vazio.');
    error.code = 'empty_cart';
    error.status = 400;
    throw error;
  }

  return items.map((item) => {
    const id = typeof item?.id === 'string' ? item.id : '';
    const quantity = Math.floor(Number(item?.quantity) || 0);
    if (!id || quantity <= 0 || quantity > MAX_QUANTITY) {
      const error = new Error('Quantidade inválida.');
      error.code = 'invalid_quantity';
      error.status = 400;
      throw error;
    }
    return { id, quantity };
  });
}

function recalculateCart(incomingItems, products) {
  return incomingItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.id && candidate.available);
    const stockLimit = product?.stockActive ? Math.max(0, Math.floor(Number(product.stock) || 0)) : Infinity;
    if (!product || !Number.isFinite(Number(product.salePrice)) || Number(product.salePrice) <= 0 || item.quantity > stockLimit) return null;
    return {
      id: product.id,
      slug: product.slug || product.id,
      title: product.name,
      name: product.name,
      quantity: item.quantity,
      currency_id: 'BRL',
      unit_price: Number(product.salePrice),
      picture_url: product.image,
      image: product.image,
      total: Number(product.salePrice) * item.quantity,
    };
  }).filter(Boolean);
}

function buildPreferencePayload({ req, orderId, items, customer }) {
  const baseUrl = resolveBaseUrl(req).replace(/\/$/, '');
  const payload = {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      currency_id: item.currency_id,
      unit_price: item.unit_price,
      picture_url: item.picture_url,
    })),
    external_reference: orderId,
    metadata: { order_id: orderId },
    back_urls: {
      success: `${baseUrl}/checkout/success?order=${encodeURIComponent(orderId)}`,
      failure: `${baseUrl}/checkout/failure?order=${encodeURIComponent(orderId)}`,
      pending: `${baseUrl}/checkout/pending?order=${encodeURIComponent(orderId)}`,
    },
    auto_return: 'approved',
  };

  const payer = normalizeCustomer(customer);
  if (payer) payload.payer = payer;

  const notificationUrl = resolveWebhookUrl();
  if (notificationUrl) payload.notification_url = notificationUrl;

  return payload;
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, code: 'method_not_allowed' });

  try {
    if (!(process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN)) {
      const error = new Error('MERCADO_PAGO_ACCESS_TOKEN missing');
      error.code = 'mp_token_missing';
      error.status = 500;
      throw error;
    }

    const body = parseBody(req.body);
    const incomingItems = validateIncomingItems(body.items);
    const products = await loadProducts();
    const items = recalculateCart(incomingItems, products);

    if (items.length !== incomingItems.length) {
      const error = new Error('Carrinho inválido.');
      error.code = 'invalid_cart';
      error.status = 400;
      throw error;
    }

    const fingerprint = cartFingerprint(items, body.customer || {});
    const existingOrderId = state.checkoutFingerprints.get(fingerprint);
    const existingOrder = existingOrderId ? state.orders.get(existingOrderId) : null;
    if (existingOrder && existingOrder.status === 'awaiting_payment' && Date.now() - Date.parse(existingOrder.createdAt) < CHECKOUT_TTL_MS) {
      return res.status(200).json({
        orderId: existingOrder.id,
        checkoutSessionId: existingOrder.checkoutSessionId,
        recoveryToken: existingOrder.recoveryToken,
        preferenceId: existingOrder.mpPreferenceId,
        init_point: existingOrder.initPoint,
        sandbox_init_point: existingOrder.sandboxInitPoint,
        status: existingOrder.status,
        reused: true,
      });
    }

    const orderId = createOrderId();
    const checkoutSessionId = body.checkoutSessionId || createSessionId();
    const recoveryToken = createRecoveryToken();
    const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const preferencePayload = buildPreferencePayload({ req, orderId, items, customer: body.customer });
    const mpPreference = await createPreference(preferencePayload);

    const order = {
      id: orderId,
      checkoutSessionId,
      recoveryToken,
      status: 'awaiting_payment',
      items,
      total,
      mpPreferenceId: mpPreference.id,
      initPoint: mpPreference.init_point || null,
      sandboxInitPoint: mpPreference.sandbox_init_point || null,
      createdAt: new Date().toISOString(),
    };

    state.orders.set(orderId, order);
    state.checkoutSessions.set(checkoutSessionId, {
      id: checkoutSessionId,
      orderId,
      recoveryToken,
      status: 'awaiting_payment',
      cartSnapshot: items.map((item) => ({ id: item.id, quantity: item.quantity })),
      createdAt: order.createdAt,
    });
    state.checkoutFingerprints.set(fingerprint, orderId);

    console.info('[MP] preference created', { orderId, status: 200, hasToken: true, env: process.env.VERCEL_ENV });

    return res.status(200).json({
      orderId,
      checkoutSessionId,
      recoveryToken,
      preferenceId: mpPreference.id,
      init_point: mpPreference.init_point || null,
      sandbox_init_point: mpPreference.sandbox_init_point || null,
      status: 'awaiting_payment',
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    console.error('[MP] create-preference failed', {
      code: error?.code || 'create_preference_failed',
      status,
      hasToken: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN),
      env: process.env.VERCEL_ENV,
    });
    return res.status(status).json(safeErrorPayload(error));
  }
}

module.exports = handler;
