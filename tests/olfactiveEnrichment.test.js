import test from 'node:test';
import assert from 'node:assert/strict';

import { buildOlfactiveNarrative, buildOlfactiveProfile } from '../src/ai/olfactiveEnrichment.js';

test('builds structured semantic olfactive profile with controlled enums', () => {
  const profile = buildOlfactiveProfile({
    name: 'Acqua Executive',
    description: 'aquatic citrus bergamot lavender musk clean office',
    accords: ['aquatic', 'citrus'],
    notes: ['bergamot', 'lavender', 'musk'],
  });

  assert.ok(profile.accords.includes('aquatic'));
  assert.ok(profile.topNotes.includes('bergamot'));
  assert.ok(profile.middleNotes.includes('lavender'));
  assert.ok(profile.baseNotes.includes('musk'));
  assert.ok(['cold', 'fresh', 'balanced', 'warm', 'hot'].includes(profile.temperature));
  assert.ok(['low', 'moderate', 'high', 'beast_mode'].includes(profile.performance.projection));
  assert.ok(profile.confidenceLayer.signalCount >= 2);
});

test('dark warm profiles gain night semantics without overclaiming confidence', () => {
  const profile = buildOlfactiveProfile({
    description: 'amber sweet smoky vanilla patchouli cardamom',
    accords: ['amber', 'sweet', 'smoky'],
    notes: ['vanilla', 'patchouli', 'cardamom'],
  });

  assert.equal(profile.signature, 'seductive_night');
  assert.ok(profile.personalities.includes('seductive'));
  assert.ok(profile.usageContext.includes('nightlife'));
  assert.ok(profile.climate.includes('winter'));
});

test('narrative degrades gracefully on low confidence', () => {
  const profile = buildOlfactiveProfile({ name: 'Sparse' });
  const narrative = buildOlfactiveNarrative(profile);
  assert.ok(profile.confidenceLayer.confidence <= 0.5);
  assert.ok(narrative.length > 20);
});
