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

  return {
    id: user?.id || 'guest',
    label: profile?.display_name || profile?.name || fallbackLabel,
    aura: profile?.olfactive_aura || 'luxo silencioso mineral',
    dominant_context: profile?.dominant_context || 'curadoria intimista',
    updated_at: new Date().toISOString(),
  };
}
