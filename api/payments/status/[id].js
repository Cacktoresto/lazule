import state from '../_store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const id = req.query.id;
  const order = state.orders.get(id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  return res.status(200).json({ order });
}
