const ARC = {
  INITIAL: 'initial_evolution',
  IMPACT_SEEKER: 'impact_seeker',
  REFINEMENT_SHIFT: 'refinement_shift',
  CONTROLLED_SIGNATURE: 'controlled_signature',
  DARK_MATURITY: 'dark_maturity',
  CLEAN_LUXURY_PHASE: 'clean_luxury_phase',
  EXPERIMENTAL_EXPANSION: 'experimental_expansion',
  SIGNATURE_CONSOLIDATION: 'signature_consolidation',
  FATIGUE_RESET: 'fatigue_reset',
};

function scoreSignals(tokens = [], signalMap = {}) {
  return Object.entries(signalMap).reduce((acc, [token, weight]) => acc + (tokens.includes(token) ? weight : 0), 0);
}

export function resolveTasteArc({ recentTokens = [], historicalTokens = [], fatigueSignals = [], expansionSignals = [], consolidatedSignature = null } = {}) {
  if (!recentTokens.length && !historicalTokens.length) return { arc: ARC.INITIAL, confidence: 0.25 };
  if (expansionSignals.length >= 2) return { arc: ARC.EXPERIMENTAL_EXPANSION, confidence: 0.72 };


  const impactScore = scoreSignals(recentTokens, { sweet: 2, intense: 2, projection: 2, night: 1 });
  const controlledScore = scoreSignals(recentTokens, { clean: 2, elegant: 2, versatile: 2, office: 1, dry: 1 });
  const darkScore = scoreSignals(recentTokens, { amber: 2, leather: 2, smoky: 2, resin: 1, dark: 2, night: 1 });

  if (darkScore >= 6 && recentTokens.some((token) => token === 'dark' || token === 'smoky')) return { arc: ARC.DARK_MATURITY, confidence: 0.76 };
  if (controlledScore >= 5) return { arc: ARC.CLEAN_LUXURY_PHASE, confidence: 0.73 };

  const pastImpact = scoreSignals(historicalTokens, { sweet: 2, intense: 2, projection: 2 });
  if (impactScore >= 4 && controlledScore <= 2) return { arc: ARC.IMPACT_SEEKER, confidence: 0.67 };
  if (pastImpact >= 4 && controlledScore >= 3) return { arc: ARC.REFINEMENT_SHIFT, confidence: 0.7 };
  if (fatigueSignals.length >= 2 && controlledScore < 4) return { arc: ARC.FATIGUE_RESET, confidence: 0.74 };
  if (consolidatedSignature?.strength >= 0.62 && controlledScore < 4) return { arc: ARC.SIGNATURE_CONSOLIDATION, confidence: 0.78 };
  if (controlledScore >= 4) return { arc: ARC.CONTROLLED_SIGNATURE, confidence: 0.68 };

  return { arc: ARC.EXPERIMENTAL_EXPANSION, confidence: 0.58 };
}

export { ARC as TASTE_ARC };
