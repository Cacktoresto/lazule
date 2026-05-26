export function resolveContextualIdentity({ profile = null, occasion = null, environmentalAtmosphere = null } = {}) {
  const primaryFamily = profile?.primaryFamily || 'mineral';
  const identityKey = `${occasion?.occasion || 'assinatura_diaria'}_${primaryFamily}`;

  return {
    key: identityKey,
    primaryFamily,
    signatureMode: occasion?.presence || 'silent-mineral',
    atmosphereDensity: profile?.density || 'balanced',
    narrativeAxis: occasion?.narrativeTone || 'presenca_diaria',
    environmentBlend: environmentalAtmosphere?.environmentalSignature || 'manha_seco_temperado',
  };
}

export function resolveSensorySeason({ memoryCycles = [], contextualIdentity = null, environmentalAtmosphere = null } = {}) {
  const dominantCycle = memoryCycles[0]?.key || contextualIdentity?.narrativeAxis || 'expansao_luminosa';
  const seasonalShift = environmentalAtmosphere?.season || 'verao';

  return {
    key: `${dominantCycle}_${seasonalShift}`,
    cadence: dominantCycle.includes('introspect') ? 'deep-slow' : 'luminous-steady',
    sequencing: seasonalShift === 'inverno' ? 'dense-cinematic' : seasonalShift === 'verao' ? 'mineral-open' : 'editorial-balanced',
    recommendationDensity: seasonalShift === 'inverno' ? 'focused' : 'airy',
  };
}

export function resolveCompanionshipNarrative({ contextualIdentity = null, sensorySeason = null } = {}) {
  const family = contextualIdentity?.primaryFamily || 'mineral';
  if (sensorySeason?.sequencing === 'dense-cinematic') {
    return 'Assinaturas mais densas seguem retornando às suas noites recentes.';
  }
  if (contextualIdentity?.narrativeAxis === 'presenca_executiva') {
    return 'Construções alinhadas à sua presença executiva recente.';
  }
  return `Atmosferas ${family} continuam acompanhando sua presença diária.`;
}
