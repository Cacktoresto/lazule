const state = require('../payments/_store.js');
const { getPayment } = require('../../src/server/payments/mercadoPagoApi.js');
const { reconcileOrderPayment } = require('../../src/server/commerce/paymentReconciliationEngine.js');

function isAuthorized(req) {
  if (!process.env.CRON_SECRET) return true;
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });

  const results = [];
  const candidates = [...state.orders.values()].filter((order) => {
    if (!order || ['paid', 'failed', 'cancelled', 'refunded'].includes(order.status)) return false;
    return Boolean(order.mpPaymentId || order.payment?.id);
  });

  for (const order of candidates) {
    // Reconcile sequentially to avoid concurrent updates to the in-memory store.
    // eslint-disable-next-line no-await-in-loop
    const result = await reconcileOrderPayment(order.id, { store: state, getPayment, source: 'reconcile_job' });
    results.push({ orderId: order.id, ok: result.ok, reason: result.reason || null, status: result.order?.status || order.status });
  }

  return res.status(200).json({ ok: true, checked: candidates.length, results });
}

module.exports = handler;
