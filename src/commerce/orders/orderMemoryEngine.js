const KEY = 'lazule_order_memory_v1';

export function persistOrderMemory(order) {
  if (typeof window === 'undefined') return;
  const history = JSON.parse(window.localStorage.getItem(KEY) || '[]');
  window.localStorage.setItem(KEY, JSON.stringify([{ ...order, createdAt: new Date().toISOString() }, ...history].slice(0, 50)));
}

export function getOrderMemory() {
  if (typeof window === 'undefined') return [];
  return JSON.parse(window.localStorage.getItem(KEY) || '[]');
}
