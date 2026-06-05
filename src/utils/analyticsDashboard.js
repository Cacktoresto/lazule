import { getLocalAnalyticsEventsSnapshot } from '../data/localAnalyticsProvider.js';

const EMPTY_METRICS = {
  pageViews: 0,
  productViews: 0,
  whatsappClicks: 0,
  addToCart: 0,
  cartViews: 0,
  beginCheckout: 0,
  purchases: 0,
  pageExits: 0,
  productToWhatsappRate: 0,
  productToCartRate: 0,
  checkoutPurchaseRate: 0,
  searches: 0,
  emptySearches: 0,
  brandClicks: 0,
  categoryClicks: 0,
  recommendationClicks: 0,
};

const EVENT_GROUPS = {
  homeView: new Set(['HOME_VIEW']),
  catalogView: new Set(['CATALOG_VIEW', 'catalog_view']),
  pageView: new Set(['page_view']),
  productView: new Set(['PRODUCT_VIEW', 'product_view', 'view_item']),
  productSelect: new Set(['product_card_click', 'select_item']),
  addToCart: new Set(['ADD_TO_CART', 'add_to_cart']),
  removeFromCart: new Set(['REMOVE_FROM_CART', 'remove_from_cart', 'remove_from_selection']),
  cartView: new Set(['CART_VIEW', 'cart_view', 'cart_opened']),
  beginCheckout: new Set(['BEGIN_CHECKOUT', 'begin_checkout']),
  purchase: new Set(['PURCHASE', 'purchase', 'payment_approved']),
  pageExit: new Set(['PAGE_EXIT', 'page_exit']),
  whatsapp: new Set(['WHATSAPP_CLICK', 'whatsapp_click', 'generate_lead']),
  search: new Set(['SEARCH', 'search', 'search_submit']),
  emptySearch: new Set(['empty_search_result']),
  brand: new Set(['brand_click', 'brand_view']),
  category: new Set(['category_click']),
  recommendation: new Set(['RECOMMENDATION_CLICK', 'recommendation_click']),
  aiQuery: new Set(['ai_assistant_query']),
  aiClick: new Set(['ai_assistant_result_click']),
  aiWhatsapp: new Set(['ai_assistant_whatsapp_click']),
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function getEventName(event) {
  return normalizeText(event?.name ?? event?.type ?? event?.event_name ?? event?.eventName);
}

function getPayload(event) {
  return event?.payload && typeof event.payload === 'object' ? event.payload : {};
}

function hasProductIdentity(payload) {
  return Boolean(normalizeText(payload.product_id ?? payload.productId ?? payload.product_slug ?? payload.productSlug ?? payload.product_name ?? payload.productName ?? payload.item_name ?? payload.name));
}

function getProductName(payload) {
  return normalizeText(payload.product_name ?? payload.productName ?? payload.item_name ?? payload.name) || 'Produto não identificado';
}

function getBrandName(payload) {
  return normalizeText(payload.brand_name ?? payload.brandName ?? payload.brand ?? payload.item_brand) || 'Marca não identificada';
}

function getCategoryName(payload) {
  return normalizeText(payload.category_name ?? payload.categoryName ?? payload.category ?? payload.item_category) || 'Categoria não identificada';
}

function getSearchTerm(payload) {
  return normalizeText(payload.search_term ?? payload.searchTerm ?? payload.query).toLowerCase();
}

function eventSignature(event) {
  const payload = getPayload(event);
  return JSON.stringify({
    name: getEventName(event),
    timestamp: event?.timestamp ?? event?.createdAt ?? '',
    product: payload.product_id ?? payload.product_slug ?? payload.product_name ?? payload.item_name ?? '',
    search: payload.search_term ?? payload.searchTerm ?? payload.query ?? '',
    source: payload.source_page ?? payload.sourcePage ?? payload.page_path ?? '',
    cta: payload.cta_location ?? payload.ctaLocation ?? '',
  });
}

export function normalizeAnalyticsEvents(events = [], { dedupe = true } = {}) {
  const seen = new Set();

  return asArray(events).filter((event) => {
    if (!event || typeof event !== 'object' || !getEventName(event)) {
      return false;
    }

    if (!dedupe) {
      return true;
    }

    const signature = eventSignature(event);
    if (seen.has(signature)) {
      return false;
    }

    seen.add(signature);
    return true;
  });
}

export function getLocalAnalyticsEvents(provider = getLocalAnalyticsEventsSnapshot) {
  return normalizeAnalyticsEvents(provider());
}

export function getAnalyticsEvents(provider = getLocalAnalyticsEventsSnapshot) {
  // Provider seam: swap provider for Supabase, GA4 Data API, BigQuery or an API endpoint later.
  return getLocalAnalyticsEvents(provider);
}

export function calculateConversionRate(productViews, whatsappClicks) {
  const views = toNumber(productViews);
  const clicks = toNumber(whatsappClicks);

  if (views <= 0 || clicks <= 0) {
    return 0;
  }

  return clicks / views;
}

export function aggregateMetrics(events = []) {
  const metrics = normalizeAnalyticsEvents(events).reduce((accumulator, event) => {
    const eventName = getEventName(event);
    const payload = getPayload(event);

    if (EVENT_GROUPS.pageView.has(eventName)) accumulator.pageViews += 1;
    if (EVENT_GROUPS.productView.has(eventName)) accumulator.productViews += 1;
    if (EVENT_GROUPS.whatsapp.has(eventName)) accumulator.whatsappClicks += 1;
    if (EVENT_GROUPS.addToCart.has(eventName)) accumulator.addToCart += 1;
    if (EVENT_GROUPS.cartView.has(eventName)) accumulator.cartViews += 1;
    if (EVENT_GROUPS.beginCheckout.has(eventName)) accumulator.beginCheckout += 1;
    if (EVENT_GROUPS.purchase.has(eventName)) accumulator.purchases += 1;
    if (EVENT_GROUPS.pageExit.has(eventName)) accumulator.pageExits += 1;
    if (EVENT_GROUPS.search.has(eventName)) accumulator.searches += 1;
    if (EVENT_GROUPS.emptySearch.has(eventName) || (EVENT_GROUPS.search.has(eventName) && toNumber(payload.result_count ?? payload.resultCount, 1) === 0)) accumulator.emptySearches += 1;
    if (eventName === 'brand_click') accumulator.brandClicks += 1;
    if (EVENT_GROUPS.category.has(eventName)) accumulator.categoryClicks += 1;
    if (EVENT_GROUPS.recommendation.has(eventName)) accumulator.recommendationClicks += 1;

    return accumulator;
  }, { ...EMPTY_METRICS });

  return {
    ...metrics,
    productToWhatsappRate: calculateConversionRate(metrics.productViews, metrics.whatsappClicks),
    productToCartRate: calculateConversionRate(metrics.productViews, metrics.addToCart),
    checkoutPurchaseRate: calculateConversionRate(metrics.beginCheckout, metrics.purchases),
  };
}

function sortRanking(items, countKey = 'count', limit = 8) {
  return items
    .sort((left, right) => (right[countKey] - left[countKey]) || String(left.label ?? left.product_name ?? left.search_term).localeCompare(String(right.label ?? right.product_name ?? right.search_term), 'pt-BR'))
    .slice(0, limit);
}

export function aggregateTopProducts(events = [], { limit = 8 } = {}) {
  const productViews = new Map();
  const whatsappClicks = new Map();
  const addToCart = new Map();
  const beginCheckout = new Map();

  function incrementProductRanking(targetMap, payload, field) {
    if (!hasProductIdentity(payload)) return;
    const productName = getProductName(payload);
    const brand = getBrandName(payload);
    const key = normalizeText(payload.product_id ?? payload.product_slug) || `${productName}|${brand}`;
    const current = targetMap.get(key) || { product_name: productName, brand, views: 0, whatsapp_clicks: 0, add_to_cart: 0, begin_checkout: 0 };
    current[field] += 1;
    targetMap.set(key, current);
  }

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    const payload = getPayload(event);

    if (EVENT_GROUPS.beginCheckout.has(eventName) && Array.isArray(payload.products)) {
      payload.products.forEach((product) => incrementProductRanking(beginCheckout, product, 'begin_checkout'));
      continue;
    }

    if (EVENT_GROUPS.whatsapp.has(eventName)) incrementProductRanking(whatsappClicks, payload, 'whatsapp_clicks');
    else if (EVENT_GROUPS.addToCart.has(eventName)) incrementProductRanking(addToCart, payload, 'add_to_cart');
    else if (EVENT_GROUPS.beginCheckout.has(eventName)) incrementProductRanking(beginCheckout, payload, 'begin_checkout');
    else if (EVENT_GROUPS.productView.has(eventName)) incrementProductRanking(productViews, payload, 'views');
  }

  const checkoutByKey = beginCheckout;

  return {
    viewed: sortRanking([...productViews.values()], 'views', limit),
    whatsapp: sortRanking([...whatsappClicks.values()], 'whatsapp_clicks', limit),
    added: sortRanking([...addToCart.values()], 'add_to_cart', limit),
    checkout: sortRanking([...beginCheckout.values()], 'begin_checkout', limit),
    abandoned: sortRanking([...addToCart.values()].map((item) => ({ ...item, abandoned_count: Math.max(0, item.add_to_cart - (checkoutByKey.get(normalizeText(item.product_id ?? item.product_slug) || `${item.product_name}|${item.brand}`)?.begin_checkout || 0)), conversion_rate: calculateConversionRate(item.add_to_cart, checkoutByKey.get(normalizeText(item.product_id ?? item.product_slug) || `${item.product_name}|${item.brand}`)?.begin_checkout || 0) })), 'abandoned_count', limit),
  };
}

