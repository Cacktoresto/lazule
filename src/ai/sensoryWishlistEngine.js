const MAX_PRESENCES = 36;

export function normalizeAtmospherePresence(entry = {}) {
  return {
    perfumeSlug: String(entry.perfumeSlug || entry.perfume || '').trim(),
    perfumeName: String(entry.perfumeName || entry.name || '').trim(),
    atmosphere: String(entry.atmosphere || 'assinatura em transição').trim(),
    context: String(entry.context || 'curadoria_futura').trim(),
    timestamp: entry.timestamp || new Date().toISOString(),
    emotionalIntensity: Number.isFinite(entry.emotionalIntensity) ? Math.min(1, Math.max(0, entry.emotionalIntensity)) : 0.64,
    currentPhase: String(entry.currentPhase || 'refinamento_sutil').trim(),
    implicitIntent: String(entry.implicitIntent || 'expansao_identitaria').trim(),
  };
}

export function createSensoryWishlistEngine(state = {}) {
  const presences = Array.isArray(state.presences) ? state.presences.map(normalizeAtmospherePresence).filter((item) => item.perfumeSlug || item.perfumeName).slice(-MAX_PRESENCES) : [];
  return { version: 1, presences };
}

export function addAtmospherePresence(state = {}, payload = {}) {
  const normalized = normalizeAtmospherePresence(payload);
  if (!normalized.perfumeSlug && !normalized.perfumeName) return createSensoryWishlistEngine(state);
  const base = createSensoryWishlistEngine(state);
  const deduped = base.presences.filter((item) => item.perfumeSlug !== normalized.perfumeSlug || item.atmosphere !== normalized.atmosphere);
  return createSensoryWishlistEngine({ presences: [...deduped, normalized] });
}

export function describePresenceConfirmation(presence = {}) {
  if ((presence.emotionalIntensity || 0) > 0.75) return 'Construção olfativa que continua orbitando sua identidade.';
  if ((presence.currentPhase || '').includes('expans')) return 'Assinatura alinhada à sua evolução atual.';
  return 'Uma atmosfera que conversa com sua presença recente.';
}
