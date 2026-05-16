import { useEffect } from 'react';
import { navigateSpa } from '../utils/navigation.js';
import { useAuth } from './useAuth.js';

const isDevEnvironment = import.meta.env.DEV;

function getAuthUnavailableDescription(authUnavailableReason, fallback) {
  if (isDevEnvironment) {
    return authUnavailableReason || fallback;
  }

  return 'Portal temporariamente indisponível.';
}

function PremiumGateState({ eyebrow, title, description, action }) {
  return (
    <section className="mx-auto flex min-h-[62vh] max-w-4xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-lazule-gold/25 bg-slate-950/78 p-8 text-center shadow-2xl shadow-lazule-blue/20 backdrop-blur sm:p-12">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-lazule-gold/70 to-transparent" />
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-lazule-mist/74 sm:text-base">{description}</p>
        {action ? <div className="mt-8">{action}</div> : null}
      </div>
    </section>
  );
}

export function RequireInfluencerOrAdmin({ children }) {
  const { authUnavailableReason, isAdmin, isAuthAvailable, isAuthenticated, isInfluencer, isLoading } = useAuth();
  const canAccess = isAdmin || isInfluencer;

  useEffect(() => {
    if (!isLoading && isAuthAvailable && !isAuthenticated) {
      navigateSpa('/influencer/login');
    }
  }, [isAuthAvailable, isAuthenticated, isLoading]);

  if (!isAuthAvailable) {
    return (
      <PremiumGateState
        eyebrow="Configuração segura"
        title="Autenticação indisponível"
        description={getAuthUnavailableDescription(
          authUnavailableReason,
          'Configure as variáveis públicas do Supabase para habilitar o acesso de influencers.',
        )}
      />
    );
  }

  if (isLoading) {
    return <PremiumGateState eyebrow="Influencers LAZULE" title="Validando acesso" description="Conferindo sua sessão e role antes de abrir o painel." />;
  }

  if (!isAuthenticated) {
    return <PremiumGateState eyebrow="Influencers LAZULE" title="Redirecionando" description="Você precisa entrar para acessar a área de influencers." />;
  }

  if (!canAccess) {
    return (
      <PremiumGateState
        eyebrow="Acesso restrito"
        title="Role influencer ou admin necessária"
        description="Sua conta está autenticada, mas não possui uma role ativa para visualizar este painel. Solicite a liberação à administração LAZULE."
        action={<a className="inline-flex rounded-full border border-lazule-gold/40 px-5 py-3 text-sm font-semibold text-lazule-gold transition hover:bg-lazule-gold/10" href="/">Voltar para a loja</a>}
      />
    );
  }

  return children;
}
