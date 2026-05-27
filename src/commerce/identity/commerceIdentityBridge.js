import { inferSensoryMemory } from './purchaseMemoryEngine';

const KEY = 'lazule_identity_memory_v1';

export function updateIdentityFromPurchase(items) {
  if (typeof window === 'undefined') return null;
  const memory = inferSensoryMemory(items);
  const current = JSON.parse(window.localStorage.getItem(KEY) || '{}');
  const next = { ...current, ...memory, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function getIdentityMemory() {
  if (typeof window === 'undefined') return {};
  return JSON.parse(window.localStorage.getItem(KEY) || '{}');
}
