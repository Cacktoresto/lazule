import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/useAuth.js';
import { supabaseAuthClient } from '../../services/supabaseAuthClient.js';
import { getAnalyticsEvents, aggregateInfluencerMetrics, normalizeInfluencerProfile } from '../../utils/analyticsDashboard.js';
import { isInfluencerRole } from '../../auth/roles.js';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatPercent(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
}

function getOrigin() {
  if (typeof window === 'undefined') {
    return 'https://lazulefragrances.com.br';
  }

  return window.location.origin;
}

function buildUrl(path) {
  return `${getOrigin()}${path}`;
}

function getProfileName(profile, user) {
  return profile?.full_name || profile?.name || profile?.display_name || user?.user_metadata?.full_name || user?.email || 'Influencer LAZULE';
}

function getProfileEmail(profile, user) {
  return profile?.email || user?.email || 'E-mail não disponível';
}

function CopyButton({ value, children }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;

    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="rounded-full border border-lazule-gold/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-lazule-gold transition hover:bg-lazule-gold/10 disabled:cursor-not-allowed disabled:opacity-45"
      type="button"
      onClick={handleCopy}
      disabled={!value}
    >
      {copied ? 'Copiado' : children}
    </button>
  );
}


function CodeSummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <span className="block text-[0.65rem] uppercase tracking-[0.24em] text-lazule-gold/75">{label}</span>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <strong className="break-all text-white">{value || '—'}</strong>
        {value ? <CopyButton value={value}>Copiar código</CopyButton> : null}
      </div>
    </div>
  );
}

function LinkCard({ label, value, href }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-5 shadow-mineral backdrop-blur">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold/85">{label}</p>
      {value ? (
        <>
          <a className="mt-3 block break-all font-display text-xl font-semibold text-white transition hover:text-lazule-gold" href={href}>{href}</a>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyButton value={href}>Copiar link</CopyButton>
            <a className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-lazule-mist/80 transition hover:border-lazule-gold/35 hover:text-lazule-gold" href={href}>Abrir</a>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-lazule-mist/62">Ainda não há código configurado para gerar este link.</p>
      )}
    </article>
  );
}

function MetricCard({ label, value, helper, tone = 'default' }) {
  const toneClasses = tone === 'gold' ? 'border-lazule-gold/35 bg-lazule-gold/10 text-lazule-gold' : 'border-white/10 bg-white/[0.055] text-lazule-mist';

  return (
    <article className={`rounded-[1.5rem] border p-5 shadow-mineral backdrop-blur ${toneClasses}`}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold/85">{label}</p>
      <strong className="mt-3 block font-display text-3xl font-semibold text-inherit">{value}</strong>
      {helper ? <span className="mt-2 block text-xs leading-5 text-lazule-mist/62">{helper}</span> : null}
    </article>
  );
}

function EmptyCodesState() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-lazule-gold/35 bg-lazule-night/55 p-6 text-center">
      <p className="font-display text-xl text-lazule-mist">Links ainda não configurados.</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-lazule-mist/68">
        Este perfil precisa de influencer_ref ou coupon_code em profiles para liberar links rastreáveis. Nenhum dado pessoal de clientes é exibido ou coletado neste painel.
      </p>
    </div>
  );
}

