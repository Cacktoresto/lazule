import state from '../_store.js';
import { resolveOrderStatusView } from '../../../src/commerce/orders/orderStatusMachine.js';
import { buildOrderTimeline } from '../../../src/commerce/orders/orderTimelineEngine.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const id = req.query.id;
  const order = state.orders.get(id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  const view = resolveOrderStatusView(order);
  return res.status(200).json({
    orderId: order.id,
    status: order.status,
    view,
    timeline: buildOrderTimeline({ ...order, statusView: view }),
    order: { ...order, statusView: view },
  });
}
