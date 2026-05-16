import { enrichPayloadWithReferral } from './referral.js';
const STORAGE_KEY = 'lazule.analytics.v2';
const MAX_STORED_EVENTS = 250;
const MAX_STORED_SEARCHES = 100;
const DEFAULT_DEDUPE_MS = 800;
const ROUTE_DEDUPE_MS = 1200;
const PRODUCT_VIEW_DEDUPE_MS = 2500;

const ANALYTICS_CONFIG = {
  gaMeasurementId: getEnvValue('VITE_GA_MEASUREMENT_ID'),
  metaPixelId: getEnvValue('VITE_META_PIXEL_ID'),
  isDev: Boolean(getEnvValue('DEV')),
};

const integrationsState = {
  ga4: false,
  metaPixel: false,
};

const dedupeCache = new Map();
let lastPageViewKey = '';

function getEnvValue(key) {
  try {
    return import.meta.env?.[key] || '';
  } catch {
    return '';
  }
}

function getInitialState() {
  return {
    events: [],
    counters: {
      whatsappClicks: 0,
      cardClicks: 0,
      productViews: 0,
      searches: 0,
    },
    productsViewed: {},
    brandsViewed: {},
    cardCtr: {},
    searches: [],
    integrations: {
      ga4: Boolean(ANALYTICS_CONFIG.gaMeasurementId),
      metaPixel: Boolean(ANALYTICS_CONFIG.metaPixelId),
    },
    updatedAt: null,
  };
}

function canUseWindow() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function canUseStorage() {
  return canUseWindow() && typeof window.localStorage !== 'undefined';
}

function readState() {
  if (!canUseStorage()) {
    return getInitialState();
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    return storedValue ? { ...getInitialState(), ...JSON.parse(storedValue) } : getInitialState();
  } catch {
    return getInitialState();
  }
}

function writeState(state) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Analytics nunca deve bloquear a experiência premium da boutique.
  }
}

function appendAsyncScript({ id, src, innerHTML }) {
  if (!canUseWindow() || document.getElementById(id)) {
    return null;
  }

  const script = document.createElement('script');
  script.id = id;
  script.async = true;

  if (src) {
    script.src = src;
  }

  if (innerHTML) {
    script.innerHTML = innerHTML;
  }

  document.head.appendChild(script);
  return script;
}