export function aggregateTopBrands(events = [], { limit = 8 } = {}) {
  const brands = new Map();

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    if (!EVENT_GROUPS.brand.has(eventName) && !EVENT_GROUPS.productView.has(eventName)) continue;

    const brandName = getBrandName(getPayload(event));
    const current = brands.get(brandName) || { brand_name: brandName, clicks: 0, views: 0, count: 0 };
    if (eventName === 'brand_view' || EVENT_GROUPS.productView.has(eventName)) current.views += 1;
    if (eventName === 'brand_click') current.clicks += 1;
    current.count += 1;
    brands.set(brandName, current);
  }

  return sortRanking([...brands.values()], 'count', limit);
}

export function aggregateTopCategories(events = [], { limit = 8 } = {}) {
  const categories = new Map();

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    if (!EVENT_GROUPS.category.has(eventName) && !EVENT_GROUPS.catalogView.has(eventName) && !EVENT_GROUPS.productView.has(eventName)) continue;

    const categoryName = getCategoryName(getPayload(event));
    const current = categories.get(categoryName) || { category_name: categoryName, clicks: 0, views: 0, count: 0 };
    if (EVENT_GROUPS.category.has(eventName)) current.clicks += 1;
    else current.views += 1;
    current.count += 1;
    categories.set(categoryName, current);
  }

  return sortRanking([...categories.values()], 'count', limit);
}

