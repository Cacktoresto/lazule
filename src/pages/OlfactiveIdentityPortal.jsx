import { lazy, Suspense, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth.js';
import { loadTasteMemoryStore } from '../utils/tasteMemoryStore.js';

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
    display_name: name,
    initial_atmosphere: atmosphere,
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
    isAuthenticated,
    identityMemory,
    signInWithEmailPassword,
    requestPasswordRecovery,
    authError,
    isLoading,
    isAuthAvailable,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState({ tone: 'default', text: 'Entre para continuar sua assinatura sensorial.' });
  const [showRitual, setShowRitual] = useState(false);

  const memory = useMemo(() => loadTasteMemoryStore(), []);

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

        {isAuthenticated ? (
          <div className="mt-10 rounded-2xl border border-lazule-gold/25 bg-black/20 p-6 text-lazule-mist/85">
            <p className="text-xs uppercase tracking-[0.28em] text-lazule-gold/75">Continuidade sensorial</p>
            <h2 className="mt-3 text-2xl text-white">Bem-vindo de volta.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">Sua atmosfera recente continua orbitando <strong>{identityMemory?.aura || 'frescor mineral'}</strong> e <strong>{identityMemory?.dominant_context || 'luxo silencioso'}</strong>.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Assinatura dominante</p><p className="mt-2 text-sm text-white">{identityMemory?.aura || 'em formação contínua'}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">Perfumes revisitados</p><p className="mt-2 text-sm text-white">{memory.events.length} registros sensoriais</p></div>
            </div>
            <button onClick={signOut} className="mt-6 rounded-xl border border-white/25 bg-white/5 px-4 py-2 text-sm text-white/90">Encerrar sessão</button>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-6">
              <h2 className="text-2xl text-white">Continuar sua assinatura</h2>
              <p className="text-sm text-lazule-mist/75">Acesse sua memória olfativa, evolução sensorial e curadoria persistente.</p>
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
              <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
              <button disabled={isLoading || !isAuthAvailable} className="w-full rounded-xl border border-white/25 bg-white/5 px-4 py-3 font-medium text-white disabled:opacity-50">Entrar na atmosfera</button>
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
