import state from './_store.js';
import { getPayment } from '../../src/server/payments/mercadoPagoApi.js';

const DEV = process.env.NODE_ENV !== 'production';

function mapStatus(mpStatus) {
  if (mpStatus === 'approved') return 'paid';
  if (mpStatus === 'pending' || mpStatus === 'in_process') return 'pending';
  if (mpStatus === 'rejected' || mpStatus === 'cancelled') return 'failed';
  if (mpStatus === 'refunded' || mpStatus === 'charged_back') return 'refunded';
  return 'pending';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    if (DEV) console.info('[MP] webhook received');
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const paymentId = payload?.data?.id || payload?.id || req.query?.['data.id'] || req.query?.id || req.query?.payment_id;
    if (!paymentId) return res.status(200).json({ ok: true, ignored: 'missing_payment_id' });

    const payment = await getPayment(paymentId);
    if (DEV) console.info('[MP] payment fetched', { paymentId: payment.id, status: payment.status });

    const orderId = payment.external_reference;
    const mappedStatus = mapStatus(payment.status);
    const dedupeKey = `${payment.id}:${mappedStatus}`;
    if (state.processedEvents.has(dedupeKey)) return res.status(200).json({ ok: true, deduped: true });

    const order = state.orders.get(orderId);
    if (order) {
      order.status = mappedStatus === 'paid' ? 'paid' : (mappedStatus === 'pending' ? 'awaiting_payment' : mappedStatus);
      order.mpPaymentId = payment.id;
      order.updatedAt = new Date().toISOString();
      order.paymentStatusHistory = [...(order.paymentStatusHistory || []), { paymentId: payment.id, mpStatus: payment.status, mappedStatus, at: order.updatedAt }];
      state.orders.set(orderId, order);
      if (DEV) console.info('[MP] order status updated', { orderId, status: order.status });
    }

    state.processedEvents.add(dedupeKey);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true });
  }
}
