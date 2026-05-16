import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPartnerInviteLink,
  createPartnerInvitePayload,
  getPartnerInviteStatus,
  isPartnerInviteAcceptable,
  isSafeInviteToken,
  PARTNER_INVITE_STATUS,
  sanitizeCouponCode,
  sanitizeInfluencerRef,
} from '../src/utils/partnerInvites.js';

test('partner invite rejects invalid tokens before remote lookup', () => {
  assert.equal(isSafeInviteToken('short'), false);
  assert.equal(isSafeInviteToken('token with spaces and pii@example.com'), false);
  assert.equal(isSafeInviteToken('a'.repeat(48)), true);
  assert.equal(buildPartnerInviteLink('short', 'https://lazule.test'), '');
});

test('partner invite detects expired and reused tokens', () => {
  const now = new Date('2026-05-16T12:00:00.000Z');

  assert.equal(getPartnerInviteStatus({ expires_at: '2026-05-16T11:59:59.000Z', is_active: true }, now), PARTNER_INVITE_STATUS.EXPIRED);
  assert.equal(getPartnerInviteStatus({ accepted_at: '2026-05-16T11:00:00.000Z', expires_at: '2026-05-17T00:00:00.000Z', is_active: false }, now), PARTNER_INVITE_STATUS.ACCEPTED);
  assert.equal(getPartnerInviteStatus({ expires_at: '2026-05-17T00:00:00.000Z', is_active: false }, now), PARTNER_INVITE_STATUS.INACTIVE);
});

test('partner invite accepts only pending active influencer onboarding state', () => {
  const now = new Date('2026-05-16T12:00:00.000Z');
  const pendingInvite = { role: 'admin', expires_at: '2026-05-18T00:00:00.000Z', is_active: true };

  assert.equal(isPartnerInviteAcceptable(pendingInvite, now), true);
  assert.equal(createPartnerInvitePayload({ email: ' Creator@Example.COM ', influencerRef: '@Minha Creator', couponCode: ' lazule 10 ' }).role, 'influencer');
});

test('partner invite sanitizes creator fields without public PII exposure', () => {
  assert.equal(sanitizeInfluencerRef('@@Ana Creator!!! <script>'), 'ana-creator-script');
  assert.equal(sanitizeCouponCode(' la zule-10<script> '), 'LAZULE-10SCRIPT');

  const payload = createPartnerInvitePayload({
    email: ' Parceira@Example.COM ',
    influencerRef: '@Parceira VIP ',
    couponCode: ' vip 20 ',
    role: 'admin',
  });

  assert.deepEqual(payload, {
    email: 'parceira@example.com',
    role: 'influencer',
    influencer_ref: 'parceira-vip',
    coupon_code: 'VIP20',
    expires_at: null,
  });
});

test('partner invite builds exclusive onboarding links', () => {
  const token = 'a'.repeat(64);

  assert.equal(buildPartnerInviteLink(token, 'https://lazule.test/'), `https://lazule.test/influencer/invite/${token}`);
});
