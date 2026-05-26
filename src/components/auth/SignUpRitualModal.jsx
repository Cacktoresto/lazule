import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/useAuth.js';
import { mapSignupErrorForUx } from '../../auth/signupDiagnostics.js';

const ATMOSPHERES = ['Frescor mineral', 'Luxo clean', 'Presença noturna', 'Assinatura intensa', 'Descoberta livre', 'Elegância silenciosa', 'Atmosfera executiva', 'Aura luminosa'];

const RITUAL_LINES = ['Lendo sua atmosfera…', 'Construindo presença sensorial…', 'Inicializando memória olfativa…'];

function useReducedMotion() {
  return useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
}

export function SignUpRitualModal({ onClose, identitySeedFactory }) {
  const { signUpWithEmailPassword, isLoading, isAuthAvailable, signupDiagnostics } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [atmosphere, setAtmosphere] = useState(ATMOSPHERES[0]);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const reducedMotion = useReducedMotion();

  const next = () => setStep((s) => Math.min(4, s + 1));

  const submit = async () => {
    setStep(5);
    const metadata = identitySeedFactory({ name: name.trim(), email: email.trim(), atmosphere });
    const result = await signUpWithEmailPassword(email.trim(), password, metadata);

    if (result.error) {
      const fallback = mapSignupErrorForUx(result.error);
      const devSuffix = import.meta.env.DEV
        ? ` [phase=${result.diagnostics?.phase || 'unknown'} status=${result.diagnostics?.error?.status || 'n/a'} code=${result.diagnostics?.error?.code || 'n/a'}]`
        : '';
      setMessage(`${fallback}${devSuffix}`);
      setStep(4);
      return;
    }

    if (result.emailConfirmationRequired) {
      setMessage('Enviamos um ritual de confirmação para seu e-mail. Confirme para ativar sua presença.');
      setStep(4);
      return;
    }

    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 pb-4 pt-16 backdrop-blur-sm sm:items-center ${reducedMotion ? '' : 'transition-opacity duration-500'}`}>
      <div className="w-full max-w-2xl rounded-[1.75rem] border border-lazule-gold/30 bg-slate-950/95 p-6 shadow-2xl sm:p-8">
        <button onClick={onClose} className="ml-auto block text-xs uppercase tracking-[0.28em] text-lazule-mist/70">Fechar</button>
        {step === 1 && <div><h3 className="text-2xl text-white">Como devemos reconhecer sua presença?</h3><input className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required /><button onClick={next} disabled={!name.trim()} className="mt-6 w-full rounded-xl border border-lazule-gold/40 bg-lazule-gold/10 px-4 py-3 text-white disabled:opacity-50">Continuar</button></div>}
        {step === 2 && <div><h3 className="text-2xl text-white">Qual atmosfera deseja preservar?</h3><input type="email" className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" required /><button onClick={next} disabled={!email.includes('@')} className="mt-6 w-full rounded-xl border border-lazule-gold/40 bg-lazule-gold/10 px-4 py-3 text-white disabled:opacity-50">Continuar</button></div>}
        {step === 3 && <div><h3 className="text-2xl text-white">Sua assinatura inicial</h3><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{ATMOSPHERES.map((item) => <button key={item} onClick={() => setAtmosphere(item)} className={`rounded-lg border px-3 py-2 text-left text-sm ${atmosphere === item ? 'border-lazule-gold/55 bg-lazule-gold/20 text-white' : 'border-white/10 bg-white/5 text-lazule-mist/90'}`}>{item}</button>)}</div><button onClick={next} className="mt-6 w-full rounded-xl border border-lazule-gold/40 bg-lazule-gold/10 px-4 py-3 text-white">Continuar</button></div>}
        {step === 4 && <div><h3 className="text-2xl text-white">Sua assinatura de acesso</h3><p className="mt-2 text-sm text-lazule-mist/75">Apenas você poderá continuar esta assinatura.</p><input type="password" minLength={8} className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required /><button onClick={submit} disabled={password.length < 8 || !isAuthAvailable || isLoading} className="mt-6 w-full rounded-xl border border-lazule-gold/40 bg-lazule-gold/15 px-4 py-3 font-medium text-white disabled:opacity-50">Criar identidade</button>{message && <p className="mt-3 text-sm text-amber-100">{message}</p>}
        {import.meta.env.DEV && signupDiagnostics && (
          <pre className="mt-3 overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-lazule-mist/90">{JSON.stringify(signupDiagnostics, null, 2)}</pre>
        )}</div>}
        {step === 5 && <div><h3 className="text-2xl text-white">Ritual em progresso</h3><div className="mt-4 space-y-2">{RITUAL_LINES.map((line) => <p key={line} className="text-sm text-lazule-mist/80">{line}</p>)}</div></div>}
      </div>
    </div>
  );
}
