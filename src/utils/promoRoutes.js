import { captureReferralParams } from './referral.js';

const PROMO_ROUTE_PATTERN = /^\/promo\/([^/]+)\/?$/;
const INFLUENCER_ROUTE_PATTERN = /^\/(?:i|indica)\/([^/]+)\/?$/;
const CATALOG_REDIRECT_PATH = '/catalogo';

function safelyDecodeSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function createSearchParams(search) {
  if (search instanceof URLSearchParams) {
    return new URLSearchParams(search.toString());
  }

  return new URLSearchParams(String(search || '').startsWith('?') ? search : `?${search || ''}`);
}

export function getPromoRouteMatch(pathname = '') {
  const path = String(pathname || '');
  const promoMatch = path.match(PROMO_ROUTE_PATTERN);

  if (promoMatch) {
    return { routeType: 'promo', coupon: safelyDecodeSegment(promoMatch[1]), source_page: 'promo_route' };
  }

  const influencerMatch = path.match(INFLUENCER_ROUTE_PATTERN);

  if (influencerMatch) {
    return { routeType: 'influencer', ref: safelyDecodeSegment(influencerMatch[1]), source_page: 'influencer_route' };
  }

  return null;
}

export function isPromoReferralRoute(pathname = '') {
  return Boolean(getPromoRouteMatch(pathname));
}

export function buildPromoReferralSearch({ pathname = '', search = '' } = {}) {
  const match = getPromoRouteMatch(pathname);

  if (!match) {
    return null;
  }

  const params = createSearchParams(search);

  if (match.ref) {
    params.set('ref', match.ref);
  }

  if (match.coupon) {
    params.set('coupon', match.coupon);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function createPromoRoutePayload({ pathname = '', search = '', hash = '', context = {} } = {}) {
  const match = getPromoRouteMatch(pathname);

  if (!match) {
    return null;
  }

  return {
    ref: context.ref,
    coupon: context.coupon,
    utm_source: context.utm_source,
    utm_campaign: context.utm_campaign,
    source_page: match.source_page,
    page_path: `${pathname}${search}${hash}`,
  };
}

export function applyPromoReferralRoute({ pathname = '', search = '', hash = '', now, expirationDays, attributionMode } = {}) {
  const match = getPromoRouteMatch(pathname);

  if (!match) {
    return null;
  }

  const referralSearch = buildPromoReferralSearch({ pathname, search });
  const context = captureReferralParams({ search: referralSearch, now, expirationDays, attributionMode });

  return {
    routeType: match.routeType,
    source_page: match.source_page,
    context,
    payload: createPromoRoutePayload({ pathname, search, hash, context }),
    redirectTo: CATALOG_REDIRECT_PATH,
  };
}
