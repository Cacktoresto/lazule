import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMemoryConstellations, buildSeasonalSensoryMemory, resolveOlfactivePhase } from '../src/ai/olfactivePhaseEngine.js';
import { resolveAtmosphericReturn, updatePresenceContinuity } from '../src/ai/presenceContinuityEngine.js';

test('olfactive phase resolver detects nocturnal smoky cycle', () => {
  const signals = [
    { query: 'smoky oud noturno', revisit: true, moodPersistence: 0.8, ts: new Date('2026-05-25T23:10:00Z').getTime() },
    { query: 'amber resin night intense', recommendationAffinity: 0.8, ts: new Date('2026-05-26T01:10:00Z').getTime() },
    { query: 'incense smoky signature', moodPersistence: 1, ts: new Date('2026-05-26T02:10:00Z').getTime() },
  ];
  const phase = resolveOlfactivePhase(signals);
  assert.equal(phase.phase, 'smoky_nocturnal');
  assert.ok(phase.confidence > 0.2);
});

test('seasonal sensory memory splits by period and remains deterministic', () => {
  const memory = buildSeasonalSensoryMemory([
    { query: 'clean mineral marine', ts: new Date('2026-05-26T08:00:00Z').getTime() },
    { query: 'amber warm resin', ts: new Date('2026-05-26T20:00:00Z').getTime() },
  ]);
  assert.equal(memory.morning.dominantPhase, 'mineral_clean');
  assert.ok(memory.evening.dominantPhase.length > 0);
});

test('memory constellations create editorial fragments instead of analytics artifacts', () => {
  const constellations = buildMemoryConstellations([
    { query: 'executive fresh clean office' },
    { query: 'executive vetiver shirt clean' },
    { query: 'office fresh' },
  ]);
  assert.ok(constellations.dominantConstellation.includes('executive'));
  assert.ok(constellations.editorialFragments[0].startsWith('Atmosferas que retornam'));
});

test('presence continuity carries atmosphere between returns', () => {
  global.localStorage = {
    data: new Map(),
    getItem(key) { return this.data.get(key) || null; },
    setItem(key, val) { this.data.set(key, val); },
  };
  updatePresenceContinuity({ dominantAtmosphere: 'amber-nocturne', density: 'dense', recurringBehavior: true });
  updatePresenceContinuity({ dominantAtmosphere: 'amber-nocturne', density: 'dense' });
  const continuity = resolveAtmosphericReturn();
  assert.equal(continuity.dominantAtmosphere, 'amber-nocturne');
  assert.ok(continuity.summary.length > 20);
});
