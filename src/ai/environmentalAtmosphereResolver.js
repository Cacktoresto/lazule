const DAY_PERIODS = [
  { endHour: 5, key: 'madrugada', daylight: 'night' },
  { endHour: 12, key: 'manha', daylight: 'day' },
  { endHour: 18, key: 'tarde', daylight: 'golden' },
  { endHour: 24, key: 'noite', daylight: 'night' },
];

const SEASON_BY_MONTH = ['verao', 'verao', 'verao', 'outono', 'outono', 'inverno', 'inverno', 'inverno', 'primavera', 'primavera', 'primavera', 'verao'];

const BASE_WORLD_TOKENS = {
  ambientDensity: 0.52,
  glowSpread: 0.46,
  atmosphericFog: 0.35,
  cinematicCadence: 0.5,
  lightingFeel: 'neutral',
  recommendationPacing: 'steady',
};

export function resolveEnvironmentalAtmosphere({ now = new Date(), weatherCode = 'clear', temperatureC = 22, rainMm = 0, context = 'urban', localeSeason = null } = {}) {
  const hour = now.getHours();
  const periodEntry = DAY_PERIODS.find((period) => hour < period.endHour) ?? DAY_PERIODS[3];
  const season = localeSeason || SEASON_BY_MONTH[now.getMonth()] || 'verao';
  const thermalBand = temperatureC >= 28 ? 'calor' : temperatureC <= 16 ? 'frio' : 'temperado';
  const raining = weatherCode.includes('rain') || rainMm >= 0.5;

  const introspectiveScore = [periodEntry.key === 'madrugada', periodEntry.key === 'noite', raining, thermalBand === 'frio'].filter(Boolean).length / 4;
  const opennessScore = [periodEntry.key === 'manha', thermalBand === 'calor', weatherCode === 'clear', context === 'praia'].filter(Boolean).length / 4;

  return {
    period: periodEntry.key,
    daylight: periodEntry.daylight,
    season,
    thermalBand,
    raining,
    context,
    introspectiveScore,
    opennessScore,
    environmentalSignature: `${periodEntry.key}_${raining ? 'chuva' : 'seco'}_${thermalBand}`,
  };
}

export function resolveWorldAtmosphereState(environmentalAtmosphere, { prefersReducedMotion = false, isMobile = false } = {}) {
  const introspection = environmentalAtmosphere?.introspectiveScore ?? 0.5;
  const openness = environmentalAtmosphere?.opennessScore ?? 0.5;

  const ambientDensity = Math.min(0.85, Math.max(0.22, BASE_WORLD_TOKENS.ambientDensity + introspection * 0.28 - openness * 0.18));
  const glowSpread = Math.min(0.75, Math.max(0.25, BASE_WORLD_TOKENS.glowSpread + openness * 0.25 - introspection * 0.15));
  const atmosphericFogBase = BASE_WORLD_TOKENS.atmosphericFog + introspection * 0.18;

  return {
    ambientDensity,
    glowSpread,
    atmosphericFog: isMobile ? atmosphericFogBase * 0.45 : atmosphericFogBase,
    cinematicCadence: prefersReducedMotion ? 0.24 : BASE_WORLD_TOKENS.cinematicCadence + introspection * 0.22,
    lightingFeel: environmentalAtmosphere?.period === 'tarde' ? 'golden-mineral' : environmentalAtmosphere?.period === 'noite' ? 'amber-silent' : 'clean-soft',
    motionIntensity: prefersReducedMotion ? 'minimal' : introspection >= 0.6 ? 'soft-cinematic' : 'precise-fluid',
    recommendationPacing: introspection >= 0.6 ? 'slow-curated' : openness >= 0.6 ? 'open-flow' : BASE_WORLD_TOKENS.recommendationPacing,
  };
}
