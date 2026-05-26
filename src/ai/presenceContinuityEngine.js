const KEY = 'lazule.presence.continuity.v1';

function read() {
  try { return JSON.parse(globalThis?.localStorage?.getItem(KEY) || 'null') || { events: [] }; } catch { return { events: [] }; }
}
function write(value) {
  try { globalThis?.localStorage?.setItem(KEY, JSON.stringify(value)); } catch {}
}

export function updatePresenceContinuity(event = {}) {
  const state = read();
  const nextEvent = {
    ts: Date.now(),
    dominantAtmosphere: event.dominantAtmosphere || 'editorial-signature',
    density: event.density || 'balanced',
    emotionalShift: event.emotionalShift || 'stable',
    cadence: event.cadence || 'calm',
    recurringBehavior: Boolean(event.recurringBehavior),
  };
  const events = [...(state.events || []), nextEvent].slice(-72);
  const next = { ...state, updatedAt: nextEvent.ts, events };
  write(next);
  return next;
}

export function resolveAtmosphericReturn(state = read()) {
  const events = Array.isArray(state.events) ? state.events : [];
  if (!events.length) return { summary: 'Sua presença retorna em equilíbrio editorial.', dominantAtmosphere: 'editorial-signature' };
  const recent = events.slice(-12);
  const dominantAtmosphere = recent.reduce((acc, e) => {
    acc[e.dominantAtmosphere] = (acc[e.dominantAtmosphere] || 0) + 1;
    return acc;
  }, {});
  const winner = Object.entries(dominantAtmosphere).sort((a, b) => b[1] - a[1])[0]?.[0] || 'editorial-signature';
  const nightBias = recent.filter((e) => e.density === 'dense').length >= Math.ceil(recent.length * 0.45);
  return {
    dominantAtmosphere: winner,
    summary: nightBias
      ? 'Sua atmosfera recente continua orbitando profundidade e assinatura silenciosa.'
      : 'Você vem mantendo uma cadência arejada com elegância contínua.',
    continuityScore: Number((recent.length / 12).toFixed(2)),
  };
}
