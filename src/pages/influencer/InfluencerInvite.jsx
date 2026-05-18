import { useEffect, useMemo, useState } from 'react';
import { supabaseAuthClient } from '../../services/supabaseAuthClient.js';
import { useAuth } from '../../auth/useAuth.js';
import { navigateSpa } from '../../utils/navigation.js';
import { trackInfluencerInviteOpened, trackInfluencerSignupCompleted } from '../../utils/analytics.js';
import { isPartnerInviteAcceptable, isSafeInviteToken, normalizePartnerInvite, PARTNER_INVITE_STATUS } from '../../utils/partnerInvites.js';

const isDevEnvironment = import.meta.env.DEV;

function getFriendlyInviteError(status) {
  if (status === PARTNER_INVITE_STATUS.EXPIRED) {
    return 'Este convite expirou. Solicite um novo acesso ao time LAZULE.';
  }

  if (status === PARTNER_INVITE_STATUS.ACCEPTED) {
    return 'Este convite já foi utilizado. Entre pelo Portal do parceiro para acessar seu painel.';
  }

  return 'Este convite não está disponível. Confira o link recebido ou solicite um novo convite.';
}

function InviteState({ eyebrow = 'Creators LAZULE', title, description, action }) {
  return (
    <section className="mx-auto flex min-h-[62vh] max-w-4xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="lazule-surface-premium relative w-full overflow-hidden rounded-[2rem] border border-lazule-gold/25 bg-slate-950/78 p-8 text-center shadow-2xl shadow-lazule-blue/20 backdrop-blur sm:p-12">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-lazule-gold/70 to-transparent" />
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-lazule-mist/74 sm:text-base">{description}</p>
        {action ? <div className="mt-8">{action}</div> : null}
      </div>
    </section>
  );
}