export function initializeAnalytics() {
  if (!canUseWindow()) {
    return { ...integrationsState };
  }

  if (ANALYTICS_CONFIG.gaMeasurementId && !integrationsState.ga4) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag() {
        window.dataLayer.push(arguments);
      };

      appendAsyncScript({
        id: 'lazule-ga4-script',
        src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_CONFIG.gaMeasurementId)}`,
      });

      window.gtag('js', new Date());
      window.gtag('config', ANALYTICS_CONFIG.gaMeasurementId, { send_page_view: false });
      integrationsState.ga4 = true;
    } catch (error) {
      devLog('GA4 initialization skipped', error);
    }
  }

  if (ANALYTICS_CONFIG.metaPixelId && !integrationsState.metaPixel) {
    try {
      if (!window.fbq) {
        const fbq = function fbq() {
          fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
        };

        window.fbq = fbq;
        window._fbq = fbq;
        fbq.push = fbq;
        fbq.loaded = true;
        fbq.version = '2.0';
        fbq.queue = [];
      }

      appendAsyncScript({
        id: 'lazule-meta-pixel-script',
        src: 'https://connect.facebook.net/en_US/fbevents.js',
      });

      window.fbq('init', ANALYTICS_CONFIG.metaPixelId);
      integrationsState.metaPixel = true;
    } catch (error) {
      devLog('Meta Pixel initialization skipped', error);
    }
  }

  return { ...integrationsState };
}

function devLog(message, details) {
  if (!ANALYTICS_CONFIG.isDev || typeof console === 'undefined') {
    return;
  }

  console.debug(`[LAZULE analytics] ${message}`, details || '');
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== ''),
  );
}

function getCurrentPagePath() {
  if (!canUseWindow()) {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
}

function getCanonicalUrl(pagePath = getCurrentPagePath()) {
  if (!canUseWindow()) {
    return pagePath;
  }

  try {
    return new URL(pagePath || '/', window.location.origin).toString();
  } catch {
    return window.location.href;
  }
}

function normalizePrice(price) {
  const numericPrice = Number(price);
  return Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : undefined;
}

function normalizeText(value) {
  return String(value || '').trim();
}

export function createProductAnalyticsPayload(product = {}, extraPayload = {}) {
  const productName = normalizeText(product.product_name ?? product.productName ?? product.name);
  const productSlug = normalizeText(product.product_slug ?? product.productSlug ?? product.slug);
  const productId = normalizeText(product.product_id ?? product.productId ?? product.id) || productSlug;
  const category = normalizeText(product.category ?? product.catalogType ?? product.type);

  return compactObject({
    product_id: productId,
    product_slug: productSlug,
    product_name: productName,
    item_id: productId || productSlug,
    item_name: productName,
    brand: normalizeText(product.brand ?? product.brand_name ?? product.brandName),
    item_brand: normalizeText(product.brand ?? product.brand_name ?? product.brandName),
    price: normalizePrice(product.price ?? product.salePrice ?? product.sale_price),
    category,
    item_category: category,
    page_path: getCurrentPagePath(),
    canonical_url: getCanonicalUrl(),
    ...extraPayload,
  });
}

export function createSearchAnalyticsPayload({ searchTerm, resultCount, sourcePage, ...extraPayload } = {}) {
  return compactObject({
    search_term: normalizeText(searchTerm ?? extraPayload.search_term ?? extraPayload.query),
    result_count: Number.isFinite(Number(resultCount)) ? Number(resultCount) : undefined,
    source_page: normalizeText(sourcePage) || getCurrentPagePath(),
    page_path: getCurrentPagePath(),
    canonical_url: getCanonicalUrl(),
    ...extraPayload,
  });
}

function createIntentPayload(payload = {}) {
  return compactObject({
    source_page: normalizeText(payload.source_page ?? payload.sourcePage ?? payload.section) || getCurrentPagePath(),
    page_path: getCurrentPagePath(),
    canonical_url: getCanonicalUrl(),
    ...payload,
  });
}

export function normalizeAnalyticsPayload(eventName, payload = {}) {
  if (eventName === 'view_item' || eventName === 'product_view' || eventName === 'select_item' || eventName === 'product_card_click') {
    return createProductAnalyticsPayload(payload);
  }

  if (eventName === 'search' || eventName === 'search_submit' || eventName === 'empty_search_result') {
    return createSearchAnalyticsPayload(payload);
  }

  return compactObject({
    page_path: getCurrentPagePath(),
    canonical_url: getCanonicalUrl(),
    ...payload,
  });
}

function buildDedupeKey(eventName, payload = {}) {
  return [
    eventName,
    payload.product_id || payload.productId || payload.product_slug || payload.productSlug || '',
    payload.search_term || payload.query || '',
    payload.brand_name || payload.brandName || payload.brand || '',
    payload.category_name || payload.categoryName || payload.category || '',
    payload.cta_location || payload.ctaLocation || payload.section || '',
    payload.page_path || getCurrentPagePath(),
  ].join('|');
}

export function shouldTrackEvent(eventName, payload = {}, options = {}) {
  const dedupeMs = options.dedupeMs ?? DEFAULT_DEDUPE_MS;

  if (dedupeMs <= 0) {
    return true;
  }

  const dedupeKey = options.dedupeKey || buildDedupeKey(eventName, payload);
  const now = Date.now();
  const lastTrackedAt = dedupeCache.get(dedupeKey) || 0;

  if (now - lastTrackedAt < dedupeMs) {
    return false;
  }

  dedupeCache.set(dedupeKey, now);

  for (const [key, timestamp] of dedupeCache.entries()) {
    if (now - timestamp > 60_000) {
      dedupeCache.delete(key);
    }
  }

  return true;
}

function incrementMap(map, key) {
  if (!key) {
    return map;
  }

  return { ...map, [key]: (map[key] ?? 0) + 1 };
}

function updateLocalState(event) {
  const state = readState();
  const nextState = {
    ...state,
    integrations: getInitialState().integrations,
    events: [...(state.events ?? []), event].slice(-MAX_STORED_EVENTS),
    updatedAt: event.timestamp,
  };

  if (event.name === 'whatsapp_click' || event.name === 'generate_lead') {
    nextState.counters = { ...(nextState.counters ?? {}), whatsappClicks: (nextState.counters?.whatsappClicks ?? 0) + 1 };
  }

  if (event.name === 'view_item' || event.name === 'product_view') {
    nextState.counters = { ...(nextState.counters ?? {}), productViews: (nextState.counters?.productViews ?? 0) + 1 };
    nextState.productsViewed = incrementMap(nextState.productsViewed ?? {}, event.payload.product_id ?? event.payload.product_name);
  }

  if (event.name === 'brand_view') {
    nextState.brandsViewed = incrementMap(nextState.brandsViewed ?? {}, event.payload.brand_slug ?? event.payload.brand_name ?? event.payload.brand);
  }

  if (event.name === 'product_card_click' || event.name === 'select_item') {
    nextState.counters = { ...(nextState.counters ?? {}), cardClicks: (nextState.counters?.cardClicks ?? 0) + 1 };
    nextState.cardCtr = incrementMap(nextState.cardCtr ?? {}, event.payload.product_id ?? event.payload.product_name);
  }

  if ((event.name === 'search' || event.name === 'search_submit') && event.payload.search_term) {
    nextState.counters = { ...(nextState.counters ?? {}), searches: (nextState.counters?.searches ?? 0) + 1 };
    nextState.searches = [
      ...(nextState.searches ?? []),
      { query: event.payload.search_term, resultCount: event.payload.result_count ?? null, sourcePage: event.payload.source_page, timestamp: event.timestamp },
    ].slice(-MAX_STORED_SEARCHES);
  }

  writeState(nextState);
}

function forwardToGA4(event) {
  if (!canUseWindow() || !ANALYTICS_CONFIG.gaMeasurementId || typeof window.gtag !== 'function') {
    return;
  }

  try {
    if (event.name === 'page_view') {
      window.gtag('event', 'page_view', {
        page_location: event.payload.canonical_url,
        page_path: event.payload.page_path,
        page_title: document.title,
      });
      return;
    }

    window.gtag('event', event.gaEventName || event.name, event.payload);
  } catch (error) {
    devLog('GA4 event skipped', { event, error });
  }
}

function forwardToMetaPixel(event) {
  if (!canUseWindow() || !ANALYTICS_CONFIG.metaPixelId || typeof window.fbq !== 'function') {
    return;
  }

  try {
    if (event.metaStandardName) {
      window.fbq('track', event.metaStandardName, event.metaPayload || event.payload);
      return;
    }

    window.fbq('trackCustom', event.metaEventName || event.name, event.metaPayload || event.payload);
  } catch (error) {
    devLog('Meta Pixel event skipped', { event, error });
  }
}

function shouldEnrichWithReferral(eventName) {
  return eventName === 'whatsapp_click' || eventName === 'product_view' || eventName === 'product_card_click';
}

function mapEventForDestinations(eventName, payload) {
  const mapped = { gaEventName: eventName, metaEventName: eventName, metaPayload: payload };

  if (eventName === 'page_view') {
    mapped.metaStandardName = 'PageView';
  }

  if (eventName === 'product_view') {
    mapped.gaEventName = 'view_item';
    mapped.metaStandardName = 'ViewContent';
    mapped.metaPayload = {
      content_ids: [payload.product_id || payload.product_slug].filter(Boolean),
      content_name: payload.product_name,
      content_type: 'product',
      value: payload.price,
      currency: payload.price ? 'BRL' : undefined,
      ...payload,
    };
  }

  if (eventName === 'product_card_click' || eventName === 'recommendation_click') {
    mapped.gaEventName = eventName === 'recommendation_click' ? 'recommendation_click' : 'select_item';
  }

  if (eventName === 'whatsapp_click') {
    mapped.gaEventName = 'generate_lead';
    mapped.metaStandardName = 'Contact';
  }

  if (eventName === 'search') {
    mapped.gaEventName = 'search';
    mapped.metaStandardName = 'Search';
    mapped.metaPayload = { search_string: payload.search_term, ...payload };
  }

  return mapped;
}

export function trackEvent(eventName, payload = {}, options = {}) {
  if (!eventName) {
    return null;
  }

  const normalizedPayload = shouldEnrichWithReferral(eventName)
    ? enrichPayloadWithReferral(normalizeAnalyticsPayload(eventName, payload))
    : normalizeAnalyticsPayload(eventName, payload);

  if (!shouldTrackEvent(eventName, normalizedPayload, options)) {
    return null;
  }

  initializeAnalytics();

  const mappedEvent = mapEventForDestinations(eventName, normalizedPayload);
  const event = {
    name: eventName,
    type: eventName,
    payload: normalizedPayload,
    timestamp: new Date().toISOString(),
    ...mappedEvent,
  };

  updateLocalState(event);
  forwardToGA4(event);
  forwardToMetaPixel(event);
  devLog('event', event);

  return event;
}

export function trackPageView({ path, title, routeName } = {}) {
  const pagePath = path || getCurrentPagePath();
  const dedupeKey = `page_view|${pagePath}`;

  if (lastPageViewKey === dedupeKey) {
    return null;
  }

  lastPageViewKey = dedupeKey;

  return trackEvent(
    'page_view',
    {
      page_path: pagePath,
      canonical_url: getCanonicalUrl(pagePath),
      page_title: title || (canUseWindow() ? document.title : undefined),
      route_name: routeName,
    },
    { dedupeKey, dedupeMs: ROUTE_DEDUPE_MS },
  );
}

export function trackProductView(product, extraPayload = {}) {
  const payload = createProductAnalyticsPayload(product, extraPayload);
  return trackEvent('product_view', payload, { dedupeKey: `product_view|${payload.product_id || payload.product_slug || payload.product_name}|${payload.page_path}`, dedupeMs: PRODUCT_VIEW_DEDUPE_MS });
}

export function trackProductSelect(product, extraPayload = {}) {
  return trackEvent('product_card_click', createProductAnalyticsPayload(product, extraPayload));
}

export function trackWhatsappClick(payload = {}) {
  // Privacidade: não coletamos nome, telefone, endereço ou conteúdo da conversa no WhatsApp.
  return trackEvent('whatsapp_click', createIntentPayload(payload));
}

export function trackReferralVisit(payload = {}) {
  // Privacidade: apenas origem/cupom/campanha, sem dados pessoais.
  return trackEvent('referral_visit', createIntentPayload(payload), { dedupeKey: `referral_visit|${payload.ref || ''}|${payload.coupon || ''}|${payload.utm_source || ''}|${payload.utm_campaign || ''}|${payload.page_path || getCurrentPagePath()}`, dedupeMs: ROUTE_DEDUPE_MS });
}

export function trackCouponDetected(payload = {}) {
  if (!payload.coupon) {
    return null;
  }

  return trackEvent('coupon_detected', createIntentPayload(payload), { dedupeKey: `coupon_detected|${payload.coupon}|${payload.page_path || getCurrentPagePath()}`, dedupeMs: ROUTE_DEDUPE_MS });
}

export function trackSearch(payload = {}) {
  return trackEvent('search', createSearchAnalyticsPayload(payload), { dedupeMs: 1200 });
}

export function trackBrandClick(brandName, payload = {}) {
  return trackEvent('brand_click', createIntentPayload({ brand_name: normalizeText(brandName), ...payload }));
}

export function trackCategoryClick(categoryName, payload = {}) {
  return trackEvent('category_click', createIntentPayload({ category_name: normalizeText(categoryName), ...payload }));
}

export function trackRecommendationClick(product, payload = {}) {
  return trackEvent('recommendation_click', createProductAnalyticsPayload(product, payload));
}

export const trackWhatsAppClick = trackWhatsappClick;

export function getAnalyticsSnapshot() {
  return readState();
}

export function resetAnalyticsForTests() {
  dedupeCache.clear();
  lastPageViewKey = '';
}
