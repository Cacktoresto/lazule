import { products } from '../../src/data/products.js';
import state from './_store.js';
import { createPreference } from '../../src/server/payments/mercadoPagoApi.js';

const DEV = process.env.NODE_ENV !== 'production';

function resolveBaseUrl(req) {
  return process.env.SITE_URL || req.headers.origin || 'https://lazule.store';
}

function resolveWebhookUrl() {
  const base = process.env.PUBLIC_WEBHOOK_URL || process.env.SITE_URL;
  if (!base || base.includes('localhost')) return null;
  return `${base.replace(/\/$/, '')}/api/payments/webhook`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    if (DEV) console.info('[MP] create preference requested');
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const incomingItems = Array.isArray(body.items) ? body.items : [];
    if (!incomingItems.length) return res.status(400).json({ error: 'empty_cart' });

    const validated = incomingItems.map((item) => {
      const source = products.find((p) => p.id === item.id && p.available);
      if (!source) return null;
      const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
      return { id: source.id, title: source.name, quantity, currency_id: 'BRL', unit_price: Number(source.salePrice) };
    }).filter(Boolean);

    if (!validated.length) return res.status(400).json({ error: 'invalid_cart' });
    if (DEV) console.info('[MP] validated cart items', { count: validated.length });

    const subtotal = validated.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const discount = 0; // TODO: apply real coupon rules from Supabase promotion table.
    const total = Math.max(0, subtotal - discount);
    const orderId = `lz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const baseUrl = resolveBaseUrl(req).replace(/\/$/, '');
    const webhookUrl = resolveWebhookUrl();

    const preferencePayload = {
      items: validated,
      payer: body.customer || undefined,
      back_urls: {
        success: `${baseUrl}/checkout/success?order_id=${orderId}`,
        pending: `${baseUrl}/checkout/pending?order_id=${orderId}`,
        failure: `${baseUrl}/checkout/failure?order_id=${orderId}`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      metadata: {
        orderId,
        productIds: validated.map((v) => v.id),
        source: body.source || 'lazule_checkout',
        coupon: body.coupon || null,
        identityContext: body.identityContext ? JSON.stringify(body.identityContext).slice(0, 500) : null,
      },
      ...(webhookUrl ? { notification_url: webhookUrl } : {}),
    };

    const mpPreference = await createPreference(preferencePayload);
    if (DEV) console.info('[MP] preference created', { preferenceId: mpPreference.id });

    state.orders.set(orderId, {
      id: orderId,
      status: 'awaiting_payment',
      items: validated,
      subtotal,
      discount,
      total,
      coupon: body.coupon || null,
      mpPreferenceId: mpPreference.id,
      mpPaymentId: null,
      externalReference: orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentStatusHistory: [],
    });

    return res.status(200).json({
      orderId,
      preferenceId: mpPreference.id,
      init_point: mpPreference.init_point,
      sandbox_init_point: mpPreference.sandbox_init_point,
      status: 'awaiting_payment',
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: 'create_preference_failed', message: DEV ? error.message : undefined });
  }
}
