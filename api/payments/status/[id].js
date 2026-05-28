const state = require('../_store.js');
const { getPayment } = require('../../../src/server/payments/mercadoPagoApi.js');
const { getOrderState, resolveCanonicalPaymentState } = require('../../../src/server/commerce/orderSourceOfTruth.js');
const { reconcileOrderPayment } = require('../../../src/server/commerce/paymentReconciliationEngine.js');

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const id = req.query.id;
  const shouldReconcile = req.query.reconcile === '1' || req.query.reconcile === 'true';
  let order = getOrderState(id, { store: state });
  if (!order) return res.status(404).json({ error: 'not_found' });

  if (shouldReconcile && (order.mpPaymentId || order.payment?.id)) {
    const reconciliation = await reconcileOrderPayment(id, { store: state, getPayment, source: 'status_polling' });
    if (reconciliation.order) order = { ...reconciliation.order, canonicalState: resolveCanonicalPaymentState(reconciliation.order) };
  }

  const canonicalState = order.canonicalState || resolveCanonicalPaymentState(order);
  return res.status(200).json({
    orderId: order.id,
    status: canonicalState.commercialState,
    uiState: canonicalState.uiState,
    canonicalState,
    order,
  });
}

module.exports = handler;