export function aggregateTopSearches(events = [], { limit = 8 } = {}) {
  const searches = new Map();
  const emptySearches = new Map();

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    const payload = getPayload(event);

    if (!EVENT_GROUPS.search.has(eventName) && !EVENT_GROUPS.emptySearch.has(eventName)) {
      continue;
    }

    const searchTerm = getSearchTerm(payload);
    if (!searchTerm) continue;

    const resultCount = toNumber(payload.result_count ?? payload.resultCount, 0);
    const current = searches.get(searchTerm) || { search_term: searchTerm, count: 0, result_count_total: 0, average_result_count: 0 };
    current.count += 1;
    current.result_count_total += resultCount;
    current.average_result_count = current.result_count_total / current.count;
    searches.set(searchTerm, current);

    if (EVENT_GROUPS.emptySearch.has(eventName) || resultCount === 0) {
      const emptyCurrent = emptySearches.get(searchTerm) || { search_term: searchTerm, count: 0 };
      emptyCurrent.count += 1;
      emptySearches.set(searchTerm, emptyCurrent);
    }
  }

  return {
    all: sortRanking([...searches.values()].map(({ result_count_total: _total, ...search }) => search), 'count', limit),
    empty: sortRanking([...emptySearches.values()], 'count', limit),
  };
}

export function aggregateNoResultSearchReport(events = [], { limit = 12 } = {}) {
  const report = new Map();

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    const payload = getPayload(event);
    const isEmpty = EVENT_GROUPS.emptySearch.has(eventName) || (EVENT_GROUPS.search.has(eventName) && toNumber(payload.result_count ?? payload.resultCount, 1) === 0);
    if (!isEmpty) continue;

    const searchTerm = getSearchTerm(payload);
    if (!searchTerm) continue;

    const sourcePage = normalizeText(payload.source_page ?? payload.sourcePage ?? payload.page_path) || 'Origem não informada';
    const current = report.get(searchTerm) || { search_term: searchTerm, frequency: 0, source_pages: {}, top_source_page: sourcePage };
    current.frequency += 1;
    current.source_pages[sourcePage] = (current.source_pages[sourcePage] || 0) + 1;
    current.top_source_page = Object.entries(current.source_pages).sort((a, b) => b[1] - a[1])[0]?.[0] || sourcePage;
    report.set(searchTerm, current);
  }

  return sortRanking([...report.values()].map((item) => ({ ...item, source_pages: Object.entries(item.source_pages).map(([page, count]) => ({ page, count })) })), 'frequency', limit);
}

