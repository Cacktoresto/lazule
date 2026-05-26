import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDivisiveFragranceResolver,
  createEditorialContrastEngine,
  createFragrancePersonalityEngine,
  createHumanPerfumeReading,
  resolveSocialImpression,
} from '../src/ai/humanPerfumeReadingEngine.js';

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
  assert.equal(reading.divisiveProfile.divisive, true);
  assert.match(reading.contextualWarnings[0], /escritório|ambiente aberto/);
});

test('resolveSocialImpression shifts tone for fresh profile', () => {
  const impression = resolveSocialImpression({
    name: 'Blue Clean Citrus',
    accords: ['aquatic', 'citrus'],
  });

  assert.match(impression, /organizada|limpa|segura/);
});

test('editorial contrast and personality engines create nuanced non-generic output', () => {
  const product = {
    name: 'Urban Fresh Signature',
    accords: ['fresh', 'citrus', 'clean'],
    vibes: ['day', 'office'],
  };

  const contrast = createEditorialContrastEngine(product);
  const personality = createFragrancePersonalityEngine(product);
  const divisive = createDivisiveFragranceResolver(product);

  assert.equal(contrast.saturationRisk, 'baixo-médio');
  assert.match(contrast.limitations[0], /noite fria|discreto/);
  assert.match(personality.energy, /clean|focada/);
  assert.equal(divisive.divisive, false);
});
