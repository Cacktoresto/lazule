import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveEnvironmentalAtmosphere, resolveWorldAtmosphereState } from '../src/ai/environmentalAtmosphereResolver.js';
import { resolveOlfactiveOccasion } from '../src/ai/olfactiveOccasionResolver.js';
import { resolveContextualIdentity, resolveSensorySeason, resolveCompanionshipNarrative } from '../src/ai/contextualIdentityResolver.js';
import { resolveAtmosphericRhythm } from '../src/ai/atmosphericRhythmEngine.js';
import { resolveAdaptiveWorldHome } from '../src/ai/adaptiveAtmosphericHome.js';

test('environmental atmosphere resolver creates subtle context from time, weather and temperature', () => {
  const context = resolveEnvironmentalAtmosphere({
    now: new Date('2026-05-26T03:30:00Z'),
    weatherCode: 'rain-light',
    temperatureC: 14,
    context: 'urban',
  });

  assert.equal(context.period, 'madrugada');
  assert.equal(context.raining, true);
  assert.equal(context.thermalBand, 'frio');
  assert.match(context.environmentalSignature, /madrugada_chuva_frio/);
});

test('world atmosphere state reduces heavy effects on mobile while preserving cinematic restraint', () => {
  const environmental = resolveEnvironmentalAtmosphere({ now: new Date('2026-05-26T22:30:00Z'), weatherCode: 'rain', temperatureC: 12 });
  const desktop = resolveWorldAtmosphereState(environmental, { isMobile: false });
  const mobile = resolveWorldAtmosphereState(environmental, { isMobile: true });

  assert.equal(desktop.recommendationPacing, 'slow-curated');
  assert.equal(mobile.atmosphericFog < desktop.atmosphericFog, true);
});

test('occasion, identity, seasons and companionship narrative align to presence goals', () => {
  const occasion = resolveOlfactiveOccasion({ context: 'work', userIntent: 'executive-silent' });
  const identity = resolveContextualIdentity({ profile: { primaryFamily: 'mineral', density: 'airy' }, occasion, environmentalAtmosphere: { environmentalSignature: 'manha_seco_temperado' } });
  const season = resolveSensorySeason({ memoryCycles: [{ key: 'ciclo_executivo' }], contextualIdentity: identity, environmentalAtmosphere: { season: 'inverno' } });
  const narrative = resolveCompanionshipNarrative({ contextualIdentity: identity, sensorySeason: season });

  assert.equal(occasion.occasion, 'executivo');
  assert.equal(identity.signatureMode, 'clean-precise');
  assert.equal(season.sequencing, 'dense-cinematic');
  assert.match(narrative, /densas|executiva/);
});

test('adaptive world home and rhythm respond to reduced motion and contextual state', () => {
  const worldState = { lightingFeel: 'amber-silent', glowSpread: 0.63, atmosphericFog: 0.6, recommendationPacing: 'slow-curated' };
  const occasion = { occasion: 'introspeccao' };
  const rhythm = resolveAtmosphericRhythm({ worldState, occasion, prefersReducedMotion: true });
  const home = resolveAdaptiveWorldHome({ worldState, rhythm, contextualIdentity: { atmosphereDensity: 'dense', signatureMode: 'resinous-dark' }, sensorySeason: { sequencing: 'dense-cinematic' }, prefersReducedMotion: true, isMobile: true });

  assert.equal(rhythm.breathing, 'minimal');
  assert.equal(home.heroMood, 'cinematic-nocturne');
  assert.equal(home.fogLayering, 'minimal');
});
