export function buildLivingMemoryTimeline({ events = [], revisitNarrative, discoveryStream = [] } = {}) {
  const fragments = [];
  if (revisitNarrative?.revisitCount) {
    fragments.push({
      id: 'revisit-presences',
      title: 'Presenças que continuam retornando.',
      note: revisitNarrative.narrative,
    });
  }
  if (revisitNarrative?.persistentAtmosphere) {
    fragments.push({
      id: 'persistent-atmospheres',
      title: 'Atmosferas que permaneceram.',
      note: `Persistência recente em ${revisitNarrative.persistentAtmosphere}.`,
    });
  }
  if (discoveryStream[0]) {
    fragments.push({ id: 'recent-traces', title: 'Construções que deixaram rastros recentes.', note: discoveryStream[0] });
  }
  const recent = events.slice(-2).map((event, index) => ({
    id: `event-${index}`,
    title: event.productName || 'Momento olfativo',
    note: event.reason || 'Eco editorial recente.',
  }));
  return [...fragments, ...recent].slice(0, 6);
}
