export function resolveAtmosphericReunionSequence({ companionNarrative, rhythm } = {}) {
  return {
    glowRebuild: 'progressive',
    breathingReturn: rhythm?.breathing ?? 'balanced',
    depthEmergence: rhythm?.ambientDensity ?? 'refined',
    microFragment: companionNarrative,
  };
}

export function resolveAdaptiveMomentHome({ moment, rhythm, profile, isMobile = false, prefersReducedMotion = false } = {}) {
  const density = moment?.density === 'dense' ? 'dense' : 'open';
  return {
    heroMood: moment?.period === 'madrugada' ? 'silent' : moment?.period === 'manha' ? 'clean' : 'cinematic',
    glowIntensity: isMobile ? 'soft' : density,
    fogLayering: isMobile ? 'minimal' : 'layered',
    breathingComplexity: prefersReducedMotion ? 'minimal' : rhythm?.breathing ?? 'balanced',
    recommendationCadence: rhythm?.cadence ?? 'steady',
    atmosphericDensity: profile?.density ?? density,
    sequencing: rhythm?.spacing ?? 'regular',
  };
}