export function aggregateTopExitPages(events = [], { limit = 8 } = {}) {
  const exits = new Map();

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    if (!EVENT_GROUPS.pageExit.has(eventName)) continue;
    const payload = getPayload(event);
    const pagePath = normalizeText(payload.page_path ?? payload.pagePath ?? payload.source_page) || 'Página não identificada';
    const current = exits.get(pagePath) || { page_path: pagePath, exits: 0 };
    current.exits += 1;
    exits.set(pagePath, current);
  }

  return sortRanking([...exits.values()], 'exits', limit);
}

export function aggregateTopRecommendations(events = [], { limit = 8 } = {}) {
  const recommendations = new Map();

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    if (!EVENT_GROUPS.recommendation.has(eventName)) continue;

    const payload = getPayload(event);
    if (!hasProductIdentity(payload)) continue;

    const productName = getProductName(payload);
    const sourcePage = normalizeText(payload.source_page ?? payload.sourcePage) || 'Origem não informada';
    const key = `${productName}|${sourcePage}`;
    const current = recommendations.get(key) || { product_name: productName, source_page: sourcePage, count: 0 };
    current.count += 1;
    recommendations.set(key, current);
  }

  return sortRanking([...recommendations.values()], 'count', limit);
}


function incrementIntentMap(map, label, amount = 1) {
  const safeLabel = normalizeText(label);
  if (!safeLabel) return;
  const current = map.get(safeLabel) || { label: safeLabel, count: 0 };
  current.count += amount;
  map.set(safeLabel, current);
}

function incrementProductMap(map, payload, field) {
  const productName = getProductName(payload);
  if (!productName || productName === 'Produto não identificado') return;
  const key = normalizeText(payload.product_slug ?? payload.product_id ?? productName) || productName;
  const current = map.get(key) || { product_name: productName, count: 0, recommended: 0, clicked: 0, whatsapp: 0 };
  current.count += 1;
  current[field] += 1;
  map.set(key, current);
}

function getDnaPayload(payload = {}) {
  return payload.dna && typeof payload.dna === 'object' && !Array.isArray(payload.dna) ? payload.dna : {};
}

export function aggregateAICommerceIntelligence(events = [], { limit = 8 } = {}) {
  const intents = new Map();
  const vibes = new Map();
  const categories = new Map();
  const dnaDistribution = new Map();
  const recommended = new Map();
  const clicked = new Map();
  let aiQueries = 0;
  let noResultSearches = 0;
  let whatsappConversions = 0;

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    const payload = getPayload(event);

    if (EVENT_GROUPS.aiQuery.has(eventName)) {
      aiQueries += 1;
      (payload.ai_intents ?? payload.detected_intents ?? []).forEach((intent) => incrementIntentMap(intents, intent));
      Object.entries(getDnaPayload(payload)).forEach(([dimension, value]) => incrementIntentMap(dnaDistribution, dimension, Number(value) || 0));
      (payload.recommended_product_slugs ?? []).forEach((slug) => incrementIntentMap(recommended, slug));
      if (toNumber(payload.result_count ?? payload.resultCount, 0) === 0) noResultSearches += 1;
    }

    if (EVENT_GROUPS.aiClick.has(eventName)) {
      incrementProductMap(clicked, payload, 'clicked');
      incrementIntentMap(categories, payload.product_category);
      (payload.product_vibes ?? []).forEach((vibe) => incrementIntentMap(vibes, vibe));
    }

    if (EVENT_GROUPS.aiWhatsapp.has(eventName)) {
      whatsappConversions += 1;
      incrementProductMap(clicked, payload, 'whatsapp');
    }
  }

  return {
    aiQueries,
    aiWhatsappRate: calculateConversionRate(aiQueries, whatsappConversions),
    noResultSearches,
    dominantIntents: sortRanking([...intents.values()], 'count', limit),
    dnaDistribution: sortRanking([...dnaDistribution.values()].map((item) => ({ ...item, count: Math.round(item.count * 100) / 100 })), 'count', limit),
    recommendedProducts: sortRanking([...recommended.values()].map((item) => ({ product_name: item.label, count: item.count })), 'count', limit),
    clickedProducts: sortRanking([...clicked.values()], 'count', limit),
    commonVibes: sortRanking([...vibes.values()], 'count', limit),
    relatedCategories: sortRanking([...categories.values()], 'count', limit),
  };
}

