const STORAGE_KEY = 'lazule.analytics.v1';
const ENABLED_INTEGRATIONS = {
  ga4: false,
  metaPixel: false,
  postHog: false,
  plausible: false,
};

function getInitialState() {
  return {
    events: [],
    counters: {
      whatsappClicks: 0,
      cardClicks: 0,
    },
    productsViewed: {},
    brandsViewed: {},
    cardCtr: {},
    searches: [],
    integrations: ENABLED_INTEGRATIONS,
    updatedAt: null,
  };
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
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
    // Analytics must never block the boutique experience.
  }
}

function incrementMap(map, key) {
  if (!key) {
    return map;
  }

  return { ...map, [key]: (map[key] ?? 0) + 1 };
}

function forwardToFutureIntegrations() {
  // Reserved extension point for GA4, Meta Pixel, PostHog and Plausible.
}

export function trackEvent(type, payload = {}) {
  const state = readState();
  const event = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  const nextState = {
    ...state,
    events: [...(state.events ?? []), event].slice(-250),
    updatedAt: event.timestamp,
  };

  if (type === 'whatsapp_click') {
    nextState.counters = { ...(nextState.counters ?? {}), whatsappClicks: (nextState.counters?.whatsappClicks ?? 0) + 1 };
  }

  if (type === 'product_view') {
    nextState.productsViewed = incrementMap(nextState.productsViewed ?? {}, payload.productId ?? payload.productName);
  }

  if (type === 'brand_view') {
    nextState.brandsViewed = incrementMap(nextState.brandsViewed ?? {}, payload.brandSlug ?? payload.brandName);
  }

  if (type === 'card_click') {
    nextState.counters = { ...(nextState.counters ?? {}), cardClicks: (nextState.counters?.cardClicks ?? 0) + 1 };
    nextState.cardCtr = incrementMap(nextState.cardCtr ?? {}, payload.productId ?? payload.productName);
  }

  if (type === 'search' && payload.query) {
    nextState.searches = [
      ...(nextState.searches ?? []),
      { query: payload.query, resultCount: payload.resultCount ?? null, timestamp: event.timestamp },
    ].slice(-100);
  }

  writeState(nextState);
  forwardToFutureIntegrations(event, nextState.integrations);
}

export function trackWhatsAppClick(payload = {}) {
  trackEvent('whatsapp_click', payload);
}

export function getAnalyticsSnapshot() {
  return readState();
}
