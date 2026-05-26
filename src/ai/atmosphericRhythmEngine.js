export function resolveAtmosphericRhythm({ worldState = null, occasion = null, prefersReducedMotion = false } = {}) {
  const introspective = worldState?.recommendationPacing === 'slow-curated' || occasion?.occasion === 'introspeccao';

  if (prefersReducedMotion) {
    return {
      revealSpeed: 'steady',
      breathing: 'minimal',
      spacingCadence: 'regular',
      glowPulse: 'soft',
      atmosphericDrift: 'still',
      fogIntensity: 'low',
      motionSoftness: 'subtle',
    };
  }

  return {
    revealSpeed: introspective ? 'slow' : 'precise',
    breathing: introspective ? 'deep' : 'open',
    spacingCadence: introspective ? 'wide' : 'tight-refined',
    glowPulse: introspective ? 'amber-soft' : 'mineral-clean',
    atmosphericDrift: introspective ? 'cinematic' : 'light',
    fogIntensity: introspective ? 'medium' : 'low',
    motionSoftness: introspective ? 'silk' : 'crisp',
  };
}
