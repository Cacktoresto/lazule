import { useEffect, useMemo, useRef, useState } from 'react';
import { createProductWhatsAppLink } from '../utils/whatsapp';
import { formatBRL } from '../utils/currency';
import { createProductPath } from '../utils/productRouting';
import { trackEvent } from '../utils/analytics';
import { getReferralContext } from '../utils/referral';
import { ProductImageFallback } from './ProductCard';
import {
  createOlfactiveAssistantAnalyticsPayload,
  getOlfactiveRecommendations,
  sanitizeOlfactiveQuery,
} from '../utils/olfactiveAssistant';

const QUICK_SUGGESTIONS = ['Noite íntima', 'Fresco mineral', 'Doce contido', 'Trabalho elegante', 'Presente memorável', 'Âmbar potente', 'Assinatura limpa'];
const DEFAULT_PROMPT = 'Ex.: algo escuro, elegante e memorável para um jantar à noite';
const LOADING_STEPS = ['Lendo atmosfera e intenção…', 'Comparando DNAs aromáticos…', 'Ajustando rastro, pele e ocasião…', 'Finalizando curadoria LAZULE…'];

function AssistantResultCard({ recommendation, result, sourcePage }) {
  const { product, reason } = recommendation;
  const productPath = createProductPath(product);
  const referralContext = getReferralContext();
  const whatsappLink = createProductWhatsAppLink(product, { referralContext });

  function trackResultClick(interactionType) {
    trackEvent('ai_assistant_result_click', createOlfactiveAssistantAnalyticsPayload(result, {
      sourcePage,
      product,
    }));

    if (interactionType === 'whatsapp') {
      trackEvent('ai_assistant_whatsapp_click', createOlfactiveAssistantAnalyticsPayload(result, {
        sourcePage,
        product,
      }));
    }
  }

  return (
    <article className="lazule-ai-card lazule-surface-premium grid w-[min(78vw,18rem)] snap-start grid-cols-[4.2rem_1fr] gap-2.5 overflow-hidden rounded-[1.45rem] border border-white/10 bg-lazule-night/70 p-3 shadow-mineral backdrop-blur-xl min-[390px]:w-[min(76vw,19rem)] min-[390px]:grid-cols-[4.8rem_1fr] sm:w-auto sm:min-w-0 sm:gap-4 sm:rounded-[1.65rem] sm:p-3.5">
      <a
        className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-lazule-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold sm:rounded-[1.15rem]"
        href={productPath}
        onClick={() => trackResultClick('product')}
        aria-label={`Ver ${product.name}`}
      >
        {product.image ? (
          <img className="absolute inset-0 h-full w-full object-cover" src={product.image} alt={`Perfume ${product.name}`} loading="lazy" decoding="async" />
        ) : (
          <ProductImageFallback label="Curadoria LAZULE" />
        )}
      </a>

      <div className="min-w-0 py-1">
        <p className="line-clamp-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold/80">{product.brand}</p>
        <a href={productPath} onClick={() => trackResultClick('product')} className="mt-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold">
          <h3 className="line-clamp-2 font-display text-[1.22rem] leading-[0.98] text-lazule-mist transition hover:text-lazule-gold sm:text-2xl">{product.name}</h3>
        </a>
        <strong className="mt-1.5 block text-[0.92rem] text-lazule-gold sm:text-base">{formatBRL(product.salePrice)}</strong>
        <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-lazule-gold/80">Por que recomendamos?</p>
        <p className="mt-1 line-clamp-2 text-[0.82rem] leading-5 text-slate-300 sm:line-clamp-3 sm:text-sm">{reason}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
          <a
            className="lazule-premium-button inline-flex min-h-9 items-center rounded-full border border-lazule-gold/35 px-2.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night sm:text-xs sm:tracking-[0.14em]"
            href={productPath}
            onClick={() => trackResultClick('product')}
          >
            Ver produto
          </a>
          <a
            className="lazule-premium-button inline-flex min-h-9 items-center rounded-full border border-lazule-gold/25 bg-white/[0.035] px-2.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:bg-lazule-gold hover:text-lazule-night sm:text-xs sm:tracking-[0.14em]"
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackResultClick('whatsapp')}
          >
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}

