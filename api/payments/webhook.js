const state = require('./_store');
const { getPayment } = require('../../src/server/payments/mercadoPagoApi');

function extractPaymentId(payload = {}, query = {}) {
  const id = payload?.data?.id || payload?.id || query?.['data.id'] || query?.id || query?.payment_id;
  return id == null ? null : String(id);
}

function extractPixData(payment = {}) {
  const transactionData = payment?.point_of_interaction?.transaction_data || {};
  return {
    qrCode: transactionData.qr_code || null,
    qrCodeBase64: transactionData.qr_code_base64 || null,
    ticketUrl: transactionData.ticket_url || null,
  };
}

function createEventKey({ orderId, paymentId, status }) {
  return [orderId || 'no-order', paymentId || 'no-payment', status || 'unknown'].join(':');
}

function mapPaymentStatus(status) {
  if (status === 'approved') return 'paid';
  if (status === 'rejected' || status === 'cancelled') return 'payment_failed';
  if (status === 'refunded') return 'refunded';
  return 'awaiting_payment';
}

async function processMercadoPagoWebhook({ payload = {}, query = {}, store = state, paymentFetcher = getPayment } = {}) {
  const paymentId = extractPaymentId(payload, query);
  if (!paymentId) return { ok: true, ignored: 'missing_payment_id' };

  const payment = await paymentFetcher(paymentId);
  const orderId = payment.external_reference || payment.metadata?.orderId || payment.metadata?.order_id;
  const nextStatus = mapPaymentStatus(payment.status);
  const key = createEventKey({ orderId, paymentId: payment.id || paymentId, status: payment.status });

  store.processedEvents = store.processedEvents || new Set();
  if (store.processedEvents.has(key)) return { ok: true, deduped: true, status: store.orders?.get(orderId)?.status };
  store.processedEvents.add(key);

  const order = store.orders?.get(orderId);
  if (!order) return { ok: true, ignored: 'order_not_found' };

  const history = Array.isArray(order.paymentStatusHistory) ? order.paymentStatusHistory : [];
  const updatedOrder = {
    ...order,
    status: nextStatus,
    mpPaymentId: payment.id || paymentId,
    pix: extractPixData(payment),
    paymentStatusHistory: history.concat({
      paymentId: payment.id || paymentId,
      status: payment.status,
      receivedAt: new Date().toISOString(),
      source: 'mercado_pago_webhook',
    }),
  };

  store.orders.set(orderId, updatedOrder);
  return { ok: true, orderId, status: updatedOrder.status, order: updatedOrder };
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: true, code: 'method_not_allowed' });

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const result = await processMercadoPagoWebhook({ payload, query: req.query || {}, store: state, paymentFetcher: getPayment });
    console.info('[MP] webhook processed', {
      orderId: result.orderId,
      status: result.status || result.ignored || 'ok',
      hasToken: Boolean(process.env.MP_ACCESS_TOKEN),
      env: process.env.VERCEL_ENV,
    });
    return res.status(200).json({ ok: true, deduped: Boolean(result.deduped), ignored: result.ignored });
  } catch (error) {
    console.error('[MP] webhook failed', { code: error?.code || 'webhook_failed', env: process.env.VERCEL_ENV });
    return res.status(200).json({ ok: true });
  }
}

module.exports = handler;
module.exports.extractPaymentId = extractPaymentId;
module.exports.extractPixData = extractPixData;
module.exports.processMercadoPagoWebhook = processMercadoPagoWebhook;
