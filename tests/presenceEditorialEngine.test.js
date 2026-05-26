import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveLivingPresence, resolveRecommendationRhythm } from '../src/ai/presenceEditorialEngine.js';

test('deriveLivingPresence returns mineral atmospheric preset and narratives', () => {
  const profile = {
    topAtmospheres: ['mineral_aquatic'],
    recentShift: 'mineral',
    primaryFamily: 'mineral',
    motionCadence: 'calm',
  };

  const presence = deriveLivingPresence(profile);

  assert.equal(presence.key, 'mineral_aquatic');
  assert.match(presence.phaseNarrative, /mineral/i);
  assert.match(presence.wardrobeNarrative, /mineral/i);
  assert.equal(presence.recommendationRhythm.cadenceLabel, 'Contemplativo');
});

test('resolveRecommendationRhythm returns dynamic cadence settings', () => {
  const rhythm = resolveRecommendationRhythm({ motionCadence: 'dynamic' });

  assert.equal(rhythm.cadenceLabel, 'Exploratório');
  assert.equal(rhythm.revealSpeed, 'fluida');
  assert.equal(rhythm.spacing, 'versátil');
});
