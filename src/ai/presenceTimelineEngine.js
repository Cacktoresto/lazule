export function resolvePresenceTimeline(profile = {}) {
  const shift = profile.recentShift ?? 'stable';
  const dominantSignature = profile.primaryFamily === 'mineral' ? 'mineral' : 'layered';

  return {
    trend: shift === 'denser' ? 'densifying' : shift === 'mineral' ? 'mineral_continuity' : 'stable_refinement',
    dominantSignature,
    narrative: resolvePresenceTimelineNarrative(shift, dominantSignature),
  };
}

function resolvePresenceTimelineNarrative(shift, dominantSignature) {
  if (shift === 'denser') return 'Seu ciclo recente migrou para atmosferas mais profundas.';
  if (dominantSignature === 'mineral') return 'Presenças minerais permanecem dominantes ao longo do tempo.';
  return 'Sua assinatura mantém continuidade viva com expansão gradual e refinada.';
}
