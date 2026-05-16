const STORAGE_KEY = 'lazule.referral.v1';
const DEFAULT_EXPIRATION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_FIELD_LENGTH = 80;
const TRACKED_PARAMS = ['ref', 'coupon', 'utm_source', 'utm_campaign'];
const REFERRAL_CHANGE_EVENT = 'lazule:referral-context-change';

function canUseWindow() {
  return typeof window !== 'undefined';
}

function canUseStorage() {
  return canUseWindow() && typeof window.localStorage !== 'undefined';
}

function getNow() {
  return Date.now();
}

function normalizeExpirationDays(value) {
  const days = Number(value);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_EXPIRATION_DAYS;
}

export function sanitizeReferralValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^\p{L}\p{N}_.-]/gu, '')
    .slice(0, MAX_FIELD_LENGTH);
}

export function sanitizeCouponValue(value) {
  return sanitizeReferralValue(value).toUpperCase();
}

function sanitizeUtmValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[^\p{L}\p{N}_.-]/gu, '')
    .slice(0, MAX_FIELD_LENGTH);
}

function sanitizeByKey(key, value) {
  if (key === 'coupon') {
    return sanitizeCouponValue(value);
  }

  if (key === 'ref') {
    return sanitizeReferralValue(value);
  }

  return sanitizeUtmValue(value);
}

function compactContext(context = {}) {
  const compacted = {};

  for (const key of TRACKED_PARAMS) {
    const value = sanitizeByKey(key, context[key]);
    if (value) {
      compacted[key] = value;
    }
  }

  return compacted;
}

function createContextFromValues(values, { expirationDays = DEFAULT_EXPIRATION_DAYS, now = getNow(), attributionRule = 'latest_manual_touch' } = {}) {
  const compactedValues = compactContext(values);

  if (!Object.keys(compactedValues).length) {
    return null;
  }

  const capturedAt = values.capturedAt || now;

  return {
    ...compactedValues,
    capturedAt,
    expiresAt: values.expiresAt || capturedAt + normalizeExpirationDays(expirationDays) * MS_PER_DAY,
    attributionRule,
  };
}

export function classifyManualReferralCode(value, { preferredType = 'auto' } = {}) {
  const rawValue = String(value ?? '').normalize('NFKC').trim();
  const sanitizedRef = sanitizeReferralValue(rawValue);

  if (!sanitizedRef) {
    return { ok: false, error: 'Informe um cupom ou código válido.' };
  }

  const normalizedType = String(preferredType || 'auto').toLowerCase();
  const shouldTreatAsCoupon = normalizedType === 'coupon'
    || (normalizedType !== 'ref' && (/\d/.test(sanitizedRef) || /[A-Z]/.test(rawValue)));

  if (shouldTreatAsCoupon) {
    return { ok: true, type: 'coupon', coupon: sanitizeCouponValue(sanitizedRef) };
  }

  return { ok: true, type: 'ref', ref: sanitizedRef };
}

export function applyManualReferralCode(value, { preferredType = 'auto', expirationDays = DEFAULT_EXPIRATION_DAYS, now = getNow() } = {}) {
  const classifiedCode = classifyManualReferralCode(value, { preferredType });

  if (!classifiedCode.ok) {
    return classifiedCode;
  }

  const existingContext = getReferralContext({ now });
  const nextValues = { ...existingContext };

  if (classifiedCode.type === 'coupon') {
    nextValues.coupon = classifiedCode.coupon;
  } else {
    nextValues.ref = classifiedCode.ref;
  }

  const nextContext = createContextFromValues(nextValues, { expirationDays, now, attributionRule: existingContext.attributionRule || 'latest_manual_touch' });

  writeStoredContext(nextContext);
  emitReferralChange(nextContext);

  return { ok: true, type: classifiedCode.type, context: nextContext, coupon: nextContext.coupon, ref: nextContext.ref };
}

export function removeReferralField(field, { now = getNow() } = {}) {
  const normalizedField = field === 'coupon' ? 'coupon' : field === 'ref' ? 'ref' : '';

  if (!normalizedField) {
    return { ok: false, error: 'Tipo de código inválido.' };
  }

  const existingContext = getReferralContext({ now });

  if (!existingContext[normalizedField]) {
    return { ok: true, context: existingContext, removed: false };
  }

  const nextValues = { ...existingContext };
  delete nextValues[normalizedField];
  const nextContext = createContextFromValues(nextValues, { now, attributionRule: existingContext.attributionRule }) || {};

  if (Object.keys(nextContext).length) {
    writeStoredContext(nextContext);
  } else {
    removeStoredContext();
  }

  emitReferralChange(nextContext);

  return { ok: true, context: nextContext, removed: true, type: normalizedField };
}

