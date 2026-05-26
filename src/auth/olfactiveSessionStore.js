const SESSION_STORAGE_KEY = 'lazule.olfactive.identity.v1';

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function loadOlfactiveSession(storage = globalThis?.localStorage) {
  if (!storage) return null;
  return safeParse(storage.getItem(SESSION_STORAGE_KEY));
}

export function saveOlfactiveSession(session, storage = globalThis?.localStorage) {
  if (!storage) return;

  if (!session) {
    storage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function buildIdentityPreview(user, profile) {
  const fallbackLabel = user?.email ? user.email.split('@')[0] : 'presença anônima';

  const metadata = user?.user_metadata || {};

  return {
    id: user?.id || 'guest',
    label: profile?.display_name || profile?.name || metadata.display_name || fallbackLabel,
    aura: profile?.olfactive_aura || metadata.inferred_signature || 'luxo silencioso mineral',
    dominant_context: profile?.dominant_context || metadata.initial_context || 'curadoria intimista',
    initial_atmosphere: metadata.initial_atmosphere || null,
    first_vibe: metadata.first_vibe || null,
    olfactive_memory_initial: metadata.olfactive_memory_initial || null,
    seeded_at: metadata.seeded_at || null,
    updated_at: new Date().toISOString(),
  };
}
