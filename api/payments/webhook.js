import state from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const token = process.env.MP_ACCESS_TOKEN;
  const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const paymentId = payload?.data?.id || payload?.id;
  if (!paymentId || state.processed.has(String(paymentId))) return res.status(200).json({ ok: true, deduped: true });
  const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
  const payment = await paymentRes.json();
  const externalRef = payment.external_reference;
  const order = state.orders.get(externalRef);
  if (order) {
    order.payment_status = payment.status;
    order.payment_method = payment.payment_method_id;
    order.mp_payment_id = payment.id;
    order.updated_at = new Date().toISOString();
    if (['approved', 'rejected', 'cancelled', 'refunded'].includes(payment.status)) state.stockReservations.delete(externalRef);
    state.orders.set(externalRef, order);
  }
  state.processed.add(String(paymentId));
  return res.status(200).json({ ok: true });
}
