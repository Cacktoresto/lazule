import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canAccessAdmin,
  canAccessInfluencerArea,
  getProfileRole,
  isAdminRole,
  isInfluencerRole,
  normalizeRole,
} from '../src/auth/roles.js';

test('role helpers normalize profile roles consistently', () => {
  assert.equal(normalizeRole(' Admin '), 'admin');
  assert.equal(isAdminRole('ADMIN'), true);
  assert.equal(isInfluencerRole(' influencer '), true);
  assert.equal(getProfileRole({ role: 'Influencer' }), 'influencer');
});

test('admin dashboard access remains restricted to active admins', () => {
  assert.equal(canAccessAdmin({ role: 'admin', is_active: true }), true);
  assert.equal(canAccessAdmin({ role: 'influencer', is_active: true }), false);
  assert.equal(canAccessAdmin({ role: 'admin', is_active: false }), false);
});

test('influencer area accepts active influencers and admins only', () => {
  assert.equal(canAccessInfluencerArea({ role: 'influencer', is_active: true }), true);
  assert.equal(canAccessInfluencerArea({ role: 'admin', is_active: true }), true);
  assert.equal(canAccessInfluencerArea({ role: 'customer', is_active: true }), false);
  assert.equal(canAccessInfluencerArea({ role: 'influencer', is_active: false }), false);
});
