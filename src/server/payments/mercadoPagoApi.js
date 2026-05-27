const MP_API_BASE_URL = 'https://api.mercadopago.com';

function getAccessToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('missing_mp_access_token');
  return token;
}

async function mpRequest(path, options = {}) {
  const response = await fetch(`${MP_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.message || data?.error || `mercado_pago_error_${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function createPreference(payload) {
  return mpRequest('/checkout/preferences', { method: 'POST', body: JSON.stringify(payload) });
}

export function getPayment(paymentId) {
  return mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
}
