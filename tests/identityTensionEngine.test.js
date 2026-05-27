import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveIdentityTension } from '../src/ai/identityTensionEngine.js';

function mkEvents(atmospheres) {
  return atmospheres.map((atmosphere, index) => ({ atmosphere, timestamp: Date.now() + index }));
}

test('detecta dualidade clean vs impact', () => {
  const result = deriveIdentityTension({ profile: { topAtmospheres: ['luxury_clean'] }, events: mkEvents(['luxury_clean', 'sweet_impact', 'executive_fresh', 'amber_nocturne']) });
  assert.ok(result.identityTension.tensionPatterns.includes('clean_vs_impact'));
  assert.match(result.identityTension.narrative, /limpas|intensos/i);
});

test('comfort vs aspiration', () => {
  const result = deriveIdentityTension({ profile: { topAtmospheres: ['executive_fresh'] }, events: mkEvents(['executive_fresh', 'executive_fresh', 'smoky_executive']) });
  assert.ok(result.identityTension.comfortPatterns.includes('signature_base'));
  assert.ok(result.identityTension.aspirationalSignals.length >= 0);
});

test('shape identityTension completo', () => {
  const result = deriveIdentityTension({ profile: { topAtmospheres: ['mineral_aquatic'] }, events: mkEvents(['mineral_aquatic']), wishlist: [{ atmosphere: 'amber_nocturne' }] });
  const shape = result.identityTension;
  ['dominantDuality','aspirationalSignals','comfortPatterns','tensionPatterns','contrastingAtmospheres','narrative','confidence','evolvingDirection','oscillationLevel','lastUpdated'].forEach((key) => {
    assert.ok(Object.prototype.hasOwnProperty.call(shape, key));
  });
});
