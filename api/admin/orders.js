import state from '../payments/_store.js';
import { createCommerceRepository } from '../../src/commerce/db/commerceRepository.js';

function isAuthorized(req) {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers['x-lazule-admin-secret'] === secret || req.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const repository = createCommerceRepository({ store: state });
  const statuses = req.query?.status ? String(req.query.status).split(',') : null;
  const limit = Math.min(Number(req.query?.limit || 50), 100);
  const orders = await repository.listOrders({ statuses, limit });
  const jobs = await repository.listJobs({ limit: 20 });
  return res.status(200).json({ orders, jobs, generatedAt: new Date().toISOString() });
}
