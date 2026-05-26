import { lazy, Suspense, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth.js';
import { AdaptiveIdentityLanding } from '../components/AdaptiveIdentityLanding.jsx';
import { navigateSpa } from '../utils/navigation.js';

const SignUpRitualModal = lazy(() => import('../components/auth/SignUpRitualModal.jsx').then((module) => ({ default: module.SignUpRitualModal })));

function PremiumMessage({ tone = 'default', children }) {
  const map = {
    default: 'text-lazule-mist/75 border-white/15',
    success: 'text-emerald-100/90 border-emerald-300/20',
    error: 'text-amber-100/95 border-amber-300/20',
  };

  return <p className={`rounded-xl border bg-black/20 px-4 py-3 text-sm leading-relaxed ${map[tone]}`}>{children}</p>;
}

function mapLoginError(error) {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('inválidos') || message.includes('invalid')) {
    return 'Essa combinação não corresponde à sua presença registrada.';
  }

  if (message.includes('configurado') || message.includes('503')) {
    return 'A atmosfera não respondeu a tempo.';
  }

  return 'Não foi possível reconhecer esta assinatura.';
}

function getIdentitySeed({ name, email, atmosphere }) {
  const firstVibe = atmosphere?.toLowerCase() || 'descoberta livre';
  return {
    role: 'customer',
    display_name: name,
    name,
    email,
    initial_atmosphere: atmosphere,
    semantic_user_seed: `${firstVibe}:${String(name || email || 'guest').toLowerCase().replaceAll(/\s+/g, '-')}`,
    identity_memory: {
      atmosphere,
      created_at: new Date().toISOString(),
      source: 'signup_ritual',
    },
    inferred_signature: `${firstVibe} com precisão mineral`,
    first_vibe: firstVibe,
    initial_context: 'onboarding_editorial',
    seeded_at: new Date().toISOString(),
    olfactive_memory_initial: {
      atmosphere,
      tension: 'silencioso',
      projection: 'moderada refinada',
      continuity: 'curadoria persistente',
    },
  };
}

