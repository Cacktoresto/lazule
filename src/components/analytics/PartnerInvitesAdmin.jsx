import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/useAuth.js';
import { supabaseAuthClient } from '../../services/supabaseAuthClient.js';
import { trackInfluencerInviteCreated } from '../../utils/analytics.js';
import { buildPartnerInviteLink, createPartnerInvitePayload, getPartnerInviteStatus, PARTNER_INVITE_STATUS } from '../../utils/partnerInvites.js';
import { MetricCard } from './MetricCard.jsx';

function getOrigin() {
  if (typeof window === 'undefined') {
    return 'https://lazulefragrances.com.br';
  }

  return window.location.origin;
}

function CopyInviteLink({ token }) {
  const [copied, setCopied] = useState(false);
  const link = buildPartnerInviteLink(token, getOrigin());

  async function handleCopy() {
    if (!link) return;

    try {
      await navigator.clipboard?.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="rounded-full border border-lazule-gold/35 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-lazule-gold transition hover:bg-lazule-gold/10 disabled:opacity-40" type="button" onClick={handleCopy} disabled={!link}>
      {copied ? 'Copiado' : 'Copiar link'}
    </button>
  );
}

function statusLabel(status) {
  return {
    [PARTNER_INVITE_STATUS.PENDING]: 'Pendente',
    [PARTNER_INVITE_STATUS.ACCEPTED]: 'Aceito',
    [PARTNER_INVITE_STATUS.EXPIRED]: 'Expirado',
    [PARTNER_INVITE_STATUS.INACTIVE]: 'Inativo',
    [PARTNER_INVITE_STATUS.INVALID]: 'Inválido',
  }[status] || 'Pendente';
}

export function PartnerInvitesAdmin() {
  const { session } = useAuth();
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [influencerRef, setInfluencerRef] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  async function refreshInvites() {
    if (!session?.access_token || !supabaseAuthClient.isConfigured) return;

    setIsLoading(true);
    const { invites: rows, error: loadError } = await supabaseAuthClient.selectPartnerInvites(session);
    setIsLoading(false);

    if (loadError) {
      setError(loadError.message || 'Não foi possível carregar convites.');
    } else {
      setError('');
      setInvites(rows);
    }
  }

  useEffect(() => {
    refreshInvites();
  }, [session?.access_token]);

  const summary = useMemo(() => invites.reduce((accumulator, invite) => {
    const status = getPartnerInviteStatus(invite);
    if (status === PARTNER_INVITE_STATUS.ACCEPTED) accumulator.accepted += 1;
    else if (status === PARTNER_INVITE_STATUS.EXPIRED) accumulator.expired += 1;
    else accumulator.pending += 1;
    return accumulator;
  }, { pending: 0, accepted: 0, expired: 0 }), [invites]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setFeedback('');

    const payload = createPartnerInvitePayload({ email, influencerRef, couponCode });

    if (!payload.email || !payload.influencer_ref) {
      setError('Informe pelo menos e-mail e referência da parceira.');
      return;
    }

    setIsCreating(true);
    const { data, error: createError } = await supabaseAuthClient.createPartnerInvite(session, payload);
    setIsCreating(false);

    if (createError) {
      setError(createError.message || 'Não foi possível criar o convite.');
      return;
    }

    const createdInvite = Array.isArray(data) ? data[0] : data;
    setFeedback(`Convite criado. Link: ${buildPartnerInviteLink(createdInvite?.token, getOrigin())}`);
    trackInfluencerInviteCreated({ invite_id: createdInvite?.id, has_ref: Boolean(createdInvite?.influencer_ref), has_coupon: Boolean(createdInvite?.coupon_code) });
    setEmail('');
    setInfluencerRef('');
    setCouponCode('');
    await refreshInvites();
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-lazule-gold/20 bg-slate-950/72 p-6 shadow-mineral backdrop-blur sm:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-lazule-gold/80">Onboarding controlado</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Convites de parceiros</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-lazule-mist/68">Gere links privados para creators sem abrir cadastro público. A role é sempre influencer e o token expira/uso único no Supabase.</p>
        </div>
        <button className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-lazule-mist/80 transition hover:bg-white/10" type="button" onClick={refreshInvites} disabled={isLoading}>Atualizar</button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Pendentes" value={summary.pending} helper="Aguardam aceite." />
        <MetricCard label="Aceitos" value={summary.accepted} helper="Onboarding concluído." tone="gold" />
        <MetricCard label="Expirados" value={summary.expired} helper="Precisam reemissão." />
      </div>

      <form className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.9fr_0.8fr_auto]" onSubmit={handleSubmit}>
        <input className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-lazule-mist/38 focus:border-lazule-gold/60" type="email" placeholder="email@creator.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isCreating} />
        <input className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-lazule-mist/38 focus:border-lazule-gold/60" placeholder="ref da creator" value={influencerRef} onChange={(event) => setInfluencerRef(event.target.value)} disabled={isCreating} />
        <input className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none placeholder:text-lazule-mist/38 focus:border-lazule-gold/60" placeholder="cupom" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} disabled={isCreating} />
        <button className="rounded-full bg-lazule-gold px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-lazule-night transition hover:bg-[#f5d77a] disabled:opacity-50" type="submit" disabled={isCreating}>{isCreating ? 'Gerando...' : 'Gerar convite'}</button>
      </form>

      {error ? <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100/85">{error}</div> : null}
      {feedback ? <div className="mt-4 break-all rounded-2xl border border-lazule-gold/20 bg-lazule-gold/10 p-4 text-sm text-lazule-gold/90">{feedback}</div> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_auto] gap-3 bg-white/[0.05] px-4 py-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-lazule-mist/50">
          <span>E-mail</span><span>Ref</span><span>Cupom</span><span>Status</span><span>Link</span>
        </div>
        {invites.slice(0, 8).map((invite) => {
          const currentStatus = getPartnerInviteStatus(invite);
          return (
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_auto] gap-3 border-t border-white/10 px-4 py-3 text-sm text-lazule-mist/74" key={invite.id}>
              <span className="break-all">{invite.email}</span><span>{invite.influencer_ref || '—'}</span><span>{invite.coupon_code || '—'}</span><span>{statusLabel(currentStatus)}</span><CopyInviteLink token={invite.token} />
            </div>
          );
        })}
        {!invites.length ? <div className="border-t border-white/10 px-4 py-8 text-center text-sm text-lazule-mist/55">Nenhum convite encontrado ainda.</div> : null}
      </div>
    </section>
  );
}
