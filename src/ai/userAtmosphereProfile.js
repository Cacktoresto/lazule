const DENSITY_BY_TAG = Object.freeze({
  dark_seductive: 0.95,
  warm_amber: 0.82,
  arabic_signature: 0.78,
  refined_woods: 0.65,
  clean_luxury: 0.35,
  fresh_executive: 0.28,
  intimate_signature: 0.32,
  cozy_comfort: 0.54,
});

export function buildUserAtmosphereProfile(memoryProfile = null) {
  const topTags = memoryProfile?.memory?.topTags || [];
  if (!topTags.length) {
    return {
      density: 'balanced',
      narrative: 'Descoberta editorial equilibrada.',
      homeMood: 'editorial-balanced',
      cadence: 'calm',
      depthAlpha: 0.44,
    };
  }

  const total = topTags.reduce((acc, item) => acc + (item.score || 0), 0) || 1;
  const weightedDensity = topTags.reduce((acc, item) => acc + ((DENSITY_BY_TAG[item.tag] ?? 0.5) * (item.score || 0)), 0) / total;
  const leadingTag = topTags[0]?.tag || 'clean_luxury';
  const dense = weightedDensity >= 0.62;

  return {
    density: dense ? 'dense' : 'airy',
    narrative: dense
      ? 'Atmosfera mais profunda, com presença silenciosa e magnetismo elegante.'
      : 'Atmosfera mais fria e arejada, com luxo limpo e leitura minimalista.',
    homeMood: dense ? 'editorial-nocturne' : 'editorial-glacial',
    cadence: dense ? 'deep' : 'light',
    leadingTag,
    depthAlpha: dense ? 0.62 : 0.3,
  };
}
