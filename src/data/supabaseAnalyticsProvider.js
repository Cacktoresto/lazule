const DEFAULT_ANALYTICS_TABLE = 'analytics_events';
const DEFAULT_ANALYTICS_SELECT = '*';
const DEFAULT_TIMEOUT_MS = 5000;

export const REMOTE_ANALYTICS_ALLOWED_EVENTS = new Set([
  'HOME_VIEW',
  'CATALOG_VIEW',
  'SEARCH',
  'PRODUCT_VIEW',
  'ADD_TO_CART',
  'REMOVE_FROM_CART',
  'CART_VIEW',
  'BEGIN_CHECKOUT',
  'WHATSAPP_CLICK',
  'RECOMMENDATION_CLICK',
  'PURCHASE',
  'PAGE_EXIT',
  'MICROCONVERSION_CLICK',
  'influencer_route_visit',
  'referral_applied',
  'product_view',
  'whatsapp_click',
  'coupon_manual_apply',
  'referral_manual_apply',
  'coupon_removed',
  'influencer_invite_opened',
  'influencer_signup_completed',
  'perfume_dna_view',
  'dna_dimension_click',
  'olfactive_signature_view',
  'ideal_usage_click',
  'performance_profile_view',
  'related_signature_click',
]);

const METADATA_ALLOWLIST = new Set([
  'ref',
  'coupon',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'search_term',
  'source_page',
  'page_path',
  'canonical_url',
  'route_name',
  'cta_location',
  'interaction_type',
  'invite_id',
  'has_ref',
  'has_coupon',
  'product_id',
  'product_slug',
  'product_name',
  'item_id',
  'item_name',
  'brand',
  'item_brand',
  'category',
  'item_category',
  'price',
  'status',
  'dominant_dimensions',
  'dimension',
  'dimension_level',
  'usage_type',
  'usage_label',
  'related_product_slug',
  'relationship_block',
  'relationship_score',
  'origin',
  'device',
  'viewport_width',
  'viewport_height',
  'active_filters',
  'filters',
  'filter_name',
  'filter_value',
  'category_name',
  'brand_name',
  'product_count',
  'result_count',
  'time_to_result_ms',
  'search_bucket',
  'query_length',
  'query_terms',
  'item_count',
  'total',
  'products',
  'product_ids',
  'position',
  'recommendation_origin',
  'page_title',
  'exit_reason',
  'order_id',
  'preference_id',
]);

function readRuntimeEnv(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env && Object.hasOwn(import.meta.env, name)) {
    return import.meta.env[name];
  }

  if (typeof process !== 'undefined' && process.env && Object.hasOwn(process.env, name)) {
    return process.env[name];
  }

  return undefined;
}

function readFirstRuntimeEnv(names) {
  return names.map(readRuntimeEnv).find((value) => String(value ?? '').trim());
}

function normalizeBooleanFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function normalizeSupabaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function normalizeText(value, { uppercase = false, maxLength = 120 } = {}) {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, maxLength);

  return uppercase ? normalized.toUpperCase() : normalized;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== ''),
  );
}

function sanitizeMetadataValue(key, value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item, { maxLength: 80 })).filter(Boolean).join(',').slice(0, key === 'products' ? 1200 : 500);
  }

  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value).slice(0, key === 'products' ? 1200 : 500);
    } catch {
      return undefined;
    }
  }

  if (key === 'price' || key === 'total') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : undefined;
  }

  if (key === 'coupon') {
    return normalizeText(value, { uppercase: true, maxLength: 80 });
  }

  if (key === 'canonical_url') {
    return normalizeText(value, { maxLength: 300 });
  }

  return normalizeText(value, { maxLength: 160 });
}

export function getSupabaseAnalyticsConfig() {
  const url = normalizeSupabaseUrl(readFirstRuntimeEnv(['VITE_SUPABASE_URL', 'SUPABASE_URL']));
  const anonKey = String(readFirstRuntimeEnv(['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']) ?? '').trim();
  const table = String(readFirstRuntimeEnv(['VITE_SUPABASE_ANALYTICS_TABLE', 'SUPABASE_ANALYTICS_TABLE']) ?? DEFAULT_ANALYTICS_TABLE).trim();
  const select = String(readFirstRuntimeEnv(['VITE_SUPABASE_ANALYTICS_SELECT', 'SUPABASE_ANALYTICS_SELECT']) ?? DEFAULT_ANALYTICS_SELECT).trim();
  const featureFlag = normalizeBooleanFlag(readFirstRuntimeEnv(['VITE_LAZULE_REMOTE_ANALYTICS_ENABLED', 'LAZULE_REMOTE_ANALYTICS_ENABLED']));

  return {
    url,
    anonKey,
    table: table || DEFAULT_ANALYTICS_TABLE,
    select: select || DEFAULT_ANALYTICS_SELECT,
    enabled: Boolean(featureFlag && url && anonKey),
    featureFlag,
  };
}

