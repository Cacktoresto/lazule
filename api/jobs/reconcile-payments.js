import state from '../payments/_store.js';
import { getPayment } from '../../src/server/payments/mercadoPagoApi.js';
import { createCommerceRepository } from '../../src/commerce/db/commerceRepository.js';
import { reconcileOrderPayment } from '../../src/commerce/payments/paymentReconciliationEngine.js';
import { createCommerceTrace } from '../../src/commerce/observability/commerceTrace.js';

const CRON_SECRET = process.env.JOBS_SECRET || process.env.CRON_SECRET;
const PENDING_STATUSES = ['awaiting_payment', 'pending', 'processing'];

function isAuthorized(req) {
  if (!CRON_SECRET) return process.env.NODE_ENV !== 'production';
  return req.headers['x-lazule-jobs-secret'] === CRON_SECRET || req.headers.authorization === `Bearer ${CRON_SECRET}`;
}

export async function runPaymentReconciliation({ store = state, limit = 25 } = {}) {
  const repository = createCommerceRepository({ store });
  const trace = createCommerceTrace({ operation: 'payment_reconciled', source: 'cron_reconcile_payments' });
  const orders = await repository.listOrders({ statuses: PENDING_STATUSES, limit });
  const results = [];
  for (const order of orders) {
    if (!order.mpPaymentId && !order.payment?.id) {
      results.push({ orderId: order.id, ok: false, reason: 'missing_payment_id' });
      continue;
    }
    const result = await reconcileOrderPayment(order.id, { store, getPayment, source: 'cron_reconcile_payments' });
    results.push({ orderId: order.id, ok: result.ok, reason: result.reason || null, status: result.order?.status || null });
  }
  trace.log('info', 'cron reconciliation completed', { checked: orders.length, fixed: results.filter((item) => item.ok).length });
  return { ok: true, checked: orders.length, results };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });
  try {
    const limit = Math.min(Number(req.query?.limit || 25), 100);
    const result = await runPaymentReconciliation({ store: state, limit });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[LZL][payment_reconciled]', { error: error?.message || String(error) });
    return res.status(500).json({ ok: false, error: 'reconciliation_failed' });
  }
}