function InfluencerPanel({ profile, user, events, isAdminView = false }) {
  const normalized = normalizeInfluencerProfile(profile);
  const metrics = useMemo(() => aggregateInfluencerMetrics(events, normalized), [events, normalized.coupon_code, normalized.influencer_ref]);
  const name = getProfileName(profile, user);
  const email = getProfileEmail(profile, user);
  const refLink = normalized.influencer_ref ? buildUrl(`/i/${encodeURIComponent(normalized.influencer_ref)}`) : '';
  const couponLink = normalized.coupon_code ? buildUrl(`/promo/${encodeURIComponent(normalized.coupon_code)}`) : '';
  const hasCodes = Boolean(normalized.influencer_ref || normalized.coupon_code);

  return (
    <section className="rounded-[2rem] border border-lazule-gold/20 bg-slate-950/72 p-6 shadow-2xl shadow-lazule-blue/15 backdrop-blur sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">{isAdminView ? 'Visão admin' : 'Meu painel'}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white">{name}</h2>
          <p className="mt-2 text-sm text-lazule-mist/62">{email}</p>
        </div>
        <div className="grid gap-3 text-sm text-lazule-mist/75 sm:grid-cols-2 lg:min-w-[24rem]">
          <CodeSummaryCard label="influencer_ref" value={normalized.influencer_ref} />
          <CodeSummaryCard label="coupon_code" value={normalized.coupon_code} />
        </div>
      </div>

      {!hasCodes ? <div className="mt-6"><EmptyCodesState /></div> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <LinkCard label="Link de divulgação" value={normalized.influencer_ref} href={refLink} />
        <LinkCard label="Link de cupom" value={normalized.coupon_code} href={couponLink} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Eventos atribuídos" value={formatNumber(metrics.attributedEvents)} helper="Sinais locais com ref ou cupom deste perfil." tone="gold" />
        <MetricCard label="Visitas aos links" value={formatNumber(metrics.referralVisits)} helper="Rotas /i, /promo e aplicação de referência." />
        <MetricCard label="Produtos vistos" value={formatNumber(metrics.productViews)} helper="Somente eventos agregados, sem clientes identificáveis." />
        <MetricCard label="Cliques WhatsApp" value={formatNumber(metrics.whatsappClicks)} helper={`${formatPercent(metrics.productToWhatsappRate)} de conversão produto → WhatsApp.`} />
      </div>
    </section>
  );
}

function AdminInfluencersOverview({ events }) {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isMounted = true;

    async function loadInfluencers() {
      if (!session || typeof supabaseAuthClient.selectInfluencerProfiles !== 'function') {
        setStatus('unavailable');
        return;
      }

      setStatus('loading');
      const { profiles: nextProfiles, error } = await supabaseAuthClient.selectInfluencerProfiles(session);

      if (!isMounted) return;
      setProfiles(nextProfiles || []);
      setStatus(error ? 'error' : 'ready');
    }

    loadInfluencers();

    return () => {
      isMounted = false;
    };
  }, [session]);

  return (
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">Admin</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">Influencers cadastrados</h2>
        </div>
        <p className="text-sm text-lazule-mist/62">Visão geral simples baseada em profiles com role influencer.</p>
      </div>

      {status === 'loading' ? <p className="mt-6 text-sm text-lazule-mist/65">Carregando influencers...</p> : null}
      {status === 'error' || status === 'unavailable' ? <p className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">Não foi possível carregar a lista de influencers neste ambiente.</p> : null}
      {status === 'ready' && profiles.length === 0 ? <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-lazule-mist/68">Nenhum profile influencer encontrado.</p> : null}

      {profiles.length ? (
        <div className="mt-6 grid gap-4">
          {profiles.map((profile) => {
            const normalized = normalizeInfluencerProfile(profile);
            const metrics = aggregateInfluencerMetrics(events, normalized);
            return (
              <article key={profile.id || `${normalized.influencer_ref}-${normalized.coupon_code}`} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-950/55 p-4 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:items-center">
                <div>
                  <strong className="block text-white">{getProfileName(profile)}</strong>
                  <span className="mt-1 block text-xs text-lazule-mist/55">{profile.email || 'E-mail não exibido'}</span>
                </div>
                <span className="text-sm text-lazule-mist/75">Ref: <strong className="text-white">{normalized.influencer_ref || '—'}</strong></span>
                <span className="text-sm text-lazule-mist/75">Cupom: <strong className="text-white">{normalized.coupon_code || '—'}</strong></span>
                <span className="text-sm text-lazule-mist/75">Eventos: <strong className="text-lazule-gold">{formatNumber(metrics.attributedEvents)}</strong></span>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function InfluencerDashboard() {
  const { isAdmin, profile, signOut, user } = useAuth();
  const events = useMemo(() => getAnalyticsEvents(), []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold/80">Influencers LAZULE</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">Dashboard do parceiro</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-lazule-mist/68">Acompanhe métricas, links de divulgação e cupom em um painel pós-login. Não coletamos nome, telefone, endereço ou dados pessoais de clientes.</p>
        </div>
        <button className="self-start rounded-full border border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.22em] text-lazule-mist/80 transition hover:border-lazule-gold/40 hover:text-lazule-gold" type="button" onClick={signOut}>Sair</button>
      </div>

      <InfluencerPanel profile={profile} user={user} events={events} />
      {isAdmin ? <AdminInfluencersOverview events={events} /> : null}
    </div>
  );
}
