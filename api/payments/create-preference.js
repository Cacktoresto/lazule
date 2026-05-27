import { products } from '../../src/data/products.js';
import state from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(500).json({ error: 'missing_token' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const incomingItems = Array.isArray(body.items) ? body.items : [];
  const validated = incomingItems.map((item) => {
    const source = products.find((p) => p.id === item.id && p.available);
    if (!source) return null;
    const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
    return { id: source.id, title: source.name, quantity, currency_id: 'BRL', unit_price: Number(source.salePrice) };
  }).filter(Boolean);
  if (!validated.length) return res.status(400).json({ error: 'empty_cart' });
  const total = validated.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const external_reference = `lz-${Date.now()}`;
  const preferencePayload = {
    items: validated,
    statement_descriptor: 'LAZULE',
    metadata: { product_ids: validated.map((v) => v.id), user_identity: body.userIdentity || null, concierge_context: body.conciergeContext || null, created_at: new Date().toISOString() },
    back_urls: { success: `${req.headers.origin}/checkout/success`, failure: `${req.headers.origin}/checkout/failure`, pending: `${req.headers.origin}/checkout/pending` },
    notification_url: `${req.headers.origin}/api/payments/webhook`,
    external_reference,
  };
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(preferencePayload) });
  const data = await response.json();
  state.orders.set(external_reference, { external_reference, items: validated, totals: { amount: total }, payment_status: 'pending', created_at: new Date().toISOString(), preference_id: data.id });
  state.stockReservations.set(external_reference, validated.map((v) => ({ productId: v.id, quantity: v.quantity, reservedAt: Date.now() })));
  return res.status(200).json({ preferenceId: data.id, externalReference: external_reference });
}
