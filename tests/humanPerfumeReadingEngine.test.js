import test from 'node:test';
import assert from 'node:assert/strict';
import { createHumanPerfumeReading, resolveSocialImpression } from '../src/ai/humanPerfumeReadingEngine.js';

test('createHumanPerfumeReading returns humanized sections and contextual layers', () => {
  const reading = createHumanPerfumeReading({
    name: 'Noir Oud Intense',
    accords: ['oud', 'amber', 'spicy'],
    vibes: ['night', 'formal'],
  });

  assert.ok(reading.firstImpression.length > 20);
  assert.ok(reading.behavior.includes('pele') || reading.behavior.includes('aproxima'));
  assert.equal(reading.atmosphericContext.period, 'noite');
  assert.ok(reading.discoveryTags.includes('lobby de hotel'));
});

test('resolveSocialImpression shifts tone for fresh profile', () => {
  const impression = resolveSocialImpression({
    name: 'Blue Clean Citrus',
    accords: ['aquatic', 'citrus'],
  });

  assert.match(impression, /organizada|limpa|segura/);
});
