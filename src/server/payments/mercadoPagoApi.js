const PROD_MP_API_BASE_URL = 'https://api.mercadopago.com';
const SANDBOX_MP_API_BASE_URL = 'https://api.mercadopago.com';
const DEV = process.env.NODE_ENV !== 'production';
const DEFAULT_TIMEOUT_MS = 8000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

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
  const baseUrl = getApiBaseUrl(token);
  const url = `${baseUrl}${path}`;
  const maxAttempts = options.method === 'GET' ? 3 : 2;
  if (DEV) console.info('[MP] mpRequest environment', { environment, path, baseUrl });

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await requestWithTimeout(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      }, options.timeoutMs || DEFAULT_TIMEOUT_MS);
      const data = await response.json().catch(() => ({}));
      if (DEV) console.info('[MP] Mercado Pago response', { status: response.status, body: data, attempt });
      if (!response.ok) {
        const err = new Error(data?.message || data?.error || `mercado_pago_error_${response.status}`);
        err.status = response.status;
        err.data = data;
        if (RETRYABLE_STATUSES.has(response.status) && attempt < maxAttempts) {
          lastError = err;
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
          continue;
        }
        throw err;
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

export function createPreference(payload) {
  return mpRequest('/checkout/preferences', { method: 'POST', body: JSON.stringify(payload) });
}

export function getPayment(paymentId) {
  return mpRequest(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
}
