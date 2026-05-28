import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommerceRepository, hasSupabaseEnv, toEventRecord } from '../src/commerce/db/commerceRepository.js';
import { appendOrderEvent } from '../src/commerce/orders/orderEventEngine.js';
import { reserveInventory, confirmInventorySale, releaseInventoryReservation } from '../src/commerce/inventory/inventoryEngine.js';
import { enqueueJob } from '../src/commerce/jobs/jobQueue.js';
import { cache } from '../src/commerce/cache/cacheClient.js';

test('commerce repository persists orders and append-only events in local fallback', async () => {
  const store = {};
  const repository = createCommerceRepository({ store, forceLocal: true });
  let order = { id: 'order-1', status: 'awaiting_payment', items: [], total: 100, events: [] };
  order = appendOrderEvent(order, { type: 'order_created', source: 'test' });
  await repository.saveOrder(order);

  const persisted = await repository.getOrder('order-1');
  assert.equal(persisted.id, 'order-1');
  assert.equal(persisted.events.length, 1);
  assert.equal(persisted.events[0].type, 'order_created');

  const record = toEventRecord(persisted.events[0], 'order-1');
  assert.equal(record.order_id, 'order-1');
  assert.equal(record.event_type, 'order_created');
});

test('inventory reservation, sale confirmation and release update quantities', async () => {
  const repository = createCommerceRepository({ store: {}, forceLocal: true });
  await repository.upsertInventory({ productId: 'sku-1', quantityAvailable: 3, quantityReserved: 0, quantitySold: 0, status: 'in_stock', lowStockThreshold: 1 });

  await reserveInventory(repository, [{ id: 'sku-1', quantity: 2 }], { orderId: 'order-1' });
  let inventory = await repository.getInventory('sku-1');
  assert.equal(inventory.quantityAvailable, 1);
  assert.equal(inventory.quantityReserved, 2);
  assert.equal(inventory.status, 'low_stock');

  await confirmInventorySale(repository, [{ id: 'sku-1', quantity: 1 }], { orderId: 'order-1' });
  inventory = await repository.getInventory('sku-1');
  assert.equal(inventory.quantityReserved, 1);
  assert.equal(inventory.quantitySold, 1);

  await releaseInventoryReservation(repository, [{ id: 'sku-1', quantity: 1 }], { orderId: 'order-1' });
  inventory = await repository.getInventory('sku-1');
  assert.equal(inventory.quantityAvailable, 2);
  assert.equal(inventory.quantityReserved, 0);
});

test('jobs and cache foundations expose future-proof adapters', async () => {
  const repository = createCommerceRepository({ store: {}, forceLocal: true });
  const job = await enqueueJob(repository, { type: 'reconcile_payment', orderId: 'order-1', payload: { orderId: 'order-1' } });
  const jobs = await repository.listJobs();
  assert.equal(jobs[0].id, job.id);
  assert.equal(jobs[0].type, 'reconcile_payment');

  let produced = 0;
  const value = await cache.remember('catalog:public', async () => {
    produced += 1;
    return ['sku-1'];
  });
  const cached = await cache.remember('catalog:public', async () => {
    produced += 1;
    return [];
  });
  assert.deepEqual(value, ['sku-1']);
  assert.deepEqual(cached, ['sku-1']);
  assert.equal(produced, 1);
});

test('supabase source-of-truth activation requires url and service or anon key', () => {
  assert.equal(hasSupabaseEnv({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret' }), true);
  assert.equal(hasSupabaseEnv({ SUPABASE_URL: 'https://example.supabase.co' }), false);
});
