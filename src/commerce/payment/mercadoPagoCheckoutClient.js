import { buildCheckoutSession, markCheckoutSessionStatus, persistCheckoutSession, restoreCheckoutSession } from '../checkout/checkoutSessionEngine.js';

export async function createCheckoutPreference({ items = [], customer = null, coupon = null, source = 'lazule_checkout', identityContext = null, externalReference = null } = {}) {
  if (!import.meta.env.VITE_MP_PUBLIC_KEY) {
    console.warn('[Checkout] Missing VITE_MP_PUBLIC_KEY');
  }

  const restoredSession = restoreCheckoutSession({});
  const cartFingerprint = JSON.stringify((Array.isArray(items) ? items : []).map((item) => ({ id: item?.id, quantity: Number(item?.quantity) || 1 })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
  const restoredFingerprint = JSON.stringify((restoredSession?.cartSnapshot || []).map((item) => ({ id: item?.id, quantity: Number(item?.quantity) || 1 })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
  const existingSession = restoredSession && restoredFingerprint === cartFingerprint
    ? restoredSession
    : buildCheckoutSession({ cartSnapshot: items, customerContext: customer, status: 'active' });
  persistCheckoutSession(existingSession);

  const payload = {
    checkoutSessionId: existingSession.id,
    items: (Array.isArray(items) ? items : []).map((item) => ({
      id: item?.id || item?.slug,
      slug: item?.slug || item?.id,
      name: item?.name,
      quantity: Number(item?.quantity) || 1,
      unit_price: Number(item?.unit_price ?? item?.price ?? item?.salePrice) || undefined,
      total: Number(item?.total) || undefined,
      image: item?.image || item?.picture_url || undefined,
    })).filter((item) => item.id),
    externalReference,
    customer,
    coupon,
    source,
    identityContext,
  };

  if (import.meta.env.DEV) console.info('[Checkout] create-preference payload', payload);

  let response = await fetch('/api/create-mercado-pago-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 404) {
    response = await fetch('/api/payments/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  if (import.meta.env.DEV) console.info('[Checkout] create-preference response status', response.status);

  const data = await response.json().catch(() => ({}));
  if (import.meta.env.DEV) console.info('[Checkout] create-preference response body', data);

  if (!response.ok) {
    const error = new Error(data?.message || data?.code || 'create_preference_failed');
    error.data = data;
    throw error;
  }

  persistCheckoutSession(markCheckoutSessionStatus(existingSession, 'awaiting_payment', {
    orderId: data.orderId || data.externalReference,
    preferenceId: data.preferenceId,
    recoveryToken: data.recoveryToken || existingSession.recoveryToken,
  }));

  return {
    orderId: data.orderId || data.externalReference,
    checkoutSessionId: data.checkoutSessionId || existingSession.id,
    recoveryToken: data.recoveryToken || existingSession.recoveryToken,
    preferenceId: data.preferenceId,
    initPoint: data.initPoint || data.init_point || null,
    sandboxInitPoint: data.sandboxInitPoint || data.sandbox_init_point || null,
    status: data.status || 'awaiting_payment',
    reused: Boolean(data.reused),
  };
}
