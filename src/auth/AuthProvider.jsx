import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseAuthClient } from '../services/supabaseAuthClient.js';
import { canAccessAdmin, getProfileRole, isInfluencerRole } from './roles.js';
import { AuthContext } from './useAuth.js';

async function loadProfileForSession(session) {
  if (!session || !supabaseAuthClient.isConfigured || typeof supabaseAuthClient.selectProfile !== 'function') {
    return { profile: null, error: null };
  }

  return supabaseAuthClient.selectProfile(session);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateSession = useCallback(async (nextSession) => {
    setSession(nextSession || null);

    if (!nextSession) {
      setProfile(null);
      setIsLoading(false);
      return null;
    }

    const { profile: nextProfile, error } = await loadProfileForSession(nextSession);
    setProfile(nextProfile);
    setAuthError(error || null);
    setIsLoading(false);
    return nextProfile;
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabaseAuthClient.auth.getSession();
    setAuthError(error || null);
    await hydrateSession(data.session);
    return { session: data.session, error };
  }, [hydrateSession]);

  useEffect(() => {
    let isMounted = true;

    supabaseAuthClient.auth.getSession().then(async ({ data, error }) => {
      if (!isMounted) {
        return;
      }

      setAuthError(error || null);
      await hydrateSession(data.session);
    });

    const { data } = supabaseAuthClient.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      await hydrateSession(nextSession);
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe?.();
    };
  }, [hydrateSession]);

  const signInWithEmailPassword = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    const { data, error } = await supabaseAuthClient.auth.signInWithPassword({ email, password });

    if (error) {
      setAuthError(error);
      setIsLoading(false);
      return { session: null, error };
    }

    await hydrateSession(data.session);
    return { session: data.session, error: null };
  }, [hydrateSession]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    const { error } = await supabaseAuthClient.auth.signOut();
    setSession(null);
    setProfile(null);
    setAuthError(error || null);
    setIsLoading(false);
    return { error };
  }, []);

  const value = useMemo(() => {
    const role = getProfileRole(profile);

    return {
      user: session?.user || null,
      session,
      profile,
      role,
      authError,
      authUnavailableReason: supabaseAuthClient.unavailableReason || '',
      isAuthAvailable: Boolean(supabaseAuthClient.isConfigured),
      isLoading,
      isAuthenticated: Boolean(session?.user),
      isAdmin: canAccessAdmin(profile),
      isInfluencer: profile?.is_active !== false && isInfluencerRole(role),
      signInWithEmailPassword,
      signOut,
      refreshSession,
    };
  }, [authError, isLoading, profile, refreshSession, session, signInWithEmailPassword, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
