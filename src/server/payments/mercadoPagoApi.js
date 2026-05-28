const MP_API_BASE_URL = 'https://api.mercadopago.com';
const DEFAULT_TIMEOUT_MS = 8000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isSafeDebugRuntime() {
  return process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production';
}

function getEnvironmentFromToken(token = '') {
  if (token.startsWith('TEST-')) return 'sandbox';
  if (token.startsWith('APP_USR-')) return 'production';
  return 'unknown';
}

function getAccessToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (isSafeDebugRuntime()) console.info('[MP] token configured', { hasToken: Boolean(token), env: process.env.VERCEL_ENV });
  if (!token) {
    const error = new Error('MP_ACCESS_TOKEN missing');
    error.code = 'mp_token_missing';
    error.status = 500;
    throw error;
  }
  return token;
}

async function requestWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function mpRequest(path, options = {}) {
  const token = getAccessToken();
  const environment = getEnvironmentFromToken(token);
  const maxAttempts = options.method === 'GET' ? 3 : 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await requestWithTimeout(`${MP_API_BASE_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      }, options.timeoutMs || DEFAULT_TIMEOUT_MS);
      const data = await response.json().catch(() => ({}));

      if (isSafeDebugRuntime()) {
        console.info('[MP] response', { environment, path, status: response.status, attempt });
      }

      if (!response.ok) {
        const error = new Error(data?.message || data?.error || `mercado_pago_error_${response.status}`);
        error.code = data?.error || `mercado_pago_error_${response.status}`;
        error.status = response.status;
        error.data = data;
        if (RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
          continue;
        }
        throw error;
      }

      return data;
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError || new Error('mercado_pago_request_failed');
}

function createPreference(payload) {
  return mpRequest('/checkout/preferences', { method: 'POST', body: JSON.stringify(payload) });
}

function getPayment(paymentId) {
  return mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
}

module.exports = {
  createPreference,
  getPayment,
  getEnvironmentFromToken,
};
