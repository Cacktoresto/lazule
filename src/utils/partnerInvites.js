const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,160}$/;

export const PARTNER_INVITE_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  INACTIVE: 'inactive',
  INVALID: 'invalid',
});

export function sanitizeInviteEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function sanitizeInfluencerRef(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function sanitizeCouponCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '')
    .slice(0, 40);
}

export function isSafeInviteToken(token) {
  return TOKEN_PATTERN.test(String(token || '').trim());
}

export function getPartnerInviteStatus(invite, now = new Date()) {
  if (!invite || typeof invite !== 'object') {
    return PARTNER_INVITE_STATUS.INVALID;
  }

  if (invite.accepted_at) {
    return PARTNER_INVITE_STATUS.ACCEPTED;
  }

  if (invite.is_active === false) {
    return PARTNER_INVITE_STATUS.INACTIVE;
  }

  const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null;

  if (expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) {
    return PARTNER_INVITE_STATUS.EXPIRED;
  }

  return PARTNER_INVITE_STATUS.PENDING;
}

export function isPartnerInviteAcceptable(invite, now = new Date()) {
  return getPartnerInviteStatus(invite, now) === PARTNER_INVITE_STATUS.PENDING;
}

export function normalizePartnerInvite(invite = {}) {
  return {
    ...invite,
    email: sanitizeInviteEmail(invite.email),
    role: 'influencer',
    influencer_ref: sanitizeInfluencerRef(invite.influencer_ref ?? invite.influencerRef),
    coupon_code: sanitizeCouponCode(invite.coupon_code ?? invite.couponCode),
    status: getPartnerInviteStatus(invite),
  };
}

export function createPartnerInvitePayload({ email, influencerRef, influencer_ref, couponCode, coupon_code, expiresAt, expires_at } = {}) {
  return {
    email: sanitizeInviteEmail(email),
    role: 'influencer',
    influencer_ref: sanitizeInfluencerRef(influencer_ref ?? influencerRef),
    coupon_code: sanitizeCouponCode(coupon_code ?? couponCode),
    expires_at: expires_at || expiresAt || null,
  };
}

export function buildPartnerInviteLink(token, origin = 'https://lazulefragrances.com.br') {
  if (!isSafeInviteToken(token)) {
    return '';
  }

  const normalizedOrigin = String(origin || '').replace(/\/+$/, '') || 'https://lazulefragrances.com.br';
  return `${normalizedOrigin}/influencer/invite/${encodeURIComponent(String(token).trim())}`;
}
