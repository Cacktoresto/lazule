export function resolveAtmosphericReunionSequence({ companionNarrative, rhythm } = {}) {
  return {
    glowRebuild: 'progressive',
    breathingReturn: rhythm?.breathing ?? 'balanced',
    depthEmergence: rhythm?.ambientDensity ?? 'refined',
    microFragment: companionNarrative,
  };
}

export function resolveAdaptiveWorldHome({ worldState, rhythm, contextualIdentity, sensorySeason, isMobile = false, prefersReducedMotion = false } = {}) {
  return {
    heroMood: worldState?.lightingFeel === 'amber-silent' ? 'cinematic-nocturne' : worldState?.lightingFeel === 'golden-mineral' ? 'golden-mineral' : 'clean-presence',
    glowIntensity: isMobile ? 'soft' : worldState?.glowSpread >= 0.6 ? 'radiant' : 'refined',
    fogLayering: isMobile ? 'minimal' : worldState?.atmosphericFog >= 0.5 ? 'layered' : 'light',
    breathingComplexity: prefersReducedMotion ? 'minimal' : rhythm?.breathing ?? 'balanced',
    recommendationCadence: worldState?.recommendationPacing ?? 'steady',
    atmosphericDensity: contextualIdentity?.atmosphereDensity ?? 'balanced',
    sequencing: sensorySeason?.sequencing ?? rhythm?.spacingCadence ?? 'regular',
    discoveryOrdering: contextualIdentity?.signatureMode === 'clean-precise' ? 'executive-flow' : 'editorial-flow',
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
