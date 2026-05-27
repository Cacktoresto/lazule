const DEFAULT_NARRATIVE = 'Seu repertório recente mantém contraste sem perder coerência.';

const ATMOSPHERE_TOKENS = {
  luxury_clean: ['clean', 'control', 'quiet', 'safe', 'day', 'social'],
  executive_fresh: ['clean', 'control', 'mature', 'social', 'day'],
  mineral_aquatic: ['clean', 'fresh', 'social', 'silent'],
  amber_nocturne: ['impact', 'dark', 'aspiration', 'night', 'intense'],
  smoky_executive: ['dark', 'control', 'mature', 'intense', 'intro'],
  sweet_impact: ['impact', 'excess', 'fun', 'night', 'youth'],
};

function normalizeList(values = []) {
  return values.filter(Boolean).map((item) => String(item).trim().toLowerCase());
}

function toAtmosphereStream({ profile = {}, events = [], wishlist = [] } = {}) {
  const top = Array.isArray(profile.topAtmospheres) ? profile.topAtmospheres : [];
  const eventAtmospheres = events.map((event) => event.atmosphere || event.primaryAtmosphere).filter(Boolean);
  const wishlistAtmospheres = wishlist.map((item) => item.atmosphere).filter(Boolean);
  return normalizeList([...top, ...eventAtmospheres.slice(-18), ...wishlistAtmospheres.slice(-8)]);
}

function deriveTokenScore(stream = []) {
  return stream.reduce((acc, key) => {
    const tokens = ATMOSPHERE_TOKENS[key] || key.split(/[_\s-]+/);
    tokens.forEach((token) => { acc[token] = (acc[token] || 0) + 1; });
    return acc;
  }, {});
}

export function resolveOlfactiveDuality(stream = []) {
  const score = deriveTokenScore(stream);
  const clean = (score.clean || 0) + (score.safe || 0);
  const impact = (score.impact || 0) + (score.intense || 0) + (score.excess || 0);
  const social = (score.social || 0) + (score.day || 0);
  const introspective = (score.dark || 0) + (score.intro || 0) + (score.night || 0);

  const patterns = [];
  if (clean > 0 && impact > 0) patterns.push('clean_vs_impact');
  if (social > 0 && introspective > 0) patterns.push('social_vs_introspective');

  const dominantDuality = clean >= impact
    ? { left: 'clean_control', right: 'impact_presence', balance: Number((impact / Math.max(1, clean + impact)).toFixed(2)) }
    : { left: 'impact_presence', right: 'clean_control', balance: Number((clean / Math.max(1, clean + impact)).toFixed(2)) };

  return { patterns, dominantDuality, social, introspective, clean, impact };
}

export function resolveAspirationalIdentity({ stream = [], dominant = '' } = {}) {
  const normalizedDominant = String(dominant || '').toLowerCase();
  const aspirationalAtmospheres = stream.filter((item) => item && item !== normalizedDominant && /(amber|smoky|impact|night)/.test(item));
  const revisits = aspirationalAtmospheres.reduce((acc, key) => ({ ...acc, [key]: (acc[key] || 0) + 1 }), {});
  const topAspirational = Object.entries(revisits).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    signals: aspirationalAtmospheres.length ? ['presence_construction', 'contrast_exploration'] : [],
    topAspirational,
    aspirationalCount: aspirationalAtmospheres.length,
  };
}

export function resolveComfortVsAspiration({ stream = [], dominant = '' } = {}) {
  const safe = stream.filter((item) => item === dominant || /(clean|executive|luxury_clean)/.test(item)).length;
  const aspirational = stream.filter((item) => /(amber|smoky|sweet_impact)/.test(item) && item !== dominant).length;
  return {
    comfortPatterns: safe > 0 ? ['familiar_revisit', 'signature_base'] : [],
    aspirationalPatterns: aspirational > 0 ? ['contrast_pull', 'presence_idealization'] : [],
    comfortScore: Number((safe / Math.max(1, stream.length)).toFixed(2)),
    aspirationScore: Number((aspirational / Math.max(1, stream.length)).toFixed(2)),
  };
}

export function resolveTensionNarrative({ duality, aspiration, comfort }) {
  if (duality.patterns.includes('clean_vs_impact')) {
    return 'Atmosferas mais limpas crescem, mas perfumes intensos ainda retornam.';
  }
  if (aspiration.aspirationalCount >= 2) {
    return 'Algumas escolhas recentes parecem menos sobre conforto e mais sobre construção de presença.';
  }
  if (comfort.comfortScore > 0.45) {
    return 'Perfumes mais seguros continuam como base, com espaço para contraste.';
  }
  return DEFAULT_NARRATIVE;
}

export function deriveIdentityTension({ profile = {}, events = [], wishlist = [] } = {}) {
  const stream = toAtmosphereStream({ profile, events, wishlist });
  const dominant = normalizeList(profile.topAtmospheres || [])[0] || stream[0] || 'luxury_clean';
  const duality = resolveOlfactiveDuality(stream);
  const aspiration = resolveAspirationalIdentity({ stream, dominant });
  const comfort = resolveComfortVsAspiration({ stream, dominant });
  const narrative = resolveTensionNarrative({ duality, aspiration, comfort });

  const identityTension = {
    dominantDuality: duality.dominantDuality,
    aspirationalSignals: aspiration.signals,
    comfortPatterns: comfort.comfortPatterns,
    tensionPatterns: duality.patterns,
    contrastingAtmospheres: stream.filter((item) => item !== dominant).slice(0, 4),
    narrative,
    confidence: Number(Math.min(0.94, 0.4 + stream.length * 0.03).toFixed(2)),
    evolvingDirection: aspiration.topAspirational || dominant,
    oscillationLevel: Number((Math.min(1, (duality.patterns.length + comfort.aspirationScore) / 2)).toFixed(2)),
    lastUpdated: new Date().toISOString(),
  };

  return {
    identityTension,
    identityTensionResolver: { streamLength: stream.length, dominant },
    aspirationalIdentityResolver: aspiration,
    olfactiveDualityResolver: duality,
    comfortVsAspirationResolver: comfort,
    tensionNarrativeLayer: { narrative },
  };
}
