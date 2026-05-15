import { getLocalAnalyticsEventsSnapshot } from '../data/localAnalyticsProvider.js';

const EMPTY_METRICS = {
  pageViews: 0,
  productViews: 0,
  whatsappClicks: 0,
  productToWhatsappRate: 0,
  searches: 0,
  emptySearches: 0,
  brandClicks: 0,
  categoryClicks: 0,
  recommendationClicks: 0,
};

const EVENT_GROUPS = {
  pageView: new Set(['page_view']),
  productView: new Set(['product_view', 'view_item']),
  productSelect: new Set(['product_card_click', 'select_item']),
  whatsapp: new Set(['whatsapp_click', 'generate_lead']),
  search: new Set(['search', 'search_submit']),
  emptySearch: new Set(['empty_search_result']),
  brand: new Set(['brand_click', 'brand_view']),
  category: new Set(['category_click']),
  recommendation: new Set(['recommendation_click']),
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

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    const payload = getPayload(event);

    if (!EVENT_GROUPS.productView.has(eventName) && !EVENT_GROUPS.whatsapp.has(eventName)) {
      continue;
    }

    if (!hasProductIdentity(payload)) {
      continue;
    }

    const productName = getProductName(payload);
    const brand = getBrandName(payload);
    const key = normalizeText(payload.product_id ?? payload.product_slug) || `${productName}|${brand}`;
    const targetMap = EVENT_GROUPS.whatsapp.has(eventName) ? whatsappClicks : productViews;
    const current = targetMap.get(key) || { product_name: productName, brand, views: 0, whatsapp_clicks: 0 };

    if (EVENT_GROUPS.whatsapp.has(eventName)) {
      current.whatsapp_clicks += 1;
    } else {
      current.views += 1;
    }

    targetMap.set(key, current);
  }

  return {
    viewed: sortRanking([...productViews.values()], 'views', limit),
    whatsapp: sortRanking([...whatsappClicks.values()], 'whatsapp_clicks', limit),
  };
}

export function aggregateTopBrands(events = [], { limit = 8 } = {}) {
  const brands = new Map();

  for (const event of normalizeAnalyticsEvents(events)) {
    const eventName = getEventName(event);
    if (!EVENT_GROUPS.brand.has(eventName)) continue;

    const brandName = getBrandName(getPayload(event));
    const current = brands.get(brandName) || { brand_name: brandName, clicks: 0, views: 0, count: 0 };
    if (eventName === 'brand_view') current.views += 1;
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
    if (!EVENT_GROUPS.category.has(eventName)) continue;

    const categoryName = getCategoryName(getPayload(event));
    const current = categories.get(categoryName) || { category_name: categoryName, clicks: 0 };
    current.clicks += 1;
    categories.set(categoryName, current);
  }

  return sortRanking([...categories.values()], 'clicks', limit);
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

export function aggregateFunnel(events = []) {
  const metrics = normalizeAnalyticsEvents(events).reduce((accumulator, event) => {
    const eventName = getEventName(event);

    if (EVENT_GROUPS.pageView.has(eventName)) accumulator.pageViews += 1;
    if (EVENT_GROUPS.productSelect.has(eventName)) accumulator.productSelects += 1;
    if (EVENT_GROUPS.productView.has(eventName)) accumulator.productViews += 1;
    if (EVENT_GROUPS.whatsapp.has(eventName)) accumulator.whatsappClicks += 1;

    return accumulator;
  }, { pageViews: 0, productSelects: 0, productViews: 0, whatsappClicks: 0 });

  const steps = [
    { key: 'pageViews', label: 'Visitas de página', value: metrics.pageViews },
    { key: 'productSelects', label: 'Cliques em produto', value: metrics.productSelects },
    { key: 'productViews', label: 'Visualizações de produto', value: metrics.productViews },
    { key: 'whatsappClicks', label: 'Intenção no WhatsApp', value: metrics.whatsappClicks },
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
