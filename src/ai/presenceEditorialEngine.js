const ATMOSPHERIC_PRESETS = {
  mineral_aquatic: {
    key: 'mineral_aquatic',
    glow: 'rgba(148, 197, 255, 0.30)',
    accent: 'rgba(190, 220, 255, 0.22)',
    depth: 'open',
    density: 'airy',
    breathingMs: 7800,
    cadence: 'contemplative',
    microcopy: 'Seu ciclo recente mantém elegância mineral com respiração luminosa e espaçada.',
  },
  amber_nocturne: {
    key: 'amber_nocturne',
    glow: 'rgba(244, 172, 86, 0.35)',
    accent: 'rgba(210, 116, 56, 0.26)',
    depth: 'deep',
    density: 'cinematic',
    breathingMs: 11200,
    cadence: 'nocturnal',
    microcopy: 'Você atravessa uma fase de profundidade âmbar e assinatura noturna silenciosa.',
  },
  smoky_executive: {
    key: 'smoky_executive',
    glow: 'rgba(151, 161, 176, 0.27)',
    accent: 'rgba(94, 100, 113, 0.22)',
    depth: 'layered',
    density: 'dense',
    breathingMs: 9800,
    cadence: 'steady',
    microcopy: 'Atmosferas mais densas seguem retornando às suas explorações com precisão sóbria.',
  },
  default: {
    key: 'default',
    glow: 'rgba(200, 162, 77, 0.28)',
    accent: 'rgba(128, 153, 196, 0.21)',
    depth: 'balanced',
    density: 'refined',
    breathingMs: 8600,
    cadence: 'editorial',
    microcopy: 'Atmosferas sofisticadas continuam retornando à sua presença.',
  },
};

export function deriveLivingPresence(profile = {}) {
  const dominantAtmosphere = profile.topAtmospheres?.[0];
  const preset = ATMOSPHERIC_PRESETS[dominantAtmosphere] || ATMOSPHERIC_PRESETS.default;

  return {
    ...preset,
    recommendationRhythm: resolveRecommendationRhythm(profile),
    wardrobeNarrative: resolveWardrobeNarrative(profile),
    phaseNarrative: resolvePhaseNarrative(profile, preset),
  };
}

export function resolvePhaseNarrative(profile = {}, preset = ATMOSPHERIC_PRESETS.default) {
  if (profile.recentShift === 'denser') {
    return 'Sua presença evolui para camadas mais profundas, com densidade crescente e brilho contido.';
  }

  if (profile.recentShift === 'mineral') {
    return 'A continuidade recente preserva frescor mineral refinado, com atmosfera aberta e luminosa.';
  }

  return preset.microcopy;
}

export function resolveWardrobeNarrative(profile = {}) {
  if (profile.primaryFamily === 'amber') {
    return 'Sua assinatura tende para atmosferas noturnas sofisticadas e permanência âmbar elegante.';
  }

  if (profile.primaryFamily === 'mineral') {
    return 'Você mantém forte presença mineral com espaço para expandir nuances solares ao seu ritmo.';
  }

  return 'Suas atmosferas recorrentes orbitam elegância silenciosa com construção autoral contínua.';
}

export function resolveRecommendationRhythm(profile = {}) {
  if (profile.motionCadence === 'calm') {
    return {
      cadenceLabel: 'Contemplativo',
      revealSpeed: 'lenta',
      spacing: 'ampla',
      density: 'respirável',
    };
  }

  if (profile.motionCadence === 'dynamic') {
    return {
      cadenceLabel: 'Exploratório',
      revealSpeed: 'fluida',
      spacing: 'versátil',
      density: 'expansiva',
    };
  }

  return {
    cadenceLabel: 'Recorrência sofisticada',
    revealSpeed: 'moderada',
    spacing: 'equilibrada',
    density: 'densa',
  };
}
