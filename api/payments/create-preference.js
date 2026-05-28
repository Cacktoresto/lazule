const DEV = process.env.NODE_ENV !== 'production';

function resolveBaseUrl(req) {
  return process.env.SITE_URL || req.headers.origin || 'https://lazule.store';
}

function resolveWebhookUrl() {
  const base = process.env.PUBLIC_WEBHOOK_URL || process.env.SITE_URL;
  if (!base || base.includes('localhost')) return null;
  return `${base.replace(/\/$/, '')}/api/payments/webhook`;
}

function normalizeItem(item) {
  const unitPrice = Number(item?.unit_price);
  const quantity = Number(item?.quantity);
  const title = typeof item?.title === 'string' ? item.title.trim() : '';
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  if (!title) return null;
  return { ...item, unit_price: unitPrice, quantity, title, currency_id: 'BRL' };
}

export default async function handler(req, res) {
  console.log('CREATE PREFERENCE HANDLER ENTERED');

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    const { products } = await import('../../src/data/products.js');
    const { default: state } = await import('./_store.js');
    const { createPreference } = await import('../../src/server/payments/mercadoPagoApi.js');

    console.log('ENV DEBUG', {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasToken: Boolean(process.env.MP_ACCESS_TOKEN),
      tokenPrefix: process.env.MP_ACCESS_TOKEN?.slice(0, 20),
    });
    console.log('REQUEST BODY', req.body);

    if (DEV) console.info('[MP] create preference requested');
    if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN missing');
    if (DEV) console.info('[MP] create-preference route entered? yes');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const incomingItems = Array.isArray(body.items) ? body.items : [];
    if (!incomingItems.length) return res.status(400).json({ error: 'empty_cart' });

    const validated = incomingItems.map((item) => {
      const source = products.find((p) => p.id === item.id && p.available);
      if (!source) return null;
      const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
      return { id: source.id, title: source.name, quantity, currency_id: 'BRL', unit_price: Number(source.salePrice) };
    }).map(normalizeItem).filter(Boolean);

    if (!validated.length) return res.status(400).json({ error: 'invalid_cart' });
    if (DEV) console.info('[MP] validated cart items', { count: validated.length, items: validated });

    const subtotal = validated.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const discount = 0; // TODO: apply real coupon rules from Supabase promotion table.
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
      items: validated,
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

    if (!Array.isArray(preferencePayload.items) || !preferencePayload.items.length) {
      return res.status(400).json({ error: true, code: 'invalid_items', message: 'Cart items are required', details: { items: preferencePayload.items } });
    }
    if (DEV) console.info('[MP] final payload sent to Mercado Pago', preferencePayload);

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
    console.error('CREATE PREFERENCE ERROR', error);
    console.error(error?.stack);

    return res.status(500).json({
      error: true,
      code: 'function_crash',
      message: error?.message || String(error),
      stack: error?.stack,
    });
  }
}