export function isRemoteAnalyticsAllowedEvent(eventName) {
  return REMOTE_ANALYTICS_ALLOWED_EVENTS.has(String(eventName || '').trim());
}

export function isAdminAnalyticsPath(pagePath = '') {
  const normalizedPath = String(pagePath || '').trim();
  return normalizedPath === '/admin' || normalizedPath.startsWith('/admin/');
}

export function sanitizeRemoteAnalyticsMetadata(payload = {}) {
  const metadata = {};

  for (const key of METADATA_ALLOWLIST) {
    const sanitizedValue = sanitizeMetadataValue(key, payload[key]);
    if (sanitizedValue !== undefined && sanitizedValue !== null && sanitizedValue !== '') {
      metadata[key] = sanitizedValue;
    }
  }

  return metadata;
}

export function createRemoteAnalyticsPayload(event = {}) {
  const eventName = String(event.name ?? event.type ?? event.event_name ?? '').trim();
  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};

  if (!isRemoteAnalyticsAllowedEvent(eventName)) {
    return null;
  }

  const metadata = sanitizeRemoteAnalyticsMetadata(payload);
  const pagePath = metadata.page_path || normalizeText(payload.page_path, { maxLength: 180 }) || '/';

  if (isAdminAnalyticsPath(pagePath)) {
    return null;
  }

  return compactObject({
    event_name: eventName,
    event_type: eventName,
    occurred_at: event.timestamp || new Date().toISOString(),
    page_path: pagePath,
    influencer_ref: metadata.ref,
    coupon_code: metadata.coupon,
    product_id: metadata.product_id || metadata.item_id,
    product_slug: metadata.product_slug,
    metadata,
  });
}

function buildAnalyticsEventsUrl(config, filters = {}) {
  const url = new URL(`${config.url}/rest/v1/${encodeURIComponent(config.table)}`);
  url.searchParams.set('select', filters.select || config.select || DEFAULT_ANALYTICS_SELECT);
  url.searchParams.set('order', filters.order || 'occurred_at.desc');

  if (filters.limit) {
    url.searchParams.set('limit', String(filters.limit));
  }

  if (filters.influencerRef) {
    url.searchParams.set('influencer_ref', `eq.${normalizeText(filters.influencerRef, { maxLength: 80 })}`);
  }

  if (filters.couponCode) {
    url.searchParams.set('coupon_code', `eq.${normalizeText(filters.couponCode, { uppercase: true, maxLength: 80 })}`);
  }

  if (filters.eventName) {
    url.searchParams.set('event_name', `eq.${normalizeText(filters.eventName, { maxLength: 80 })}`);
  }

  if (filters.since) {
    url.searchParams.set('occurred_at', `gte.${new Date(filters.since).toISOString()}`);
  }

  return url;
}

function buildSupabaseHeaders(config, { accessToken, prefer } = {}) {
  return compactObject({
    apikey: config.anonKey,
    Authorization: `Bearer ${accessToken || config.anonKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Prefer: prefer,
  });
}

async function withTimeout(request, timeoutMs) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await request(controller?.signal);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function sendSupabaseAnalyticsEvent(event, options = {}) {
  const config = { ...getSupabaseAnalyticsConfig(), ...options.config };
  const row = createRemoteAnalyticsPayload(event);

  if (!row || !config.enabled) {
    return { ok: false, skipped: true, row, reason: row ? 'disabled' : 'not_allowed' };
  }

  if (typeof fetch !== 'function') {
    return { ok: false, skipped: true, row, reason: 'fetch_unavailable' };
  }

  try {
    const response = await withTimeout(
      (signal) => fetch(`${config.url}/rest/v1/${encodeURIComponent(config.table)}`, {
        method: 'POST',
        headers: buildSupabaseHeaders(config, { prefer: 'return=minimal' }),
        body: JSON.stringify(row),
        signal,
      }),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    if (!response.ok) {
      return { ok: false, skipped: false, row, status: response.status, error: await response.text().catch(() => '') };
    }

    return { ok: true, skipped: false, row, status: response.status };
  } catch (error) {
    return { ok: false, skipped: false, row, error };
  }
}

export async function fetchSupabaseAnalyticsEvents(filters = {}, options = {}) {
  const config = { ...getSupabaseAnalyticsConfig(), ...options.config };

  if (!config.enabled) {
    return [];
  }

  if (typeof fetch !== 'function') {
    return [];
  }

  try {
    const response = await withTimeout(
      (signal) => fetch(buildAnalyticsEventsUrl(config, filters), {
        headers: buildSupabaseHeaders(config, { accessToken: options.accessToken }),
        signal,
      }),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    if (!response.ok) {
      return [];
    }

    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export default {
  createRemoteAnalyticsPayload,
  fetchSupabaseAnalyticsEvents,
  getSupabaseAnalyticsConfig,
  isRemoteAnalyticsAllowedEvent,
  sendSupabaseAnalyticsEvent,
};
