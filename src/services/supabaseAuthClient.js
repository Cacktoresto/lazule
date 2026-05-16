const AUTH_STORAGE_KEY = 'lazule.supabase.auth.session.v1';
const REFRESH_SKEW_SECONDS = 60;

function readEnv(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env && Object.hasOwn(import.meta.env, name)) {
    return import.meta.env[name];
  }

  if (typeof process !== 'undefined' && process.env && Object.hasOwn(process.env, name)) {
    return process.env[name];
  }

  return undefined;
}

function getWindow() {
  return typeof window !== 'undefined' ? window : null;
}

function canUseStorage() {
  return Boolean(getWindow()?.localStorage);
}

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeSupabaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function createAuthError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function mapAuthError(payload, fallback = 'Não foi possível autenticar agora.') {
  const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || fallback;

  if (/invalid login credentials/i.test(message)) {
    return createAuthError('E-mail ou senha inválidos. Confira os dados e tente novamente.', 400);
  }

  if (/email not confirmed/i.test(message)) {
    return createAuthError('Confirme seu e-mail antes de acessar a área LAZULE.', 400);
  }

  return createAuthError(message, 400);
}

function createAuthResponse(session) {
  return { data: { session: session || null, user: session?.user || null }, error: null };
}

function createUnavailableAuthClient(reason) {
  const unavailableError = createAuthError(reason, 503);

  return {
    isConfigured: false,
    unavailableReason: reason,
    auth: {
      async getSession() {
        return { data: { session: null }, error: unavailableError };
      },
      onAuthStateChange(callback) {
        callback?.('AUTH_UNAVAILABLE', null);
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signInWithPassword() {
        return { data: { session: null, user: null }, error: unavailableError };
      },
      async signOut() {
        return { error: unavailableError };
      },
      async refreshSession() {
        return { data: { session: null, user: null }, error: unavailableError };
      },
    },
  };
}

class LazuleSupabaseAuthClient {
  constructor({ url, anonKey }) {
    this.url = normalizeSupabaseUrl(url);
    this.anonKey = String(anonKey || '').trim();
    this.isConfigured = Boolean(this.url && this.anonKey);
    this.unavailableReason = this.isConfigured ? '' : 'Supabase Auth não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.';
    this.listeners = new Set();
    this.auth = {
      getSession: this.getSession.bind(this),
      onAuthStateChange: this.onAuthStateChange.bind(this),
      signInWithPassword: this.signInWithPassword.bind(this),
      signOut: this.signOut.bind(this),
      refreshSession: this.refreshSession.bind(this),
    };
  }

  get storageKey() {
    return `${AUTH_STORAGE_KEY}:${this.url}`;
  }

  get headers() {
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      'Content-Type': 'application/json',
    };
  }

  readStoredSession() {
    if (!canUseStorage()) {
      return null;
    }

    return safeJsonParse(getWindow().localStorage.getItem(this.storageKey));
  }

  writeStoredSession(session) {
    if (!canUseStorage()) {
      return;
    }

    if (!session) {
      getWindow().localStorage.removeItem(this.storageKey);
      return;
    }

    getWindow().localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  notify(event, session) {
    for (const listener of this.listeners) {
      listener(event, session);
    }
  }

  async request(path, { method = 'GET', accessToken, body } = {}) {
    if (!this.isConfigured) {
      throw createAuthError(this.unavailableReason, 503);
    }

    const response = await fetch(`${this.url}${path}`, {
      method,
      headers: {
        ...this.headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw mapAuthError(payload, `Supabase Auth respondeu com status ${response.status}.`);
    }

    return payload;
  }

  isExpiredOrStale(session) {
    const expiresAt = Number(session?.expires_at || 0);
    return Boolean(expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + REFRESH_SKEW_SECONDS);
  }

  async getSession() {
    try {
      const storedSession = this.readStoredSession();

      if (!storedSession?.access_token) {
        return createAuthResponse(null);
      }

      if (this.isExpiredOrStale(storedSession) && storedSession.refresh_token) {
        return this.refreshSession(storedSession);
      }

      return createAuthResponse(storedSession);
    } catch (error) {
      return { data: { session: null }, error };
    }
  }

  onAuthStateChange(callback) {
    this.listeners.add(callback);
    this.getSession().then(({ data }) => callback?.('INITIAL_SESSION', data.session));

    return {
      data: {
        subscription: {
          unsubscribe: () => this.listeners.delete(callback),
        },
      },
    };
  }

  async signInWithPassword({ email, password }) {
    try {
      const payload = await this.request('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: { email, password },
      });
      const session = {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_in: payload.expires_in,
        expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 0),
        token_type: payload.token_type || 'bearer',
        user: payload.user || null,
      };

      this.writeStoredSession(session);
      this.notify('SIGNED_IN', session);
      return createAuthResponse(session);
    } catch (error) {
      return { data: { session: null, user: null }, error };
    }
  }

  async refreshSession(session = this.readStoredSession()) {
    try {
      if (!session?.refresh_token) {
        return createAuthResponse(null);
      }

      const payload = await this.request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: session.refresh_token },
      });
      const refreshedSession = {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token || session.refresh_token,
        expires_in: payload.expires_in,
        expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + Number(payload.expires_in || 0),
        token_type: payload.token_type || 'bearer',
        user: payload.user || session.user || null,
      };

      this.writeStoredSession(refreshedSession);
      this.notify('TOKEN_REFRESHED', refreshedSession);
      return createAuthResponse(refreshedSession);
    } catch (error) {
      this.writeStoredSession(null);
      this.notify('SIGNED_OUT', null);
      return { data: { session: null, user: null }, error };
    }
  }

  async signOut() {
    const session = this.readStoredSession();
    this.writeStoredSession(null);

    if (session?.access_token) {
      await this.request('/auth/v1/logout', { method: 'POST', accessToken: session.access_token }).catch(() => null);
    }

    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  async selectInfluencerProfiles(session) {
    if (!session?.access_token) {
      return { profiles: [], error: null };
    }

    try {
      const response = await fetch(`${this.url}/rest/v1/profiles?role=eq.influencer&select=id,email,full_name,name,display_name,role,is_active,influencer_ref,coupon_code,created_at&order=created_at.desc`, {
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${session.access_token}`,
          Accept: 'application/json',
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw mapAuthError(payload, 'Não foi possível carregar os perfis influencers.');
      }

      return { profiles: Array.isArray(payload) ? payload : [], error: null };
    } catch (error) {
      return { profiles: [], error };
    }
  }

  async selectProfile(session) {
    if (!session?.access_token || !session.user?.id) {
      return { profile: null, error: null };
    }

    try {
      const id = encodeURIComponent(session.user.id);
      const response = await fetch(`${this.url}/rest/v1/profiles?id=eq.${id}&select=*`, {
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${session.access_token}`,
          Accept: 'application/json',
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw mapAuthError(payload, 'Não foi possível carregar o perfil de acesso.');
      }

      return { profile: Array.isArray(payload) ? payload[0] || null : null, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  }
}

export function getSupabaseAuthConfig() {
  const url = normalizeSupabaseUrl(readEnv('VITE_SUPABASE_URL'));
  const anonKey = String(readEnv('VITE_SUPABASE_ANON_KEY') || '').trim();

  return {
    url,
    anonKey,
    enabled: Boolean(url && anonKey),
    unavailableReason: url && anonKey ? '' : 'Supabase Auth não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
  };
}

export function createSupabaseAuthClient(config = getSupabaseAuthConfig()) {
  if (!config.enabled) {
    return createUnavailableAuthClient(config.unavailableReason);
  }

  return new LazuleSupabaseAuthClient({ url: config.url, anonKey: config.anonKey });
}

export const supabaseAuthClient = createSupabaseAuthClient();

export default supabaseAuthClient;
