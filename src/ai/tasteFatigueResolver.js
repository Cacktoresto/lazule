export function resolveTasteFatigue({ recentTokens = [], historicalTokens = [] } = {}) {
  const hasDense = recentTokens.filter((token) => ['sweet', 'dark', 'night', 'intense'].includes(token)).length >= 3;
  const freshShift = recentTokens.some((token) => ['clean', 'fresh', 'dry', 'airy'].includes(token));
  const densePast = historicalTokens.filter((token) => ['sweet', 'dark', 'night', 'intense'].includes(token)).length >= 3;
  const fatigueSignals = [];

  if (densePast && freshShift) fatigueSignals.push('density_to_breathability_shift');
  if (hasDense && freshShift) fatigueSignals.push('alternating_impact_and_reset');
  if (recentTokens.filter((token) => token === 'sweet').length >= 2 && freshShift) fatigueSignals.push('sweet_saturation_soft_reset');

  return fatigueSignals;
}
