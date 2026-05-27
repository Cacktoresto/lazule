const PROD_MP_API_BASE_URL = 'https://api.mercadopago.com';
const SANDBOX_MP_API_BASE_URL = 'https://api.mercadopago.com';
const DEV = process.env.NODE_ENV !== 'production';

function getEnvironmentFromToken(token) {
  if (token.startsWith('TEST-')) return 'sandbox';
  if (token.startsWith('APP_USR-')) return 'production';
  return 'unknown';
}

function getApiBaseUrl(token) {
  const env = getEnvironmentFromToken(token);
  return env === 'sandbox' ? SANDBOX_MP_API_BASE_URL : PROD_MP_API_BASE_URL;
}

function getAccessToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (DEV) console.info('[MP] MP_ACCESS_TOKEN exists?', Boolean(token));
  if (!token) throw new Error('MP_ACCESS_TOKEN missing');
  return token;
}

async function mpRequest(path, options = {}) {
  const token = getAccessToken();
  const environment = getEnvironmentFromToken(token);
  const baseUrl = getApiBaseUrl(token);
  if (DEV) console.info('[MP] mpRequest environment', { environment, path, baseUrl });
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (DEV) console.info('[MP] Mercado Pago response', { status: response.status, body: data });
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
