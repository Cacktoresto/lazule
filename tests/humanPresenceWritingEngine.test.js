import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHumanPresenceReading } from '../src/ai/humanPresenceWritingEngine.js';
import { createHumanObservationFragments } from '../src/ai/humanObservationFragmentsEngine.js';
import { createEditorialOpinion } from '../src/ai/editorialOpinionEngine.js';

test('buildHumanPresenceReading creates behavioral sections', () => {
  const reading = buildHumanPresenceReading({ name: 'Dark Amber', vibes: ['night', 'leather'] });
  assert.ok(reading.whenItWorksBest.length >= 2);
  assert.ok(reading.whenItCanFail.length >= 2);
  assert.match(reading.socialReading, /presença|imagem|autoridade/i);
});

test('createHumanObservationFragments returns short editorial fragments', () => {
  const fragments = createHumanObservationFragments({ profile: { density: 'dense', motionCadence: 'dynamic' }, context: 'home' });
  assert.ok(fragments.length >= 2);
});

test('createEditorialOpinion avoids blocked premium template language', () => {
  const line = createEditorialOpinion({ name: 'Fresh Blue' }).toLowerCase();
  assert.doesNotMatch(line, /\bpremium\b|\bsofisticado\b|\belegante\b/);
});
