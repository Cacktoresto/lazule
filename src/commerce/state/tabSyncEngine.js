const CHANNEL_NAME = 'lazule-commerce-state';
const STORAGE_KEY = 'lazule_tab_sync_event_v1';

export function createTabSyncChannel({ onMessage } = {}) {
  if (typeof window === 'undefined') return { publish() {}, close() {} };
  const handle = (event) => {
    const data = event?.data || (event?.newValue ? JSON.parse(event.newValue) : null);
    if (data?.sourceTabId !== tabId()) onMessage?.(data);
  };
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
  if (channel) channel.onmessage = handle;
  window.addEventListener('storage', handle);
  return {
    publish(message) {
      const payload = { ...message, sourceTabId: tabId(), timestamp: new Date().toISOString() };
      if (channel) channel.postMessage(payload);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    close() {
      if (channel) channel.close();
      window.removeEventListener('storage', handle);
    },
  };
}

function tabId() {
  if (typeof window === 'undefined') return 'server';
  if (!window.__lazuleTabId) window.__lazuleTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return window.__lazuleTabId;
}

export function publishOrderUpdate(channel, order) {
  channel?.publish?.({ type: 'order_update', orderId: order?.id, status: order?.status, order });
}

export function publishCheckoutStatus(channel, checkoutSession) {
  channel?.publish?.({ type: 'checkout_status', checkoutSessionId: checkoutSession?.id, orderId: checkoutSession?.orderId, checkoutSession });
}
