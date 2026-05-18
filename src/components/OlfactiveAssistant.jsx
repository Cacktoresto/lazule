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

const QUICK_SUGGESTIONS = ['Noite', 'Fresco', 'Doce', 'Trabalho', 'Presente', 'Árabe potente', 'Elegante'];
const DEFAULT_PROMPT = 'Ex.: algo doce, forte e sedutor para usar à noite';
const LOADING_STEPS = ['Analisando perfil olfativo…', 'Comparando DNAs aromáticos…', 'Refinando curadoria LAZULE…', 'Selecionando rastro, ocasião e presença…'];

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
    <article className="lazule-ai-card grid min-w-[17.5rem] snap-start grid-cols-[5.5rem_1fr] gap-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-lazule-night/70 p-3 shadow-mineral backdrop-blur sm:min-w-0">
      <a
        className="relative aspect-[4/5] overflow-hidden rounded-[1.15rem] bg-lazule-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold"
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
          <h3 className="line-clamp-2 font-display text-2xl leading-[0.98] text-lazule-mist transition hover:text-lazule-gold">{product.name}</h3>
        </a>
        <strong className="mt-2 block text-base text-lazule-gold">{formatBRL(product.salePrice)}</strong>
        <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-lazule-gold/80">Por que recomendamos?</p>
        <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-300">{reason}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className="lazule-pressable rounded-full border border-lazule-gold/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night"
            href={productPath}
            onClick={() => trackResultClick('product')}
          >
            Ver produto
          </a>
          <a
            className="lazule-pressable rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-300 hover:text-lazule-night"
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
      <div className="lazule-surface-premium relative overflow-hidden rounded-[2.2rem] border border-lazule-gold/20 bg-[radial-gradient(circle_at_18%_0%,rgba(200,162,77,0.18),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,58,138,0.58)_48%,rgba(5,8,22,0.94))] p-4 shadow-mineral sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.07),transparent)] opacity-40" />
        <div className="relative grid gap-6 lg:grid-cols-[0.82fr_1fr] lg:items-start">
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold/90">LAZULE AI Perfume DNA</p>
            <h2 id="olfactive-assistant-title" className="mt-3 font-display text-4xl leading-[0.92] text-lazule-mist sm:text-5xl">Assistente Olfativo</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">Descreva sensação, ocasião ou referência e receba uma curadoria explicável com leitura de DNA olfativo.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="olfactive-query">Descreva o perfume ideal</label>
              <textarea
                id="olfactive-query"
                className="min-h-32 w-full resize-none rounded-[1.45rem] border border-white/12 bg-lazule-night/70 px-4 py-4 text-base leading-6 text-lazule-mist outline-none transition placeholder:text-slate-500 hover:border-lazule-gold/30 focus:border-lazule-gold/70 focus:ring-2 focus:ring-lazule-gold/30"
                value={query}
                maxLength={180}
                placeholder={DEFAULT_PROMPT}
                onChange={(event) => setQuery(event.target.value)}
              />

              <div className="lazule-horizontal-rail flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" aria-label="Sugestões rápidas">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="lazule-pressable shrink-0 snap-start rounded-full border border-lazule-gold/25 bg-lazule-gold/10 px-3.5 py-2 text-sm font-semibold text-lazule-gold transition hover:border-lazule-gold/70 hover:bg-lazule-gold hover:text-lazule-night focus:outline-none focus:ring-2 focus:ring-lazule-gold"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="lazule-premium-button lazule-cta-shimmer inline-flex min-h-12 w-full items-center justify-center rounded-full bg-lazule-gold px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-lazule-night shadow-aureate transition disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                disabled={isLoading}
              >
                <span className="relative z-10">{isLoading ? 'Curando seleção…' : 'Encontrar perfumes'}</span>
              </button>
            </form>
          </div>

          <div className="relative min-w-0 rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-4 sm:p-5" aria-live="polite">
            {!result && !isLoading ? (
              <div className="flex min-h-[18rem] flex-col justify-center text-center sm:text-left">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Comece pela vibe</p>
                <h3 className="mt-3 font-display text-3xl leading-tight text-lazule-mist">Diga ocasião, intensidade ou referência.</h3>
                <p className="mt-4 text-sm leading-6 text-slate-300">Experimente: {initialExamples}. A curadoria é privada, rápida e orientada por sinais olfativos — sem expor dados pessoais.</p>
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex min-h-[18rem] items-center justify-center text-center" role="status" aria-live="polite">
                <div>
                  <span className="lazule-ai-orb mx-auto block h-14 w-14 rounded-full border border-lazule-gold/50 bg-lazule-gold/10 shadow-aureate" aria-hidden="true" />
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-lazule-gold">{LOADING_STEPS[loadingStepIndex]}</p><p className="mt-3 text-xs leading-5 text-slate-300">Ajustando presença, ocasião e assinatura para uma recomendação mais precisa.</p>
                </div>
              </div>
            ) : null}

            {result && !isLoading ? (
              <div className="lazule-result-reveal">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" style={{ '--result-delay': '0ms' }}>
                  <div>
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Resultado</p>
                    <h3 className="mt-2 font-display text-3xl leading-tight text-lazule-mist">{hasRecommendations ? 'Sua curadoria inteligente' : 'Curadoria em ajuste'}</h3>
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

                <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible" style={{ '--result-delay': '90ms' }}>
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
