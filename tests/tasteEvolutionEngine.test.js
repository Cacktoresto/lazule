import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTasteEvolution } from '../src/ai/tasteEvolutionEngine.js';

function mkEvents(atmospheres) {
  return atmospheres.map((atmosphere, index) => ({ atmosphere, timestamp: Date.now() + index }));
}

test('fallback para usuário novo sem dados', () => {
  const result = deriveTasteEvolution({ profile: {}, events: [], wishlist: [] });
  assert.equal(result.arc, 'initial_evolution');
  assert.match(result.narrative, /assinatura ainda está se formando/i);
});

test('impact seeker', () => {
  const result = deriveTasteEvolution({ profile: { topAtmospheres: ['sweet_impact'] }, events: mkEvents(['sweet_impact', 'sweet_impact']) });
  assert.equal(result.arc, 'impact_seeker');
});

test('refinement shift', () => {
  const result = deriveTasteEvolution({ profile: { topAtmospheres: ['luxury_clean'] }, events: mkEvents(['sweet_impact','sweet_impact','luxury_clean','executive_fresh']) });
  assert.ok(['refinement_shift','clean_luxury_phase'].includes(result.arc));
});

test('dark maturity', () => {
  const result = deriveTasteEvolution({ profile: { topAtmospheres: ['amber_nocturne'] }, events: mkEvents(['amber_nocturne','smoky_executive']) });
  assert.equal(result.arc, 'dark_maturity');
});

test('clean luxury phase', () => {
  const result = deriveTasteEvolution({ profile: { topAtmospheres: ['luxury_clean','executive_fresh'] }, events: mkEvents(['luxury_clean','executive_fresh']) });
  assert.equal(result.arc, 'clean_luxury_phase');
});

test('fatigue reset', () => {
  const result = deriveTasteEvolution({ profile: { topAtmospheres: ['executive_fresh'] }, events: mkEvents(['sweet_impact','sweet_impact','sweet_impact','executive_fresh']) });
  assert.ok(['fatigue_reset','controlled_signature'].includes(result.arc));
});

test('experimental expansion', () => {
  const result = deriveTasteEvolution({ profile: { topAtmospheres: ['mineral_aquatic', 'amber_nocturne'] }, events: mkEvents(['mineral_aquatic','luxury_clean','amber_nocturne','executive_fresh']) });
  assert.ok(['experimental_expansion','clean_luxury_phase'].includes(result.arc));
});

test('signature consolidation', () => {
  const result = deriveTasteEvolution({ profile: { topAtmospheres: ['luxury_clean'] }, events: mkEvents(['luxury_clean','luxury_clean','luxury_clean','luxury_clean']) });
  assert.ok(['signature_consolidation','clean_luxury_phase'].includes(result.arc));
});

test('returning pattern', () => {
  const result = deriveTasteEvolution({ profile: { topAtmospheres: ['luxury_clean'] }, events: mkEvents([...Array(12).fill('amber_nocturne'),'mineral_aquatic','amber_nocturne','mineral_aquatic']) });
  assert.ok(result.returningPatterns.includes('mineral_aquatic'));
});
