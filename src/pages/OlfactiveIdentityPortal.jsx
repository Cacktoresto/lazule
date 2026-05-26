import { useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth.js';
import { loadTasteMemoryStore } from '../utils/tasteMemoryStore.js';

const MODE_LABEL = {
  signin: 'Entrar na sua atmosfera',
  signup: 'Começar sua assinatura',
  recovery: 'Recuperar sua presença olfativa',
};

export function OlfactiveIdentityPortal() {
  const { isAuthenticated, identityMemory, signInWithEmailPassword, signUpWithEmailPassword, requestPasswordRecovery, authError, isLoading } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState('');

  const memory = useMemo(() => loadTasteMemoryStore(), []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback('');

    if (mode === 'recovery') {
      const { error } = await requestPasswordRecovery(email);
      setFeedback(error ? error.message : 'Se seu e-mail existir, você receberá um link elegante para retomar sua assinatura.');
      return;
    }

    if (mode === 'signup') {
      const { error } = await signUpWithEmailPassword(email, password, { display_name: name });
      setFeedback(error ? error.message : 'Sua presença olfativa foi iniciada com sucesso.');
      return;
    }

    const { error } = await signInWithEmailPassword(email, password);
    setFeedback(error ? error.message : 'Sua assinatura foi retomada.');
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:px-8">
      <div className="rounded-[2rem] border border-lazule-gold/20 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-lazule-gold/80">Adaptive Olfactive Identity</p>
        <h1 className="mt-4 text-3xl text-white sm:text-5xl">{isAuthenticated ? 'Sua identidade sensorial está viva.' : MODE_LABEL[mode]}</h1>
        <p className="mt-4 max-w-3xl text-lazule-mist/75">A LAZULE aprende com sutileza: revisitas, atmosferas e contextos compõem sua assinatura sem fricção.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-6">
            {mode === 'signup' && <input className="w-full rounded-xl bg-white/5 px-4 py-3 text-white" placeholder="Nome para sua curadoria" value={name} onChange={(e) => setName(e.target.value)} />}
            <input className="w-full rounded-xl bg-white/5 px-4 py-3 text-white" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            {mode !== 'recovery' && <input className="w-full rounded-xl bg-white/5 px-4 py-3 text-white" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />}
            <button disabled={isLoading} className="w-full rounded-xl border border-lazule-gold/40 bg-lazule-gold/10 px-4 py-3 font-medium text-white">{MODE_LABEL[mode]}</button>
            <p className="text-sm text-lazule-mist/70">{feedback || authError?.message || ' '}</p>
            <div className="flex gap-3 text-xs text-lazule-mist/70">
              <button type="button" onClick={() => setMode('signin')}>Continuar assinatura</button>
              <button type="button" onClick={() => setMode('signup')}>Nova presença</button>
              <button type="button" onClick={() => setMode('recovery')}>Recuperar acesso</button>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-lazule-mist/80">
            <p className="text-xs uppercase tracking-[0.28em] text-lazule-gold/80">Memória em evolução</p>
            <p className="mt-3">Eventos olfativos recentes: <strong>{memory.events.length}</strong></p>
            <p className="mt-2">Assinatura inferida: <strong>{memory.profile?.signature || identityMemory?.aura || 'em formação'}</strong></p>
            <p className="mt-2">Contexto dominante: <strong>{identityMemory?.dominant_context || 'a descobrir'}</strong></p>
            <p className="mt-6 text-lazule-mist/60">Privacidade premium: apenas sinais essenciais para personalização sensorial.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
