export async function createCheckoutPreference({ items = [], customer = null, coupon = null, source = 'lazule_checkout', identityContext = null } = {}) {
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

  const response = await fetch('/api/payments/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error || 'create_preference_failed');
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
