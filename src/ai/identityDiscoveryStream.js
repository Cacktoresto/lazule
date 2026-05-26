export function buildIdentityDiscoveryStream({ profile, sensoryWishlist = [], revisitNarrative } = {}) {
  const stream = [];
  if (sensoryWishlist.length) {
    stream.push('Uma presença mais luminosa começa a surgir na sua curadoria.');
  }
  if (profile?.density === 'dense') {
    stream.push('Você vem expandindo sua assinatura para atmosferas mais densas.');
  }
  if (revisitNarrative?.persistentAtmosphere) {
    stream.push(`Construções ${revisitNarrative.persistentAtmosphere} continuam dominando suas explorações recentes.`);
  }
  return stream.slice(0, 4);
}