export function aggregateFunnel(events = []) {
  const metrics = normalizeAnalyticsEvents(events).reduce((accumulator, event) => {
    const eventName = getEventName(event);
    const payload = getPayload(event);

    if (EVENT_GROUPS.homeView.has(eventName) || (EVENT_GROUPS.pageView.has(eventName) && (payload.route_name === 'home' || payload.page_path === '/'))) accumulator.home += 1;
    if (EVENT_GROUPS.catalogView.has(eventName) || (EVENT_GROUPS.pageView.has(eventName) && payload.route_name === 'catalog')) accumulator.catalog += 1;
    if (EVENT_GROUPS.productView.has(eventName)) accumulator.productViews += 1;
    if (EVENT_GROUPS.addToCart.has(eventName)) accumulator.addToCart += 1;
    if (EVENT_GROUPS.beginCheckout.has(eventName)) accumulator.beginCheckout += 1;
    if (EVENT_GROUPS.purchase.has(eventName)) accumulator.purchase += 1;

    return accumulator;
  }, { home: 0, catalog: 0, productViews: 0, addToCart: 0, beginCheckout: 0, purchase: 0 });

  const steps = [
    { key: 'home', label: 'Home', value: metrics.home },
    { key: 'catalog', label: 'Catálogo', value: metrics.catalog },
    { key: 'productViews', label: 'PDP', value: metrics.productViews },
    { key: 'addToCart', label: 'Add to cart', value: metrics.addToCart },
    { key: 'beginCheckout', label: 'Checkout', value: metrics.beginCheckout },
    { key: 'purchase', label: 'Compra', value: metrics.purchase },
  ];

  return steps.map((step, index) => {
    const previousValue = index === 0 ? step.value : steps[index - 1].value;
    const progressRate = index === 0 ? (step.value > 0 ? 1 : 0) : calculateConversionRate(previousValue, step.value);
    const maxValue = Math.max(...steps.map(({ value }) => value), 1);

    return {
      ...step,
      progressRate,
      relativeWidth: step.value / maxValue,
    };
  });
}

const REFERRAL_EVENT_NAMES = new Set(['referral_visit', 'promo_route_visit', 'influencer_route_visit', 'referral_applied', 'coupon_detected']);

function normalizeReferralRef(value) {
  return normalizeText(value).replace(/^@+/, '').toLowerCase();
}

function normalizeCouponCode(value) {
  return normalizeText(value).toUpperCase();
}

export function normalizeInfluencerProfile(profile = {}) {
  return {
    ...profile,
    influencer_ref: normalizeReferralRef(profile.influencer_ref ?? profile.influencerRef ?? profile.ref),
    coupon_code: normalizeCouponCode(profile.coupon_code ?? profile.couponCode ?? profile.coupon),
  };
}

function getEventRef(payload = {}) {
  return normalizeReferralRef(payload.ref ?? payload.influencer_ref ?? payload.influencerRef);
}

function getEventCoupon(payload = {}) {
  return normalizeCouponCode(payload.coupon ?? payload.coupon_code ?? payload.couponCode);
}

export function eventMatchesInfluencer(event, influencer = {}) {
  const profile = normalizeInfluencerProfile(influencer);
  const payload = getPayload(event);
  const influencerRef = profile.influencer_ref;
  const couponCode = profile.coupon_code;

  if (!influencerRef && !couponCode) {
    return false;
  }

  return Boolean((influencerRef && getEventRef(payload) === influencerRef) || (couponCode && getEventCoupon(payload) === couponCode));
}

export function filterAnalyticsEventsByInfluencer(events = [], influencer = {}) {
  return normalizeAnalyticsEvents(events).filter((event) => eventMatchesInfluencer(event, influencer));
}

export function aggregateInfluencerMetrics(events = [], influencer = {}) {
  const attributedEvents = filterAnalyticsEventsByInfluencer(events, influencer);
  const baseMetrics = aggregateMetrics(attributedEvents);
  const referralVisits = attributedEvents.filter((event) => REFERRAL_EVENT_NAMES.has(getEventName(event))).length;

  return {
    ...baseMetrics,
    attributedEvents: attributedEvents.length,
    referralVisits,
  };
}