export function OlfactiveIdentityPortal() {
  const {
    user,
    isAuthenticated,
    identityMemory,
    role,
    isAdmin,
    signOut,
    signInWithEmailPassword,
    requestPasswordRecovery,
    authError,
    isLoading,
    isAuthAvailable,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState({ tone: 'default', text: 'Entre para continuar sua assinatura sensorial.' });
  const [showRitual, setShowRitual] = useState(false);

  const hasIdentityMemory = Boolean(identityMemory?.label || identityMemory?.olfactive_memory_initial || identityMemory?.initial_atmosphere);
  const authStatus = useMemo(() => {
    if (!isAuthAvailable) return 'unavailable';
    if (authError && !isLoading) return 'error';
    if (isLoading) return 'loading';
    if (!isAuthenticated) return 'visitor';
    if (isAdmin) return 'admin';
    if (!hasIdentityMemory) return 'authenticated_without_identity';
    return 'authenticated_with_identity';
  }, [authError, hasIdentityMemory, isAdmin, isAuthAvailable, isAuthenticated, isLoading]);

  if (import.meta.env.DEV) {
    console.debug('[identity/auth]', {
      authStatus,
      userRole: role || 'none',
      hasSession: isAuthenticated,
      hasIdentityMemory,
      renderMode: authStatus,
      authAvailable: isAuthAvailable,
      isAdmin,
      profileHydrated: Boolean(identityMemory),
    });
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    const { error } = await signInWithEmailPassword(email.trim(), password);

    if (error) {
      setFeedback({ tone: 'error', text: mapLoginError(error) });
      return;
    }

    setFeedback({ tone: 'success', text: 'Bem-vindo de volta. Sua assinatura continua viva.' });
  };

  const handleRecovery = async () => {
    const { error } = await requestPasswordRecovery(email.trim());
    setFeedback({
      tone: error ? 'error' : 'success',
      text: error ? 'A atmosfera não respondeu a tempo.' : 'Se sua presença estiver registrada, enviaremos um acesso de recuperação elegante.',
    });
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
      <div className={`rounded-[2rem] border border-lazule-gold/20 bg-slate-950/70 p-6 shadow-2xl backdrop-blur transition-all duration-500 sm:p-8 ${showRitual ? 'scale-[0.99] blur-[1px]' : ''}`}>
        <p className="text-xs uppercase tracking-[0.35em] text-lazule-gold/80">Adaptive Olfactive Identity</p>
        <h1 className="mt-4 text-3xl text-white sm:text-5xl">{isAuthenticated ? 'Sua identidade sensorial permanece em evolução.' : 'Escolha como deseja atravessar esta atmosfera.'}</h1>
        <p className="mt-4 max-w-3xl text-lazule-mist/75">A LAZULE preserva sua memória olfativa com continuidade real: acesso, persistência e curadoria em camadas sutis.</p>

        {authStatus === 'loading' && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-6 text-lazule-mist/85">Reconhecendo sua presença…</div>
        )}

        {authStatus === 'unavailable' && (
          <PremiumMessage>A autenticação ainda não está disponível neste ambiente, mas sua presença pode ser iniciada localmente.</PremiumMessage>
        )}

        {authStatus === 'error' && (
          <div className="mt-8 space-y-4 rounded-2xl border border-amber-300/30 bg-amber-500/5 p-6">
            <PremiumMessage tone="error">Não conseguimos validar sua sessão agora. Tente novamente em instantes.</PremiumMessage>
            <button onClick={() => window.location.reload()} className="rounded-xl border border-white/20 px-4 py-2 text-white">Tentar novamente</button>
          </div>
        )}

        {authStatus === 'authenticated_with_identity' && <AdaptiveIdentityLanding identityMemory={identityMemory} />}

        {authStatus === 'authenticated_without_identity' && (
          <div className="mt-10 space-y-5 rounded-2xl border border-lazule-gold/25 bg-black/20 p-6">
            <h2 className="text-2xl text-white">Sua assinatura ainda não foi iniciada.</h2>
            <p className="text-lazule-mist/80">Vamos construir sua identidade sensorial para ativar a experiência viva da LAZULE.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowRitual(true)} className="rounded-xl border border-lazule-gold/50 bg-lazule-gold/20 px-4 py-3 font-semibold text-white">Construir minha identidade</button>
              <button onClick={() => signOut()} className="rounded-xl border border-white/25 px-4 py-3 text-white">Sair</button>
            </div>
          </div>
        )}

        {authStatus === 'admin' && (
          <div className="mt-10 space-y-4 rounded-2xl border border-lazule-gold/30 bg-black/25 p-6">
            <h2 className="text-2xl text-white">Você está em uma sessão administrativa.</h2>
            <p className="text-lazule-mist/80">Para proteger a experiência de cliente, escolha como deseja continuar.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigateSpa('/admin/analytics')} className="rounded-xl border border-white/25 px-4 py-3 text-white">Continuar para painel admin</button>
              <button onClick={() => setShowRitual(true)} className="rounded-xl border border-lazule-gold/50 bg-lazule-gold/20 px-4 py-3 text-white">Criar/usar identidade sensorial</button>
              <button onClick={() => signOut()} className="rounded-xl border border-white/25 px-4 py-3 text-white">Entrar como cliente</button>
              <button onClick={() => signOut()} className="rounded-xl border border-white/25 px-4 py-3 text-white">Sair desta sessão</button>
            </div>
          </div>
        )}

        {authStatus === 'visitor' && (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-6">
              <h2 className="text-2xl text-white">Continuar sua assinatura</h2>
              <p className="text-sm text-lazule-mist/75">Acesse sua memória olfativa, evolução sensorial e curadoria persistente.</p>
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
              <button disabled={isLoading || !isAuthAvailable} className="w-full rounded-xl border border-white/25 bg-white/5 px-4 py-3 font-medium text-white disabled:opacity-50">Entrar na sua atmosfera</button>
              <button type="button" onClick={handleRecovery} className="text-xs uppercase tracking-[0.24em] text-lazule-mist/70">Recuperar acesso</button>
              <PremiumMessage tone={feedback.tone}>{feedback.text}</PremiumMessage>
            </form>

            <div className="space-y-4 rounded-2xl border border-lazule-gold/30 bg-gradient-to-b from-lazule-gold/10 to-transparent p-6 shadow-lg shadow-lazule-gold/10">
              <h2 className="text-2xl text-white">Iniciar nova presença</h2>
              <p className="text-sm text-lazule-mist/80">Permita que a LAZULE comece a compreender sua assinatura ao longo do tempo.</p>
              <button onClick={() => setShowRitual(true)} className="w-full rounded-xl border border-lazule-gold/50 bg-lazule-gold/20 px-4 py-3 font-semibold text-white shadow-md shadow-lazule-gold/20">Criar identidade</button>
              <p className="text-xs text-lazule-mist/68">Sua identidade será salva com memória olfativa persistente.</p>
              {authError && <PremiumMessage tone="error">Não conseguimos iniciar sua identidade agora.</PremiumMessage>}
            </div>
          </div>
        )}
      </div>

      {showRitual && (
        <Suspense fallback={<div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" />}>
          <SignUpRitualModal onClose={() => setShowRitual(false)} identitySeedFactory={getIdentitySeed} />
        </Suspense>
      )}
    </section>
  );
}
