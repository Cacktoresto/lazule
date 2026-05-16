import { useEffect, useState } from 'react';
import { navigateSpa } from '../../utils/navigation.js';
import { useAuth } from '../../auth/useAuth.js';

function getFriendlyError(error) {
  if (!error) {
    return '';
  }

  return error.message || 'Não foi possível entrar. Confira suas credenciais e tente novamente.';
}

export function AdminLogin() {
  const { authError, authUnavailableReason, isAdmin, isAuthAvailable, isAuthenticated, isLoading, signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && isAdmin) {
      navigateSpa('/admin/analytics');
    }
  }, [isAdmin, isAuthenticated, isLoading]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Informe e-mail e senha para acessar a área administrativa.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signInWithEmailPassword(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      setFormError(getFriendlyError(error));
    }
  }

  const disabled = isSubmitting || isLoading || !isAuthAvailable;

  return (
    <section className="mx-auto flex min-h-[72vh] max-w-6xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-slate-950/78 shadow-2xl shadow-lazule-blue/20 backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden border-r border-white/10 bg-gradient-to-br from-lazule-blue/35 via-slate-950 to-lazule-night p-10 lg:block">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-lazule-gold/80 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-[0.38em] text-lazule-gold/80">LAZULE Admin</p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-white">Acesso seguro à inteligência da boutique.</h1>
          <p className="mt-5 text-sm leading-7 text-lazule-mist/72">Entre com uma conta criada no Supabase Auth. As permissões são definidas pela tabela profiles e separadas entre admin e influencer.</p>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-lazule-mist/70">
            Não há cadastro público nesta etapa. Usuários são convidados ou criados manualmente pela administração LAZULE.
          </div>
        </div>

        <div className="p-8 sm:p-10 lg:p-12">
          <a className="text-xs font-semibold uppercase tracking-[0.28em] text-lazule-gold/80 transition hover:text-lazule-gold" href="/">← Voltar para loja</a>
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">Login premium</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Área administrativa</h2>
            <p className="mt-3 text-sm leading-6 text-lazule-mist/68">Use seu e-mail e senha cadastrados no Supabase Auth para acessar o dashboard interno.</p>
          </div>

          {!isAuthAvailable ? (
            <div className="mt-8 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
              {authUnavailableReason || 'Supabase Auth não está configurado para este ambiente.'}
            </div>
          ) : null}

          {isAuthenticated && !isAdmin && !isLoading ? (
            <div className="mt-8 rounded-2xl border border-red-300/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
              Conta autenticada, mas sem permissão admin ativa.
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-lazule-mist/86">
              E-mail
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-lazule-mist/38 focus:border-lazule-gold/60 focus:ring-2 focus:ring-lazule-gold/20"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@lazulefragrances.com.br"
                disabled={disabled}
              />
            </label>
            <label className="block text-sm font-medium text-lazule-mist/86">
              Senha
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-lazule-mist/38 focus:border-lazule-gold/60 focus:ring-2 focus:ring-lazule-gold/20"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua senha segura"
                disabled={disabled}
              />
            </label>

            {formError || authError ? (
              <div className="rounded-2xl border border-red-300/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">{formError || getFriendlyError(authError)}</div>
            ) : null}

            <button
              className="w-full rounded-full bg-lazule-gold px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] text-lazule-night shadow-lg shadow-lazule-gold/20 transition hover:-translate-y-0.5 hover:bg-[#f5d77a] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
              type="submit"
              disabled={disabled}
            >
              {isSubmitting || isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
