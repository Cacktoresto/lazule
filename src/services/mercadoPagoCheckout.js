import { createCheckoutPreference } from '../commerce/payment/mercadoPagoCheckoutClient.js';
import { trackEvent } from '../utils/analytics.js';

const CHECKOUT_ERROR_MESSAGE = 'Não conseguimos iniciar o pagamento agora. Tente novamente ou fale com a curadoria.';

function safeQuantity(quantity) {
  return Math.max(1, Math.floor(Number(quantity) || 1));
}

function safeMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export class MercadoPagoCheckoutError extends Error {
  constructor(message = CHECKOUT_ERROR_MESSAGE, cause = null) {
    super(message);
    this.name = 'MercadoPagoCheckoutError';
    this.cause = cause;
  }
}

export function buildMercadoPagoCheckoutPayload(items = [], { total = 0, externalReference = null } = {}) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .filter((item) => item?.id || item?.slug)
    .map((item) => {
      const quantity = safeQuantity(item.quantity);
      const unitPrice = safeMoney(item.unit_price ?? item.price ?? item.salePrice);
      const slug = item.slug || item.id;
      return {
        id: item.id || slug,
        slug,
        name: item.name || 'Fragrância LAZULE',
        quantity,
        unit_price: unitPrice,
        total: unitPrice * quantity,
        image: item.image || item.picture_url || null,
      };
    });

  return {
    items: normalizedItems,
    total: safeMoney(total) || normalizedItems.reduce((sum, item) => sum + item.total, 0),
    external_reference: externalReference || `cart-${Date.now()}`,
    source: 'cart_drawer',
  };
}

export function resolveMercadoPagoRedirectUrl(response = {}) {
  const publicKey = import.meta.env?.VITE_MP_PUBLIC_KEY || import.meta.env?.MERCADO_PAGO_PUBLIC_KEY || '';
  const prefersSandbox = publicKey.startsWith('TEST-');
  return prefersSandbox
    ? (response.sandboxInitPoint || response.sandbox_init_point || response.initPoint || response.init_point || null)
    : (response.initPoint || response.init_point || response.sandboxInitPoint || response.sandbox_init_point || null);
}

export async function createMercadoPagoCheckout(items = [], options = {}) {
  const payload = buildMercadoPagoCheckoutPayload(items, options);
  const response = await createCheckoutPreference({
    items: payload.items,
    source: options.source || 'cart_drawer',
    customer: options.customer || null,
    coupon: options.coupon || null,
    identityContext: options.identityContext || null,
    externalReference: payload.external_reference,
  });
  const redirectUrl = resolveMercadoPagoRedirectUrl(response);
  if (!redirectUrl) throw new MercadoPagoCheckoutError(CHECKOUT_ERROR_MESSAGE);
  return { ...response, checkoutPayload: payload, redirectUrl };
}

export async function startMercadoPagoCheckout(items = [], options = {}) {
  const payload = buildMercadoPagoCheckoutPayload(items, options);
  const productIds = payload.items.map((item) => item.slug || item.id).filter(Boolean);
  const redirect = options.redirect || ((url) => window.location.assign(url));

  const checkoutAnalyticsPayload = {
    item_count: payload.items.length,
    total: payload.total,
    source: options.source || 'cart_drawer',
    product_ids: productIds,
  };

  trackEvent('start_checkout', checkoutAnalyticsPayload);
  trackEvent('checkout_start', checkoutAnalyticsPayload);

  try {
    const checkout = await createMercadoPagoCheckout(items, { ...options, externalReference: payload.external_reference });
    trackEvent('mercado_pago_redirect', {
      item_count: payload.items.length,
      total: payload.total,
      source: options.source || 'cart_drawer',
      product_ids: productIds,
      order_id: checkout.orderId,
      preference_id: checkout.preferenceId,
    });
    redirect(checkout.redirectUrl);
    return checkout;
  } catch (error) {
    trackEvent('checkout_error', {
      item_count: payload.items.length,
      total: payload.total,
      source: options.source || 'cart_drawer',
      product_ids: productIds,
      reason: error?.name || 'mercado_pago_checkout_error',
    });
    if (error instanceof MercadoPagoCheckoutError) throw error;
    throw new MercadoPagoCheckoutError(CHECKOUT_ERROR_MESSAGE, error);
  }
}

export { CHECKOUT_ERROR_MESSAGE };