function readStoredContext() {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : null;
  } catch {
    return null;
  }
}

function writeStoredContext(context) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // O tracking de origem nunca deve interromper a jornada de compra.
  }
}

function removeStoredContext() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem ação: localStorage indisponível ou bloqueado.
  }
}

function isExpired(context, now = getNow()) {
  const expiresAt = Number(context?.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

function emitReferralChange(context) {
  if (!canUseWindow() || typeof window.dispatchEvent !== 'function' || typeof window.CustomEvent !== 'function') {
    return;
  }

  window.dispatchEvent(new window.CustomEvent(REFERRAL_CHANGE_EVENT, { detail: context }));
}

function parseSearchParams(search) {
  if (search instanceof URLSearchParams) {
    return search;
  }

  if (typeof search === 'string') {
    return new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  }

  if (canUseWindow()) {
    return new URLSearchParams(window.location.search || '');
  }

  return new URLSearchParams('');
}

function createStoredContext(params, { expirationDays = DEFAULT_EXPIRATION_DAYS, now = getNow() } = {}) {
  const values = compactContext(params);

  if (!Object.keys(values).length) {
    return null;
  }

  const capturedAt = now;

  return {
    ...values,
    capturedAt,
    expiresAt: capturedAt + normalizeExpirationDays(expirationDays) * MS_PER_DAY,
    attributionRule: 'first_touch_until_expiration',
  };
}

function mergeFirstTouch(existingContext, incomingContext) {
  return {
    ...incomingContext,
    ...compactContext(existingContext),
    capturedAt: existingContext.capturedAt || incomingContext.capturedAt,
    expiresAt: existingContext.expiresAt || incomingContext.expiresAt,
    attributionRule: 'first_touch_until_expiration',
  };
}

export function captureReferralParams({ search, expirationDays = DEFAULT_EXPIRATION_DAYS, attributionMode = 'first-touch', now = getNow() } = {}) {
  const searchParams = parseSearchParams(search);
  const incomingParams = {};

  for (const key of TRACKED_PARAMS) {
    const value = sanitizeByKey(key, searchParams.get(key));
    if (value) {
      incomingParams[key] = value;
    }
  }

  if (!Object.keys(incomingParams).length) {
    return getReferralContext({ now });
  }

  const incomingContext = createStoredContext(incomingParams, { expirationDays, now });
  const existingContext = getReferralContext({ now });
  const shouldUseLatestTouch = attributionMode === 'latest-touch' || attributionMode === 'last-touch';

  // Regra documentada: por padrão a LAZULE usa first-touch por 30 dias.
  // Assim, a primeira origem/cupom/campanha válida é preservada até expirar;
  // use attributionMode="latest-touch" para sobrescrever pela visita mais recente.
  const nextContext = existingContext && !shouldUseLatestTouch ? mergeFirstTouch(existingContext, incomingContext) : incomingContext;

  writeStoredContext(nextContext);
  emitReferralChange(nextContext);

  return nextContext;
}

export function getReferralContext({ now = getNow() } = {}) {
  const storedContext = readStoredContext();

  if (!storedContext) {
    return {};
  }

  if (isExpired(storedContext, now)) {
    removeStoredContext();
    emitReferralChange({});
    return {};
  }

  const context = compactContext(storedContext);

  if (!Object.keys(context).length) {
    return {};
  }

  return {
    ...context,
    capturedAt: storedContext.capturedAt,
    expiresAt: storedContext.expiresAt,
    attributionRule: storedContext.attributionRule || 'first_touch_until_expiration',
  };
}

export function clearReferralContext() {
  removeStoredContext();
  emitReferralChange({});
}

export function enrichPayloadWithReferral(payload = {}, context = getReferralContext()) {
  const referralContext = compactContext(context);

  if (!Object.keys(referralContext).length) {
    return { ...payload };
  }

  return {
    ...payload,
    ...referralContext,
  };
}

export function formatReferralForWhatsapp(context = getReferralContext()) {
  const referralContext = compactContext(context);
  const lines = [];

  if (referralContext.coupon) {
    lines.push(`Cupom: ${referralContext.coupon}`);
  }

  if (referralContext.ref) {
    lines.push(`Indicação: @${referralContext.ref}`);
  }

  return lines.join('\n');
}

export function getReferralChangeEventName() {
  return REFERRAL_CHANGE_EVENT;
}

export const referralConfig = {
  storageKey: STORAGE_KEY,
  defaultExpirationDays: DEFAULT_EXPIRATION_DAYS,
  maxFieldLength: MAX_FIELD_LENGTH,
  attributionRule: 'first_touch_until_expiration',
  changeEventName: REFERRAL_CHANGE_EVENT,
};
