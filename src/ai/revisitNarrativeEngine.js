export function buildRevisitNarrative(events = []) {
  const visits = events.filter((event) => (event.intent === 'revisit' || event.type === 'revisit' || event.reason?.includes('retorn')));
  const byAtmosphere = new Map();
  const byPerfume = new Map();

  visits.forEach((event) => {
    const atmosphere = event.atmosphere || event.primaryAtmosphere || 'assinatura silenciosa';
    const perfume = event.productName || event.productSlug || 'presença';
    byAtmosphere.set(atmosphere, (byAtmosphere.get(atmosphere) || 0) + 1);
    byPerfume.set(perfume, (byPerfume.get(perfume) || 0) + 1);
  });

  const dominantAtmosphere = [...byAtmosphere.entries()].sort((a, b) => b[1] - a[1])[0];
  const dominantPerfume = [...byPerfume.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    revisitCount: visits.length,
    persistentAtmosphere: dominantAtmosphere?.[0] || null,
    silentObsession: dominantPerfume?.[1] >= 3 ? dominantPerfume[0] : null,
    narrative: visits.length < 2
      ? 'Atmosferas semelhantes permanecem recorrentes na sua assinatura.'
      : dominantPerfume?.[1] >= 3
        ? `Essa presença continua retornando às suas explorações: ${dominantPerfume[0]}.`
        : `Você mantém afinidade recorrente com construções ${String(dominantAtmosphere?.[0] || 'sofisticadas')}.`,
  };
}
