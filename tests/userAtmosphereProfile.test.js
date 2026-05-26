import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUserAtmosphereProfile } from '../src/ai/userAtmosphereProfile.js';

test('user atmosphere profile defaults to balanced without memory', () => {
  const profile = buildUserAtmosphereProfile(null);
  assert.equal(profile.density, 'balanced');
  assert.equal(profile.homeMood, 'editorial-balanced');
});

test('user atmosphere profile infers dense mode from nocturnal tags', () => {
  const profile = buildUserAtmosphereProfile({ memory: { topTags: [{ tag: 'dark_seductive', score: 3 }, { tag: 'warm_amber', score: 2 }] } });
  assert.equal(profile.density, 'dense');
  assert.equal(profile.homeMood, 'editorial-nocturne');
});
