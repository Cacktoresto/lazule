import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyEditorialAntiRepetition,
  blockedEditorialTerms,
  createHumanContextNarrative,
  sanitizeEditorialLanguage,
} from '../src/ai/editorialIntelligenceSystem.js';

test('sanitizeEditorialLanguage rotates blocked vocabulary', () => {
  const text = sanitizeEditorialLanguage('Perfil sofisticado, elegante e premium.');
  assert.doesNotMatch(text.toLowerCase(), /\bsofisticado\b|\belegante\b|\bpremium\b/);
});

test('createHumanContextNarrative produces contextual human copy', () => {
  const narrative = createHumanContextNarrative({ semanticFacets: ['executive_fresh', 'dark_smoky'] }, { seed: 2 });
  assert.match(narrative, /ambiente|noite|pele|reunião|presença/i);
});

test('applyEditorialAntiRepetition removes duplicate lines', () => {
  const lines = applyEditorialAntiRepetition(['texto limpo', 'texto limpo', 'presença discreta']);
  assert.equal(lines.length, 2);
});

test('blockedEditorialTerms exposes anti-repetition lexical guard', () => {
  const terms = blockedEditorialTerms();
  assert.ok(terms.includes('sofisticado'));
  assert.ok(terms.includes('premium'));
});
