import { persistOrderMemory } from '../orders/orderMemoryEngine';
import { updateIdentityFromPurchase } from '../identity/commerceIdentityBridge';

export function processPaymentWebhook(payload) {
  const status = payload?.status || 'processing';
  const items = Array.isArray(payload?.items) ? payload.items : [];
  persistOrderMemory({ id: payload?.external_reference || payload?.id, status, items });

  if (status === 'approved') {
    updateIdentityFromPurchase(items);
  }

  return { ok: true, status };
}
