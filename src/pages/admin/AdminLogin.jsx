import { useEffect, useState } from 'react';
import { navigateSpa } from '../../utils/navigation.js';
import { useAuth } from '../../auth/useAuth.js';

const isDevEnvironment = import.meta.env.DEV;

function getFriendlyError(error) {
  if (!error) {
    return '';
  }

  return error.message || 'Não foi possível entrar. Confira suas credenciais e tente novamente.';
}

function getUnavailableMessage(authUnavailableReason) {
  if (isDevEnvironment) {
    return authUnavailableReason || 'Supabase Auth não está configurado para este ambiente.';
  }

  return 'Portal temporariamente indisponível.';
}

export function AdminLogin({ experience = 'admin' }) {
  const { authError, authUnavailableReason, isAdmin, isAuthAvailable, isAuthenticated, isInfluencer, isLoading, signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPartnerExperience = experience === 'partner';

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    if (isAdmin) {
      navigateSpa('/admin/analytics');
    } else if (isInfluencer) {
      navigateSpa('/influencer');
    }
  }, [isAdmin, isAuthenticated, isInfluencer, isLoading]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError(isPartnerExperience ? 'Informe e-mail e senha para acessar o Portal do parceiro.' : 'Informe e-mail e senha para acessar a área administrativa.');
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
  const eyebrow = isPartnerExperience ? 'Parceiros LAZULE' : 'LAZULE Admin';
  const title = isPartnerExperience ? 'Portal do parceiro' : 'Área administrativa';
  const subtitle = isPartnerExperience ? 'Entre com seu e-mail e senha para acessar seu painel LAZULE.' : 'Use seu e-mail e senha cadastrados no Supabase Auth para acessar o dashboard interno.';
  const sideTitle = 'Acesso seguro à inteligência da boutique.';
  const sideDescription = 'Entre com uma conta criada no Supabase Auth. As permissões são definidas pela tabela profiles e separadas entre admin e influencer.';
  const sideNotice = 'Não há cadastro público nesta etapa. Usuários são convidados ou criados manualmente pela administração LAZULE.';

  return (
    <section className={`mx-auto flex min-h-[calc(100svh-9rem)] items-start justify-center px-4 pb-10 pt-6 sm:min-h-[72vh] sm:px-6 sm:py-12 lg:px-8 ${isPartnerExperience ? 'max-w-xl lg:py-14' : 'max-w-6xl lg:py-16'}`}>
      <div className={`grid w-full overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-slate-950/78 shadow-2xl shadow-lazule-blue/20 backdrop-blur ${isPartnerExperience ? '' : 'lg:grid-cols-[0.95fr_1.05fr]'}`}>
        {!isPartnerExperience ? (
          <div className="relative hidden border-r border-white/10 bg-gradient-to-br from-lazule-blue/35 via-slate-950 to-lazule-night p-10 lg:block">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-lazule-gold/80 to-transparent" />
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-lazule-gold/80">{eyebrow}</p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white">{sideTitle}</h1>
            <p className="mt-5 text-sm leading-7 text-lazule-mist/72">{sideDescription}</p>
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-lazule-mist/70">
              {sideNotice}
            </div>
          </div>
        ) : null}

        <div className={isPartnerExperience ? 'p-6 sm:p-8' : 'p-8 sm:p-10 lg:p-12'}>
          <a className="text-xs font-semibold uppercase tracking-[0.28em] text-lazule-gold/80 transition hover:text-lazule-gold" href="/">← Voltar para loja</a>
          <div className="mt-6 sm:mt-8">
            {!isPartnerExperience ? <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">Login premium</p> : null}
            <h2 className={`${isPartnerExperience ? '' : 'mt-3'} text-3xl font-semibold tracking-tight text-white sm:text-4xl`}>{title}</h2>
            <p className="mt-3 text-sm leading-6 text-lazule-mist/68">{subtitle}</p>
          </div>

          {!isAuthAvailable ? (
            <div className="mt-6 rounded-2xl border border-lazule-gold/15 bg-white/[0.035] p-4 text-sm leading-6 text-lazule-mist/70">
              {getUnavailableMessage(authUnavailableReason)}
            </div>
          ) : null}

          {isAuthenticated && !isAdmin && !isInfluencer && !isLoading ? (
            <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100/85">
              Conta autenticada, mas sem permissão ativa para este portal.
            </div>
          ) : null}

          <form className="mt-6 space-y-4 sm:mt-8 sm:space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-lazule-mist/86">
              E-mail
              <input
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-lazule-mist/38 focus:border-lazule-gold/60 focus:ring-2 focus:ring-lazule-gold/20"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={isPartnerExperience ? 'parceiro@exemplo.com' : 'admin@lazulefragrances.com.br'}
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

            {formError || (isAuthAvailable && authError) ? (
              <div className="rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100/85">{formError || getFriendlyError(authError)}</div>
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
