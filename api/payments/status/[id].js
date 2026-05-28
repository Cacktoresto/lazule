const state = require('../_store');
const { getPayment } = require('../../../src/server/payments/mercadoPagoApi');

function mapPaymentStatus(status) {
  if (status === 'approved') return 'paid';
  if (status === 'rejected' || status === 'cancelled') return 'payment_failed';
  if (status === 'refunded') return 'refunded';
  return 'awaiting_payment';
}

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: true, code: 'method_not_allowed' });

  try {
    const id = req.query?.id;
    const shouldReconcile = req.query?.reconcile === '1' || req.query?.reconcile === 'true';
    const order = state.orders.get(id);
    if (!order) return res.status(404).json({ error: true, code: 'not_found' });

    let nextOrder = order;
    if (shouldReconcile && (order.mpPaymentId || order.payment?.id)) {
      const payment = await getPayment(order.mpPaymentId || order.payment.id);
      nextOrder = { ...order, status: mapPaymentStatus(payment.status), mpPaymentId: payment.id || order.mpPaymentId };
      state.orders.set(id, nextOrder);
    }

    return res.status(200).json({
      orderId: nextOrder.id,
      status: nextOrder.status,
      uiState: nextOrder.status,
      order: nextOrder,
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    console.error('[MP] status failed', { code: error?.code || 'status_failed', status, env: process.env.VERCEL_ENV });
    return res.status(status).json({
      error: true,
      code: error?.code || 'status_failed',
      message: process.env.VERCEL_ENV === 'production' ? 'Não conseguimos consultar o pedido agora.' : (error?.message || String(error)),
    });
  }
}

module.exports = handler;
