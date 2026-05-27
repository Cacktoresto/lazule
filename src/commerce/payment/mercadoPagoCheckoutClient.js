export async function createCheckoutPreference({ items = [], customer = null, coupon = null, source = 'lazule_checkout', identityContext = null } = {}) {
  if (!import.meta.env.VITE_MP_PUBLIC_KEY) {
    console.warn('[Checkout] Missing VITE_MP_PUBLIC_KEY');
  }

  const payload = {
    items: (Array.isArray(items) ? items : []).map((item) => ({
      id: item?.id,
      quantity: Number(item?.quantity) || 1,
    })).filter((item) => item.id),
    customer,
    coupon,
    source,
    identityContext,
  };

  if (import.meta.env.DEV) console.info('[Checkout] create-preference payload', payload);

  const response = await fetch('/api/payments/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (import.meta.env.DEV) console.info('[Checkout] create-preference response status', response.status);

  const data = await response.json().catch(() => ({}));
  if (import.meta.env.DEV) console.info('[Checkout] create-preference response body', data);

  if (!response.ok) {
    const error = new Error(data?.message || data?.code || 'create_preference_failed');
    error.data = data;
    throw error;
  }

  return {
    orderId: data.orderId || data.externalReference,
    preferenceId: data.preferenceId,
    initPoint: data.initPoint || data.init_point || null,
    sandboxInitPoint: data.sandboxInitPoint || data.sandbox_init_point || null,
    status: data.status || 'awaiting_payment',
  };
}
