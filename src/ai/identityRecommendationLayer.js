const DEFAULT_NARRATIVES = [
  'Continuações naturais da sua atmosfera recente.',
  'Construções alinhadas à sua presença predominante.',
  'Atmosferas sofisticadas que expandem sua assinatura.',
  'Explorações coerentes com seu ciclo atual.',
];

export function deriveIdentityRecommendations({ phase, dominantSignature, sensoryWishlist = [], revisitNarrative, emotionalConstellations = [] } = {}) {
  const density = revisitNarrative?.revisitCount > 3 ? 'deep' : 'balanced';
  const atmosphericFocus = sensoryWishlist[0]?.atmosphere || dominantSignature || phase || 'presença editorial';

  return {
    atmosphericFocus,
    density,
    continuityNarratives: DEFAULT_NARRATIVES,
    contextualAnchor: emotionalConstellations[0] || revisitNarrative?.persistentAtmosphere || atmosphericFocus,
  };
}
