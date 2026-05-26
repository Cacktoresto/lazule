import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPresenceCompanionLayer } from '../src/ai/presenceCompanionLayer.js';
import { resolveOlfactiveMoment } from '../src/ai/olfactiveMomentEngine.js';
import { resolveEmotionalRhythm } from '../src/ai/emotionalRhythmEngine.js';
import { resolvePresenceTimeline } from '../src/ai/presenceTimelineEngine.js';

test('presence companion mantém narrativa contextual silenciosa', () => {
  const moment = resolveOlfactiveMoment({ now: new Date('2026-05-26T01:00:00Z'), recentDensity: 'dense' });
  const rhythm = resolveEmotionalRhythm({ sessionDepth: 0.8, recurrenceScore: 0.75 });
  const timeline = resolvePresenceTimeline({ recentShift: 'denser' });
  const layer = buildPresenceCompanionLayer({ moment, rhythm, timeline });

  assert.equal(layer.visibility, 'rare');
  assert.match(layer.narrative, /densas|notes/i);
});
