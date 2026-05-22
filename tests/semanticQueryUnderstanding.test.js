import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildQueryUnderstandingExplainability,
  expandSemanticQuery,
  generateSemanticAuditReport,
  interpretUserIntent,
  resolveSemanticAliases,
} from '../src/ai/semanticQueryUnderstanding.js';

test('resolve aliases and weighted expansion deterministically', () => {
  const aliases = resolveSemanticAliases(['perfume', 'fresco', 'balada']);
  assert.ok(aliases.includes('fresco'));
  assert.ok(aliases.includes('noite'));

  const expanded = expandSemanticQuery('perfume fresco pro calor');
  assert.ok(expanded.matchedSignals.some((s) => s.signal === 'citrus' && s.strength === 'primary'));
  assert.ok(expanded.matchedSignals.some((s) => s.signal === 'summer'));
  assert.ok(expanded.fallbackMode === false);
});

test('fallback and overexpansion prevention stay controlled', () => {
  const weak = expandSemanticQuery('perfume muito bom');
  assert.equal(weak.fallbackMode, true);
  assert.ok(weak.matchedSignals.length <= 3);

  const broad = expandSemanticQuery('perfume fresco doce forte elegante sensual trabalho noite calor');
  assert.ok(broad.matchedSignals.length <= 12);
});

test('intent confidence, ambiguity and explainability are available', () => {
  const intent = interpretUserIntent('perfume cheiro de banho elegante');
  assert.ok(intent.confidence > 0.4);
  assert.ok(intent.ambiguity < 0.7);
  assert.equal(intent.semanticEntity.primaryIntent.length > 0, true);

  const reasons = buildQueryUnderstandingExplainability(intent);
  assert.ok(reasons.length > 0);
  assert.ok(reasons[0].reason.includes('peso'));
});

test('semantic audit report highlights coverage and dead zones', () => {
  const report = generateSemanticAuditReport(['perfume fresco', 'perfume de banho', 'xyzw']);
  assert.ok(report.coverage > 0);
  assert.ok(Array.isArray(report.potentialSemanticDeadZones));
});