export function InfluencerInvite({ token }) {
  const { refreshSession } = useAuth();
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState(PARTNER_INVITE_STATUS.PENDING);
  const [loadError, setLoadError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedToken = useMemo(() => String(token || '').trim(), [token]);

  useEffect(() => {
    let isMounted = true;

    async function loadInvite() {
      if (!isSafeInviteToken(normalizedToken) || !supabaseAuthClient.isConfigured) {
        setStatus(PARTNER_INVITE_STATUS.INVALID);
        setLoadError('Convite temporariamente indisponível. Solicite um novo acesso ao time LAZULE.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabaseAuthClient.getPartnerInvite(normalizedToken);

      if (!isMounted) return;

      if (error || !data) {
        setStatus(PARTNER_INVITE_STATUS.INVALID);
        setLoadError(isDevEnvironment && error?.message ? error.message : 'Convite não encontrado ou temporariamente indisponível. Solicite um novo acesso ao time LAZULE.');
      } else {
        const normalizedInvite = normalizePartnerInvite(Array.isArray(data) ? data[0] : data);
        setInvite(normalizedInvite);
        setStatus(normalizedInvite.status);

        if (isPartnerInviteAcceptable(normalizedInvite)) {
          trackInfluencerInviteOpened({ invite_id: normalizedInvite.id, has_ref: Boolean(normalizedInvite.influencer_ref), has_coupon: Boolean(normalizedInvite.coupon_code) });
        }
      }

      setIsLoading(false);
    }

    loadInvite();

    return () => {
      isMounted = false;
    };
  }, [normalizedToken]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!isPartnerInviteAcceptable(invite)) {
      setFormError(getFriendlyInviteError(status));
      return;
    }

    if (password.length < 8) {
      setFormError('Crie uma senha com pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas não conferem.');
      return;
    }

    setIsSubmitting(true);
    const signupResult = await supabaseAuthClient.auth.signUp({
      email: invite.email,
      password,
      options: {
        data: {
          invite_token: normalizedToken,
          role: 'influencer',
        },
      },
    });

    if (signupResult.error) {
      setIsSubmitting(false);
      setFormError(isDevEnvironment && signupResult.error.message ? signupResult.error.message : 'Não foi possível criar seu acesso agora. Confira os dados e tente novamente com calma.');
      return;
    }

    const session = signupResult.data.session || (await supabaseAuthClient.auth.getSession()).data.session;

    if (!session?.access_token) {
      setIsSubmitting(false);
      setFormError('Conta criada, mas o login automático não foi liberado. Confirme seu e-mail e entre pelo Portal do parceiro.');
      return;
    }

    const acceptResult = await supabaseAuthClient.acceptPartnerInvite(session, normalizedToken);
    setIsSubmitting(false);

    if (acceptResult.error) {
      setFormError(isDevEnvironment && acceptResult.error.message ? acceptResult.error.message : 'Não foi possível finalizar o convite agora. Seu acesso permanece protegido; tente novamente em instantes.');
      return;
    }

    trackInfluencerSignupCompleted({ invite_id: invite.id, has_ref: Boolean(invite.influencer_ref), has_coupon: Boolean(invite.coupon_code) });
    await refreshSession();
    navigateSpa('/influencer');
  }

  if (isLoading) {
    return <InviteState title="Preparando seu convite" description="Estamos validando seu acesso privado e preparando uma entrada segura no programa de parceiros LAZULE." />;
  }

  if (!isPartnerInviteAcceptable(invite)) {
    return (
      <InviteState
        eyebrow="Acesso exclusivo"
        title="Convite indisponível"
        description={loadError || getFriendlyInviteError(status)}
        action={<a className="lazule-pressable inline-flex rounded-full border border-lazule-gold/40 px-5 py-3 text-sm font-semibold text-lazule-gold transition hover:bg-lazule-gold/10" href="/influencer/login">Ir para login</a>}
      />
    );
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
      <aside className="lazule-surface-premium relative overflow-hidden rounded-[2.5rem] border border-lazule-gold/20 bg-gradient-to-br from-lazule-blue/35 via-slate-950 to-lazule-night p-8 shadow-2xl shadow-lazule-blue/20 lg:p-10">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-lazule-gold/80 to-transparent" />
        <p className="text-xs font-semibold uppercase tracking-[0.38em] text-lazule-gold/80">Programa de creators</p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight text-white lg:text-5xl">Seu acesso ao círculo de parceiros LAZULE está pronto.</h1>
        <p className="mt-5 text-sm leading-7 text-lazule-mist/72">Finalize sua senha para abrir um painel privado com links, cupom e sinais de performance — uma experiência pensada como extensão da boutique.</p>
        <div className="mt-8 grid gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><span className="block text-lazule-mist/50">E-mail convidado</span><strong className="text-white">{invite.email}</strong></div>
          {invite.influencer_ref ? <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><span className="block text-lazule-mist/50">Referência</span><strong className="text-white">@{invite.influencer_ref}</strong></div> : null}
          {invite.coupon_code ? <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><span className="block text-lazule-mist/50">Cupom</span><strong className="text-white">{invite.coupon_code}</strong></div> : null}
        </div>
      </aside>

      <div className="lazule-surface-premium rounded-[2rem] border border-lazule-gold/20 bg-slate-950/78 p-6 shadow-2xl shadow-lazule-blue/20 backdrop-blur sm:p-8 lg:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-lazule-gold/80">Onboarding premium</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">Defina sua chave de acesso</h2>
        <p className="mt-3 text-sm leading-6 text-lazule-mist/68">Seu e-mail já veio do convite. A senha apenas protege seu acesso ao atelier de parceiro LAZULE.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-lazule-mist/86">Senha
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-lazule-mist/38 hover:border-lazule-gold/30 focus:border-lazule-gold/60 focus:ring-2 focus:ring-lazule-gold/20" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} />
          </label>
          <label className="block text-sm font-medium text-lazule-mist/86">Confirmar senha
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-lazule-mist/38 hover:border-lazule-gold/30 focus:border-lazule-gold/60 focus:ring-2 focus:ring-lazule-gold/20" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isSubmitting} />
          </label>
          {formError ? <div className="rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100/85">{formError}</div> : null}
          <button className="lazule-premium-button lazule-cta-shimmer w-full rounded-full bg-lazule-gold px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] text-lazule-night shadow-lg shadow-lazule-gold/20 transition disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Abrindo atelier…' : 'Finalizar cadastro'}</button>
        </form>
      </div>
    </section>
  );
}
