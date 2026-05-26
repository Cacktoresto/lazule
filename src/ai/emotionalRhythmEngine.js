const RHYTHM_PRESETS = {
  contemplative: { key: 'contemplative', cadence: 'slow', breathing: 'deep', spacing: 'wide', revealTiming: 'delayed', ambientDensity: 'soft', storytellingFrequency: 'rare' },
  exploratory: { key: 'exploratory', cadence: 'fluid', breathing: 'dynamic', spacing: 'adaptive', revealTiming: 'responsive', ambientDensity: 'layered', storytellingFrequency: 'frequent' },
  recurrent: { key: 'recurrent', cadence: 'steady', breathing: 'balanced', spacing: 'regular', revealTiming: 'steady', ambientDensity: 'refined', storytellingFrequency: 'curated' },
};

export function resolveEmotionalRhythm({ sessionDepth = 0.5, navigationPattern = 'balanced', recurrenceScore = 0.5 } = {}) {
  if (sessionDepth >= 0.7 && recurrenceScore >= 0.6) return RHYTHM_PRESETS.contemplative;
  if (navigationPattern === 'exploratory' || sessionDepth <= 0.35) return RHYTHM_PRESETS.exploratory;
  return RHYTHM_PRESETS.recurrent;
}

export function resolveAdaptiveMotionIntensity(rhythm, prefersReducedMotion = false) {
  if (prefersReducedMotion) return 'minimal';
  if (rhythm?.key === 'exploratory') return 'medium';
  if (rhythm?.key === 'contemplative') return 'soft';
  return 'balanced';
}
