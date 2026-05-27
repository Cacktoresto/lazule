export function resolveTasteExpansion({ recentTokens = [], historicalTokens = [] } = {}) {
  const transitions = [];
  const startedFresh = historicalTokens.includes('fresh') || historicalTokens.includes('clean');
  const nowAmber = recentTokens.includes('amber') || recentTokens.includes('dark');
  if (startedFresh && nowAmber) transitions.push('fresh_to_amber');

  const startedImpact = historicalTokens.includes('sweet') || historicalTokens.includes('intense');
  const nowControlled = recentTokens.includes('clean') || recentTokens.includes('versatile') || recentTokens.includes('office');
  if (startedImpact && nowControlled) transitions.push('impact_to_controlled');

  const dayNightContrast = (historicalTokens.includes('night') && recentTokens.includes('office')) || (historicalTokens.includes('office') && recentTokens.includes('night'));
  if (dayNightContrast) transitions.push('day_night_contrast');

  return transitions;
}
