import state from './_store.js';
import { getPayment } from '../../src/server/payments/mercadoPagoApi.js';
import { canTransitionOrderStatus, mapMercadoPagoStatus, resolvePaymentNotificationEvent } from '../../src/commerce/orders/orderStatusMachine.js';
import { dispatchCommerceNotification } from '../../src/commerce/notifications/notificationDispatcher.js';

const DEV = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production';
const SUPPORTED_ACTIONS = new Set(['payment.created', 'payment.updated', 'payment.approved', 'payment.rejected', 'payment.cancelled', 'payment.refunded']);

function safeLog(message, details = {}) {
  const sanitized = { ...details };
  delete sanitized.access_token;
  delete sanitized.token;
  console.info(`[MP webhook] ${message}`, sanitized);
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body || '{}');
  return body;
}

export function extractPaymentId(payload = {}, query = {}) {
  return String(
    payload?.data?.id ||
    payload?.resource?.id ||
    payload?.id ||
    query?.['data.id'] ||
    query?.id ||
    query?.payment_id ||
    query?.resource_id ||
    ''
  ).trim();
}

export function extractWebhookEvent(payload = {}, query = {}) {
  return String(payload?.action || payload?.type || query?.action || query?.type || '').trim();
}

export function extractPixData(payment = {}) {
  const data = payment?.point_of_interaction?.transaction_data || {};
  const qrCode = data.qr_code || null;
  const qrCodeBase64 = data.qr_code_base64 || null;
  const ticketUrl = data.ticket_url || null;
  if (!qrCode && !qrCodeBase64 && !ticketUrl) return null;
  return {
    qrCode,
    qrCodeBase64,
    ticketUrl,
    expiresAt: data.expiration_date || data.date_of_expiration || payment.date_of_expiration || null,
  };
}

function buildDedupeKey({ paymentId, status, eventType, orderStatus }) {
  return [paymentId, status, eventType || 'payment.updated', orderStatus].filter(Boolean).join(':');
}

export async function processMercadoPagoWebhook({ payload = {}, query = {}, paymentFetcher = getPayment, store = state } = {}) {
  const eventType = extractWebhookEvent(payload, query);
  const isChargeback = String(eventType).toLowerCase().includes('chargeback') || String(payload?.topic || query?.topic || '').toLowerCase().includes('chargeback');
  const paymentId = extractPaymentId(payload, query);
  safeLog('webhook received', { eventType: eventType || 'unknown', hasPaymentId: Boolean(paymentId) });

  if (!paymentId) return { ok: true, ignored: 'missing_payment_id' };
  safeLog('payment id extracted', { paymentId });

  if (eventType && !SUPPORTED_ACTIONS.has(eventType) && !isChargeback) {
    return { ok: true, ignored: 'unsupported_event', eventType };
  }

  const payment = await paymentFetcher(paymentId);
  safeLog('payment fetched', { paymentId: payment?.id || paymentId, status: payment?.status });

  const orderId = payment?.external_reference || payment?.metadata?.order_id || payment?.metadata?.orderId;
  if (!orderId) return { ok: true, ignored: 'missing_external_reference', paymentId };
  safeLog('external_reference found', { orderId });

  const orderStatus = isChargeback ? 'chargeback' : mapMercadoPagoStatus(payment?.status);
  const dedupeKey = buildDedupeKey({ paymentId: payment?.id || paymentId, status: payment?.status, eventType, orderStatus });
  if (store.processedEvents.has(dedupeKey)) {
    safeLog('duplicate event ignored', { dedupeKey, orderId });
    return { ok: true, deduped: true, orderId, status: orderStatus };
  }

  const order = store.orders.get(orderId);
  if (!order) {
    store.processedEvents.add(dedupeKey);
    return { ok: true, ignored: 'order_not_found', orderId, status: orderStatus };
  }

  const now = new Date().toISOString();
  const nextStatus = canTransitionOrderStatus(order.status, orderStatus) ? orderStatus : order.status;
  const pix = extractPixData(payment);
  const updatedOrder = {
    ...order,
    status: nextStatus,
    mpPaymentId: payment?.id || paymentId,
    mpStatus: payment?.status || null,
    pix: pix || order.pix || null,
    payment: {
      ...(order.payment || {}),
      id: payment?.id || paymentId,
      status: payment?.status || null,
      statusDetail: payment?.status_detail || null,
      paymentMethodId: payment?.payment_method_id || null,
      paymentTypeId: payment?.payment_type_id || null,
      pix: pix || order.payment?.pix || null,
    },
    updatedAt: now,
    paymentStatusHistory: [
      ...(Array.isArray(order.paymentStatusHistory) ? order.paymentStatusHistory : []),
      { paymentId: payment?.id || paymentId, mpStatus: payment?.status || null, mappedStatus: orderStatus, appliedStatus: nextStatus, eventType, at: now },
    ],
    timeline: [
      ...(Array.isArray(order.timeline) ? order.timeline : []),
      { type: 'payment_webhook', label: `Mercado Pago: ${payment?.status || 'unknown'}`, status: nextStatus, at: now },
    ],
  };

  store.orders.set(orderId, updatedOrder);
  store.processedEvents.add(dedupeKey);
  safeLog('order updated', { orderId, status: updatedOrder.status, paymentId: updatedOrder.mpPaymentId });

  const notificationEvent = resolvePaymentNotificationEvent({ eventType, orderStatus: nextStatus });
  if (notificationEvent) {
    await dispatchCommerceNotification(notificationEvent, { order: updatedOrder, to: updatedOrder.customer?.email, statusUrl: `${process.env.SITE_URL || 'https://www.lazule.store'}/pedido/${orderId}` });
  }

  return { ok: true, orderId, status: updatedOrder.status, paymentId: updatedOrder.mpPaymentId };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const payload = parseBody(req.body);
    if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'invalid_payload' });
    const result = await processMercadoPagoWebhook({ payload, query: req.query || {} });
    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : 500;
    const publicBody = { ok: false, error: status === 400 ? 'invalid_payload' : 'webhook_failed' };
    safeLog('error structured', { status, message: error?.message, stack: DEV ? error?.stack : undefined });
    return res.status(status).json(DEV ? { ...publicBody, message: error?.message, stack: error?.stack } : publicBody);
  }
}
