import { resolveTasteArc, TASTE_ARC } from './tasteArcResolver.js';
import { resolveTasteFatigue } from './tasteFatigueResolver.js';
import { resolveTasteExpansion } from './tasteExpansionResolver.js';
import { resolveTasteEvolutionNarrative } from './tasteEvolutionNarrative.js';

const ATMOSPHERE_TOKEN_MAP = {
  amber_nocturne: ['amber', 'night', 'dark', 'intense'],
  smoky_executive: ['smoky', 'dark', 'office', 'elegant'],
  mineral_aquatic: ['fresh', 'clean', 'airy'],
  luxury_clean: ['clean', 'elegant', 'versatile', 'office'],
  sweet_impact: ['sweet', 'projection', 'intense', 'night'],
  executive_fresh: ['fresh', 'clean', 'office', 'dry'],
};

function toTokens(atmospheres = []) {
  return atmospheres.flatMap((name) => ATMOSPHERE_TOKEN_MAP[name] || name.split(/[_\s-]+/));
}

export function deriveTasteEvolution({ profile = {}, events = [], wishlist = [] } = {}) {
  const topAtmospheres = Array.isArray(profile.topAtmospheres) ? profile.topAtmospheres : [];
  const recentAtmospheres = events.slice(-12).map((event) => event.atmosphere || event.primaryAtmosphere).filter(Boolean);
  const historicalAtmospheres = events.slice(0, Math.max(events.length - 12, 0)).map((event) => event.atmosphere || event.primaryAtmosphere).filter(Boolean);
  const wishlistAtmospheres = wishlist.map((item) => item.atmosphere).filter(Boolean);

  const recentTokens = toTokens([...topAtmospheres, ...recentAtmospheres, ...wishlistAtmospheres]);
  const historicalTokens = toTokens(historicalAtmospheres);

  const fatigueSignals = resolveTasteFatigue({ recentTokens, historicalTokens });
  const expansionSignals = resolveTasteExpansion({ recentTokens, historicalTokens });

  const atmosphereCounts = recentAtmospheres.reduce((acc, key) => ({ ...acc, [key]: (acc[key] || 0) + 1 }), {});
  const dominant = Object.entries(atmosphereCounts).sort((a, b) => b[1] - a[1])[0];
  const consolidatedSignature = dominant ? { axis: dominant[0], strength: Math.min(0.9, dominant[1] / Math.max(1, recentAtmospheres.length)) } : null;

  const { arc, confidence } = resolveTasteArc({ recentTokens, historicalTokens, fatigueSignals, expansionSignals, consolidatedSignature });
  const narrative = resolveTasteEvolutionNarrative({ arc, expansionSignals, fatigueSignals });

  const growingAtmospheres = [...new Set([...topAtmospheres, ...wishlistAtmospheres])].slice(0, 3);
  const fadingAtmospheres = fatigueSignals.length ? ['sweet_impact'] : [];
  const returningPatterns = [...new Set(events.map((event) => event.atmosphere || event.primaryAtmosphere).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) !== index))].slice(0, 2);

  return {
    arc,
    confidence: Number(confidence.toFixed(2)),
    maturitySignals: arc === TASTE_ARC.REFINEMENT_SHIFT || arc === TASTE_ARC.CONTROLLED_SIGNATURE || arc === TASTE_ARC.CLEAN_LUXURY_PHASE ? ['control_over_projection', 'contextual_versatility'] : [],
    fatigueSignals,
    expansionSignals,
    consolidatedSignature,
    returningPatterns,
    growingAtmospheres,
    fadingAtmospheres,
    narrative,
    suggestedNextPaths: arc === TASTE_ARC.FATIGUE_RESET ? ['reset_clean_luxury'] : arc === TASTE_ARC.EXPERIMENTAL_EXPANSION ? ['contrast_controlled_signature'] : ['continue_signature_direction'],
    lastUpdated: new Date().toISOString(),
  };
}
