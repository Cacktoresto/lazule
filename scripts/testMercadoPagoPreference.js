/* eslint-disable no-console */

const MP_API_BASE_URL = 'https://api.mercadopago.com';

async function run() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN missing');
  }

  const environment = token.startsWith('TEST-') ? 'sandbox' : token.startsWith('APP_USR-') ? 'production' : 'unknown';
  console.info('[MP Script] token detected', { environment, prefix: token.slice(0, 8) });

  const payload = {
    items: [{ title: 'Produto teste LAZULE', quantity: 1, unit_price: 10, currency_id: 'BRL' }],
    external_reference: `lz-test-${Date.now()}`,
  };

  console.info('[MP Script] payload', payload);

  const response = await fetch(`${MP_API_BASE_URL}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  console.info('[MP Script] HTTP status', response.status);
  console.info('[MP Script] response body', data);

  if (!response.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('[MP Script] failed', error);
  process.exitCode = 1;
});