export function OlfactiveAssistant({ products = [], sourcePage = 'home', className = 'mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10' }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const timeoutRef = useRef(null);
  const loadingIntervalRef = useRef(null);

  const initialExamples = useMemo(() => QUICK_SUGGESTIONS.slice(0, 4).join(' · '), []);

  useEffect(() => {
    trackEvent('ai_assistant_view', { source_page: sourcePage }, { dedupeKey: `ai_assistant_view|${sourcePage}`, dedupeMs: 3000 });

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      if (loadingIntervalRef.current) {
        window.clearInterval(loadingIntervalRef.current);
      }
    };
  }, [sourcePage]);

  function runAssistant(nextQuery = query) {
    const safeQuery = sanitizeOlfactiveQuery(nextQuery);

    if (!safeQuery) {
      setResult(null);
      setQuery('');
      return;
    }

    setQuery(safeQuery);
    setIsLoading(true);
    setLoadingStepIndex(0);

    if (loadingIntervalRef.current) {
      window.clearInterval(loadingIntervalRef.current);
    }

    loadingIntervalRef.current = window.setInterval(() => {
      setLoadingStepIndex((current) => (current + 1) % LOADING_STEPS.length);
    }, 260);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      const nextResult = getOlfactiveRecommendations(safeQuery, products, { limit: 6 });
      setResult(nextResult);
      setIsLoading(false);
      if (loadingIntervalRef.current) {
        window.clearInterval(loadingIntervalRef.current);
      }
      trackEvent('ai_assistant_query', createOlfactiveAssistantAnalyticsPayload(nextResult, {
        query: safeQuery,
        sourcePage,
      }));
    }, 680);
  }

  function handleSubmit(event) {
    event.preventDefault();
    runAssistant();
  }

  function handleSuggestionClick(suggestion) {
    setQuery(suggestion);
    runAssistant(suggestion);
  }

  const recommendations = result?.recommendations ?? [];
  const hasRecommendations = recommendations.length > 0;

  return (
    <section className={className} aria-labelledby="olfactive-assistant-title">
      <div className="lazule-ai-concierge lazule-surface-premium relative overflow-hidden rounded-[1.55rem] border border-lazule-gold/20 bg-[radial-gradient(circle_at_18%_0%,rgba(200,162,77,0.13),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,58,138,0.38)_48%,rgba(5,8,22,0.95))] p-3.5 shadow-[0_30px_110px_rgba(2,6,23,0.32)] backdrop-blur-xl min-[390px]:rounded-[1.85rem] min-[390px]:p-4 sm:rounded-[2.7rem] sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.055),transparent)] opacity-40" />
        <div className="lazule-ai-orb absolute -right-16 -top-16 h-36 w-36 rounded-full border border-lazule-gold/20 bg-lazule-gold/10 opacity-35 blur-[0.2px] sm:-right-14 sm:-top-14 sm:h-44 sm:w-44 sm:opacity-60" aria-hidden="true" />
        <div className="relative grid gap-4 sm:gap-5 lg:grid-cols-[0.78fr_1fr] lg:items-start">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold/90 sm:text-[0.66rem] sm:tracking-[0.36em]">Concierge olfativo AI</p>
            <h2 id="olfactive-assistant-title" className="mt-3 max-w-[12ch] font-display text-[clamp(1.95rem,9.5vw,2.45rem)] leading-[0.9] tracking-[-0.035em] text-lazule-mist sm:mt-4 sm:max-w-[10ch] sm:text-5xl">Inteligência com tato.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:mt-5">Descreva clima, pele, ocasião ou referência. A LAZULE interpreta intenção e devolve uma curadoria explicável, calma e precisa.</p>

            <form className="mt-4 space-y-3.5 sm:mt-5" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="olfactive-query">Descreva o perfume ideal</label>
              <textarea
                id="olfactive-query"
                className="lazule-input-premium min-h-24 w-full resize-none rounded-[1.2rem] border border-white/10 bg-lazule-night/70 px-3.5 py-3.5 text-[0.95rem] leading-6 text-lazule-mist outline-none transition placeholder:text-slate-500 hover:border-lazule-gold/30 focus:border-lazule-gold/70 focus:ring-2 focus:ring-lazule-gold/25 sm:min-h-32 sm:rounded-[1.55rem] sm:px-5 sm:py-5 sm:text-base sm:leading-7"
                value={query}
                maxLength={180}
                placeholder={DEFAULT_PROMPT}
                onChange={(event) => setQuery(event.target.value)}
              />

              <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" aria-label="Sugestões rápidas">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="lazule-premium-button min-h-9 shrink-0 snap-start rounded-full border border-lazule-gold/25 bg-lazule-gold/10 px-3 py-1.5 text-[0.82rem] font-semibold text-lazule-gold transition hover:border-lazule-gold/70 hover:bg-lazule-gold hover:text-lazule-night focus:outline-none focus:ring-2 focus:ring-lazule-gold sm:px-4 sm:py-2.5"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="lazule-premium-button lazule-cta-shimmer inline-flex min-h-11 w-full items-center justify-center rounded-full bg-lazule-gold px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-lazule-night shadow-aureate transition disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-6 sm:tracking-[0.18em]"
                disabled={isLoading}
              >
                <span className="relative z-10">{isLoading ? 'Interpretando atmosfera…' : 'Receber curadoria'}</span>
              </button>
            </form>
          </div>

          <div className="lazule-ai-stage relative min-w-0 overflow-hidden rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-3.5 sm:rounded-[1.9rem] sm:p-6" aria-live="polite">
            {!result && !isLoading ? (
              <div className="flex min-h-[9.5rem] flex-col justify-center text-center sm:min-h-[14rem] sm:text-left">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Comece pela sensação</p>
                <h3 className="mt-3 font-display text-[clamp(1.85rem,8vw,2.25rem)] leading-tight tracking-[-0.03em] text-lazule-mist sm:text-3xl">Diga atmosfera, intensidade ou memória.</h3>
                <p className="mt-4 text-sm leading-6 text-slate-300">Experimente: {initialExamples}. A curadoria é privada, rápida e orientada por sinais olfativos — sem expor dados pessoais.</p>
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex min-h-[9.5rem] items-center justify-center text-center sm:min-h-[14rem]" role="status" aria-live="polite">
                <div>
                  <span className="lazule-ai-orb mx-auto block h-16 w-16 rounded-full border border-lazule-gold/45 bg-lazule-gold/10 shadow-aureate" aria-hidden="true" />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-lazule-gold sm:text-sm sm:tracking-[0.24em]">{LOADING_STEPS[loadingStepIndex]}</p><p className="mt-3 text-xs leading-5 text-slate-300">Ajustando presença, ocasião e assinatura para uma recomendação mais precisa.</p>
                </div>
              </div>
            ) : null}

            {result && !isLoading ? (
              <div className="lazule-result-reveal">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" style={{ '--result-delay': '0ms' }}>
                  <div>
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Resultado</p>
                    <h3 className="mt-2 font-display text-[clamp(1.85rem,8vw,2.25rem)] leading-tight tracking-[-0.03em] text-lazule-mist sm:text-3xl">{hasRecommendations ? 'Sua curadoria inteligente' : 'Curadoria em ajuste'}</h3>
                  </div>
                  {result.detectedIntents?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {result.detectedIntents.slice(0, 3).map((intent) => (
                        <span key={intent} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">{intent}</span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {result.fallbackUsed ? (
                  <p className="mb-4 rounded-2xl border border-lazule-gold/20 bg-lazule-gold/10 px-4 py-3 text-sm leading-6 text-slate-200">
                    A leitura não encontrou uma combinação absoluta; refinamos alternativas versáteis com melhor aderência ao seu briefing.
                  </p>
                ) : null}

                <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible" style={{ '--result-delay': '90ms' }}>
                  {recommendations.map((recommendation) => (
                    <AssistantResultCard
                      key={recommendation.product.id ?? recommendation.product.productSlug ?? recommendation.product.name}
                      recommendation={recommendation}
                      result={result}
                      sourcePage={sourcePage}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
