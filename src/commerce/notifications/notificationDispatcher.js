import { buildEmailTemplate } from './emailTemplates.js';
import { createEmailProvider } from './emailProvider.js';

const EVENT_TO_EMAIL = new Set(['order_created', 'payment_approved', 'payment_pending', 'payment_failed', 'order_preparing', 'order_shipped', 'order_delivered']);

export async function dispatchCommerceNotification(eventName, { order = {}, to, statusUrl, provider } = {}) {
  if (!EVENT_TO_EMAIL.has(eventName) || !to) return { ok: true, skipped: true };
  const template = buildEmailTemplate(eventName, { order, statusUrl });
  try {
    return await (provider || createEmailProvider()).send({ to, ...template, metadata: { eventName, orderId: order.id } });
  } catch (error) {
    console.warn('[NotificationDispatcher] ignored failure', { eventName, orderId: order.id, message: error?.message });
    return { ok: false, error: 'notification_failed' };
  }
}
