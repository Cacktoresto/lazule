export const INVENTORY_STATUSES = Object.freeze(['in_stock', 'low_stock', 'reserved', 'sold_out', 'on_request', 'hidden']);

function normalize(record = {}, productId = null) {
  return {
    productId: record.productId || record.product_id || productId,
    quantityAvailable: Number(record.quantityAvailable ?? record.quantity_available ?? 0),
    quantityReserved: Number(record.quantityReserved ?? record.quantity_reserved ?? 0),
    quantitySold: Number(record.quantitySold ?? record.quantity_sold ?? 0),
    status: record.status || 'in_stock',
    lowStockThreshold: Number(record.lowStockThreshold ?? record.low_stock_threshold ?? 2),
    updatedAt: record.updatedAt || record.updated_at || new Date().toISOString(),
  };
}

function deriveStatus(record) {
  if (record.status === 'hidden' || record.status === 'on_request') return record.status;
  if (record.quantityAvailable <= 0 && record.quantityReserved > 0) return 'reserved';
  if (record.quantityAvailable <= 0) return 'sold_out';
  if (record.quantityAvailable <= record.lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

export async function getInventoryRecord(repository, productId) {
  const record = await repository.getInventory(productId);
  return record ? normalize(record, productId) : null;
}

export async function reserveInventory(repository, items = [], { orderId = null } = {}) {
  const updates = [];
  for (const item of items) {
    const productId = item.id || item.product_id;
    const quantity = Number(item.quantity || 1);
    const existing = await repository.getInventory(productId);
    if (!existing) continue;
    const current = normalize(existing, productId);
    if (current.status === 'hidden' || current.status === 'sold_out' || current.status === 'on_request' || current.quantityAvailable < quantity) {
      throw new Error(`inventory_unavailable:${productId}`);
    }
    const next = {
      ...current,
      quantityAvailable: current.quantityAvailable - quantity,
      quantityReserved: current.quantityReserved + quantity,
      updatedAt: new Date().toISOString(),
      lastOrderId: orderId,
    };
    next.status = deriveStatus(next);
    updates.push(await repository.upsertInventory(next));
  }
  return updates;
}

export async function confirmInventorySale(repository, items = [], { orderId = null } = {}) {
  const updates = [];
  for (const item of items) {
    const productId = item.id || item.product_id;
    const quantity = Number(item.quantity || 1);
    const existing = await repository.getInventory(productId);
    if (!existing) continue;
    const current = normalize(existing, productId);
    const next = {
      ...current,
      quantityReserved: Math.max(0, current.quantityReserved - quantity),
      quantitySold: current.quantitySold + quantity,
      updatedAt: new Date().toISOString(),
      lastOrderId: orderId,
    };
    next.status = deriveStatus(next);
    updates.push(await repository.upsertInventory(next));
  }
  return updates;
}

export async function releaseInventoryReservation(repository, items = [], { orderId = null } = {}) {
  const updates = [];
  for (const item of items) {
    const productId = item.id || item.product_id;
    const quantity = Number(item.quantity || 1);
    const existing = await repository.getInventory(productId);
    if (!existing) continue;
    const current = normalize(existing, productId);
    const next = {
      ...current,
      quantityAvailable: current.quantityAvailable + Math.min(quantity, current.quantityReserved),
      quantityReserved: Math.max(0, current.quantityReserved - quantity),
      updatedAt: new Date().toISOString(),
      lastOrderId: orderId,
    };
    next.status = deriveStatus(next);
    updates.push(await repository.upsertInventory(next));
  }
  return updates;
}
