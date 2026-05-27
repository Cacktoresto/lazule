export async function createCheckoutSession(payload) {
  const response = await fetch('/api/commerce/checkout/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Não foi possível iniciar sua sessão de checkout.');
  }

  return response.json();
}
