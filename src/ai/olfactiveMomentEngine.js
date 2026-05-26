const HOUR_MOMENTS = [
  { end: 5, key: 'madrugada_introspectiva', period: 'madrugada', atmosphere: 'introspectiva' },
  { end: 11, key: 'assinatura_executiva', period: 'manha', atmosphere: 'clean_executive' },
  { end: 17, key: 'assinatura_diaria_refinada', period: 'tarde', atmosphere: 'refined_daily' },
  { end: 23, key: 'noite_sofisticada', period: 'noite', atmosphere: 'sophisticated_night' },
  { end: 24, key: 'elegancia_silenciosa', period: 'noite_tardia', atmosphere: 'silent_elegance' },
];

export function resolveOlfactiveMoment({ now = new Date(), sessionDepth = 0.5, recentDensity = 'balanced', recurringContext = null, olfactivePhase = 'continuity', navigationPattern = 'balanced' } = {}) {
  const hour = now.getHours();
  const baseMoment = HOUR_MOMENTS.find((entry) => hour < entry.end) ?? HOUR_MOMENTS[3];
  const emotionalDepth = sessionDepth >= 0.68 ? 'deep' : sessionDepth <= 0.35 ? 'light' : 'balanced';
  const contextualMoment = recurringContext || baseMoment.key;

  return {
    key: contextualMoment,
    period: baseMoment.period,
    atmosphere: baseMoment.atmosphere,
    density: recentDensity,
    emotionalDepth,
    phase: olfactivePhase,
    navigationPattern,
  };
}
