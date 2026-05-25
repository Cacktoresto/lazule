import { useEffect, useMemo, useRef, useState } from 'react';
import { COLLECTION_STATES } from '../ai/collectionIntelligenceEngine';
import { loadWardrobeMemory, saveWardrobeEntry, saveWardrobeMemory } from '../utils/wardrobeMemory';
import { createProductWhatsAppLink } from '../utils/whatsapp';
import { formatBRL } from '../utils/currency';
import { createProductPath } from '../utils/productRouting';
import { canDirectBuy, getCommercialStatusMeta } from '../utils/commercialStatus';
import { loadRecommendationKnowledgeBase } from '../data/referenceCatalog';
import { trackEvent } from '../utils/analytics';
import { getReferralContext } from '../utils/referral';
import { ProductImageFallback } from './ProductCard';
import { SemanticSearchLoading } from './SemanticSearchLoading';
import {
  createOlfactiveAssistantAnalyticsPayload,
  getLivingSemanticSuggestions,
  getOlfactiveRecommendations,
  getSemanticRefinementPaths,
  sanitizeOlfactiveQuery,
} from '../utils/olfactiveAssistant';

const QUICK_SUGGESTIONS = ['Explore sua assinatura', 'Descubra direções olfativas', 'Perfumes para presença refinada', 'Elegância com calor sutil'];
const DEFAULT_PROMPT = 'Ex.: uma assinatura discreta, elegante e memorável para a noite';
const DISCOVERY_MODULES = ['Sua direção olfativa', 'Continuando sua curadoria'];
const TASTE_MEMORY_STORAGE_KEY = 'lazule_taste_memory_v1';

function AssistantResultCard({ recommendation, result, sourcePage }) {
  const { product, reason } = recommendation;
  const productPath = createProductPath(product);
  const directBuy = canDirectBuy(product);
  const statusMeta = getCommercialStatusMeta(product);
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
        href={directBuy ? productPath : whatsappLink}
        target={directBuy ? undefined : '_blank'}
        rel={directBuy ? undefined : 'noreferrer'}
        onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')}
        aria-label={directBuy ? `Ver ${product.name}` : `Consultar ${product.name}`}
      >
        {product.image ? (
          <img className="absolute inset-0 h-full w-full object-cover" src={product.image} alt={`Perfume ${product.name}`} loading="lazy" decoding="async" />
        ) : (
          <ProductImageFallback label={directBuy ? 'Curadoria LAZULE' : 'Curadoria sob consulta'} />
        )}
      </a>

      <div className="min-w-0 py-1">
        <p className="line-clamp-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold/80">{product.brand}</p>
        <a href={directBuy ? productPath : whatsappLink} target={directBuy ? undefined : '_blank'} rel={directBuy ? undefined : 'noreferrer'} onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')} className="mt-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold">
          <h3 className="line-clamp-2 font-display text-[1.22rem] leading-[0.98] text-lazule-mist transition hover:text-lazule-gold sm:text-2xl">{product.name}</h3>
        </a>
        <strong className="mt-1.5 block text-[0.92rem] text-lazule-gold sm:text-base">{directBuy ? formatBRL(product.salePrice) : statusMeta.badge}</strong>
        <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-lazule-gold/80">Por que recomendamos?</p>
        <p className="mt-1 line-clamp-2 text-[0.82rem] leading-5 text-slate-300 sm:line-clamp-3 sm:text-sm">{reason}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
          <a
            className="lazule-premium-button inline-flex min-h-9 items-center rounded-full border border-lazule-gold/35 px-2.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night sm:text-xs sm:tracking-[0.14em]"
            href={directBuy ? productPath : whatsappLink}
            target={directBuy ? undefined : '_blank'}
            rel={directBuy ? undefined : 'noreferrer'}
            onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')}
          >
            {directBuy ? 'Ver produto' : 'Consultar'}
          </a>
          <a
            className="lazule-premium-button inline-flex min-h-9 items-center rounded-full border border-lazule-gold/25 bg-white/[0.035] px-2.5 py-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:bg-lazule-gold hover:text-lazule-night sm:text-xs sm:tracking-[0.14em]"
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackResultClick('whatsapp')}
          >
            {directBuy ? 'WhatsApp' : statusMeta.shortCtaLabel}
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
  const [activeRefinements, setActiveRefinements] = useState([]);
  const [tasteSignals, setTasteSignals] = useState([]);
  const [wardrobeMemory, setWardrobeMemory] = useState({ entries: [], favorites: [], inspirations: [] });
  const timeoutRef = useRef(null);

  const initialExamples = useMemo(() => QUICK_SUGGESTIONS.slice(0, 4).join(' · '), []);


  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TASTE_MEMORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed?.events)) setTasteSignals(parsed.events.slice(-36));
    } catch {
      setTasteSignals([]);
    }
    setWardrobeMemory(loadWardrobeMemory(window.localStorage));
  }, []);

  useEffect(() => {
    trackEvent('ai_assistant_view', { source_page: sourcePage }, { dedupeKey: `ai_assistant_view|${sourcePage}`, dedupeMs: 3000 });

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
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

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      loadRecommendationKnowledgeBase(products).then((knowledgeBase) => {
        const nextResult = getOlfactiveRecommendations(safeQuery, knowledgeBase, { limit: 6, tasteSignals, collectionEntries: wardrobeMemory.entries });
        setResult(nextResult);
        const signal = { source: 'semantic_search', query: safeQuery, intents: nextResult.detectedIntents, chips: nextResult.memoryAwareChips, ts: Date.now() };
        const nextSignals = [...tasteSignals, signal].slice(-36);
        setTasteSignals(nextSignals);
        window.localStorage.setItem(TASTE_MEMORY_STORAGE_KEY, JSON.stringify({ events: nextSignals }));
        trackEvent('ai_assistant_query', createOlfactiveAssistantAnalyticsPayload(nextResult, {
          query: safeQuery,
          sourcePage,
        }));
      }).catch(() => {
        const nextResult = getOlfactiveRecommendations(safeQuery, products, { limit: 6, tasteSignals, collectionEntries: wardrobeMemory.entries });
        setResult(nextResult);
        const signal = { source: 'semantic_search', query: safeQuery, intents: nextResult.detectedIntents, chips: nextResult.memoryAwareChips, ts: Date.now() };
        const nextSignals = [...tasteSignals, signal].slice(-36);
        setTasteSignals(nextSignals);
        window.localStorage.setItem(TASTE_MEMORY_STORAGE_KEY, JSON.stringify({ events: nextSignals }));
        trackEvent('ai_assistant_query', createOlfactiveAssistantAnalyticsPayload(nextResult, {
          query: safeQuery,
          sourcePage,
        }));
      }).finally(() => {
        setIsLoading(false);
      });
    }, 680);
  }

  function handleSubmit(event) {
    event.preventDefault();
    runAssistant();
  }


  function handleSaveToWardrobe(product, state = COLLECTION_STATES.owned) {
    const next = saveWardrobeEntry(wardrobeMemory, product, state);
    setWardrobeMemory(next);
    saveWardrobeMemory(next, window.localStorage);
  }

  function handleSuggestionClick(suggestion) {
    setQuery(suggestion);
    runAssistant(suggestion);
  }

  const recommendations = result?.recommendations ?? [];
  const hasRecommendations = recommendations.length > 0;
  const livingSuggestions = useMemo(() => getLivingSemanticSuggestions(query, result).slice(0, 6), [query, result]);
  const onboardingSuggestions = useMemo(() => getLivingSemanticSuggestions('', null).slice(0, 3), []);

  useEffect(() => {
    if (!result) return;
    setActiveRefinements(getSemanticRefinementPaths(result).slice(0, 2));
  }, [result]);

  return (
    <section className={`${className} lazule-ai-section`} aria-labelledby="olfactive-assistant-title">
      <div className="lazule-ai-concierge lazule-surface-premium relative min-w-0 overflow-hidden rounded-[1.55rem] border border-lazule-gold/20 bg-[radial-gradient(circle_at_18%_0%,rgba(200,162,77,0.13),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,58,138,0.38)_48%,rgba(5,8,22,0.95))] p-3.5 shadow-[0_30px_110px_rgba(2,6,23,0.32)] backdrop-blur-xl min-[390px]:rounded-[1.85rem] min-[390px]:p-4 sm:rounded-[2.7rem] sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.055),transparent)] opacity-40" />
        <div className="lazule-ai-orb absolute -right-16 -top-16 h-36 w-36 rounded-full border border-lazule-gold/20 bg-lazule-gold/10 opacity-35 blur-[0.2px] sm:-right-14 sm:-top-14 sm:h-44 sm:w-44 sm:opacity-60" aria-hidden="true" />
        <div className="relative grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold/90 sm:text-[0.66rem] sm:tracking-[0.36em]">Concierge olfativo</p>
            <h2 id="olfactive-assistant-title" className="mt-3 max-w-[12ch] font-display text-[clamp(1.95rem,9.5vw,2.45rem)] leading-[0.9] tracking-[-0.035em] text-lazule-mist sm:mt-4 sm:max-w-[10ch] sm:text-5xl">Curadoria com presença.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:mt-5">Descreva o momento. A LAZULE revela caminhos olfativos com calma, intenção e continuidade.</p>

            <div className="mt-4 flex flex-wrap gap-2 sm:mt-5" aria-label="Momentos de descoberta">
              {DISCOVERY_MODULES.map((label) => <span key={label} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-slate-200">{label}</span>)}
            </div>

            <form className="lazule-ai-form mt-4 min-w-0 space-y-3.5 sm:mt-5" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="olfactive-query">Descreva o perfume ideal</label>
              <textarea
                id="olfactive-query"
                className="lazule-ai-textarea lazule-input-premium min-h-24 w-full max-w-full resize-none rounded-[1.2rem] border border-white/10 bg-lazule-night/70 px-3.5 py-3.5 text-[0.95rem] leading-6 text-lazule-mist outline-none transition placeholder:text-slate-500 hover:border-lazule-gold/30 focus:border-lazule-gold/70 focus:ring-2 focus:ring-lazule-gold/25 sm:min-h-32 sm:rounded-[1.55rem] sm:px-5 sm:py-5 sm:text-base sm:leading-7"
                value={query}
                maxLength={180}
                placeholder={DEFAULT_PROMPT}
                onChange={(event) => setQuery(event.target.value)}
              />

              <div className="lazule-ai-chips flex min-w-0 max-w-full flex-wrap gap-1.5 pb-1 sm:gap-2" aria-label="Sugestões rápidas">
                {(query.trim() ? livingSuggestions.slice(0, 3) : QUICK_SUGGESTIONS.slice(0, 3)).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="lazule-premium-button min-h-8 min-w-0 max-w-full rounded-full border border-lazule-gold/25 bg-lazule-gold/10 px-2.5 py-1.5 text-[0.76rem] font-semibold leading-tight text-lazule-gold transition hover:border-lazule-gold/70 hover:bg-lazule-gold hover:text-lazule-night focus:outline-none focus:ring-2 focus:ring-lazule-gold min-[390px]:px-3 min-[390px]:text-[0.8rem] sm:min-h-9 sm:px-4 sm:py-2.5 sm:text-[0.82rem]"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {query.trim() ? (
                <div className="flex flex-wrap gap-1.5" aria-label="Assinaturas em evolução">
                  {livingSuggestions.slice(0, 4).map((suggestion) => <span key={`live-${suggestion}`} className="rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-3 py-1 text-[0.68rem] text-lazule-gold/90 transition-all duration-300">{suggestion}</span>)}
                </div>
              ) : null}

              <button
                type="submit"
                className="lazule-ai-cta lazule-premium-button lazule-cta-shimmer inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center rounded-full bg-lazule-gold px-4 py-3 text-center text-[0.82rem] font-semibold uppercase leading-tight tracking-[0.1em] text-lazule-night shadow-aureate transition disabled:cursor-not-allowed disabled:opacity-70 min-[390px]:px-5 min-[390px]:text-sm min-[390px]:tracking-[0.12em] sm:w-auto sm:px-6 sm:tracking-[0.18em]"
                disabled={isLoading}
              >
                <span className="relative z-10 min-w-0 max-w-full whitespace-normal break-words">{isLoading ? 'Interpretando atmosfera…' : 'Receber curadoria'}</span>
              </button>
            </form>
          </div>

          <div className="lazule-ai-stage relative min-w-0 overflow-hidden rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-3.5 sm:rounded-[1.9rem] sm:p-6" aria-live="polite">
            {!result && !isLoading ? (
              <div className="min-w-0 max-w-full overflow-hidden flex min-h-[9.5rem] flex-col justify-center text-center sm:min-h-[14rem] sm:text-left">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Descubra sua assinatura</p>
                <h3 className="mt-3 font-display text-[clamp(1.85rem,8vw,2.25rem)] leading-tight tracking-[-0.03em] text-lazule-mist sm:text-3xl">Como você quer ser percebido hoje?</h3>
                <p className="mt-4 text-sm leading-6 text-slate-300">Comece por uma sensação: {initialExamples}.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {onboardingSuggestions.map((suggestion) => <button key={`onboarding-${suggestion}`} type="button" onClick={() => handleSuggestionClick(suggestion)} className="rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-3 py-1.5 text-xs text-lazule-gold">{suggestion}</button>)}
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="min-h-[9.5rem] min-w-0 max-w-full sm:min-h-[14rem]" role="status" aria-live="polite">
                <SemanticSearchLoading isActive={isLoading} interpretedChips={livingSuggestions.slice(0, 3)} className="max-w-full" />
              </div>
            ) : null}

            {result && !isLoading ? (
              <div className="lazule-result-reveal min-w-0 max-w-full overflow-hidden">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" style={{ '--result-delay': '0ms' }}>
                  <div>
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Resultado</p>
                    <h3 className="mt-2 font-display text-[clamp(1.85rem,8vw,2.25rem)] leading-tight tracking-[-0.03em] text-lazule-mist sm:text-3xl">{hasRecommendations ? 'Sua curadoria de assinatura' : 'Curadoria em ajuste'}</h3>
                  </div>
                  {result.detectedIntents?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {result.detectedIntents.slice(0, 1).map((intent) => (
                        <span key={intent} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">{intent}</span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-200 transition-all duration-500">
                  <p className="text-lazule-gold leading-relaxed">{result.recommendations?.[0]?.reason ?? 'Sua direção olfativa sugere elegância com presença discreta e assinatura refinada.'}</p>
                  <p className="mt-2 text-xs text-slate-300">Curadoria viva, com continuidade entre suas buscas.</p>
                </div>


                {result.personalProfile?.memory?.profileNotes?.length ? (
                  <div className="mb-4 rounded-2xl border border-lazule-gold/20 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">{result.personalProfile.signatureTitle}</p>
                    <p className="mt-2 text-slate-200">{result.personalProfile.memory.profileNotes[0]}.</p>
                    <p className="mt-1 text-xs text-slate-400">{result.personalProfile.journeyNarrative}</p>
                  </div>
                ) : null}

                {result.memoryAwareChips?.length ? (
                  <div className="mb-4">
                    <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-lazule-gold/90">Continuando sua curadoria</p>
                    <div className="flex flex-wrap gap-2">
                      {result.memoryAwareChips.slice(0, 2).map((chip) => <span key={`mem-${chip}`} className="rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-3 py-1 text-xs text-lazule-gold/90">{chip}</span>)}
                    </div>
                  </div>
                ) : null}

                {result.discoveryConversion ? (
                  <div className="mb-4 rounded-2xl border border-lazule-gold/20 bg-lazule-gold/10 px-4 py-3 text-sm leading-6 text-slate-200">
                    <p className="font-semibold text-lazule-gold">{result.discoveryConversion.title}</p>
                    <p className="mt-1">{result.discoveryConversion.message}</p>
                  </div>
                ) : result.fallbackUsed ? (
                  <p className="mb-4 rounded-2xl border border-lazule-gold/20 bg-lazule-gold/10 px-4 py-3 text-sm leading-6 text-slate-200">
                    Não encontramos uma assinatura exatamente nessa direção, mas essas curadorias conversam com a presença que você procura.
                  </p>
                ) : null}

                {!!activeRefinements.length && (
                  <div className="mb-4">
                    <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-lazule-gold/90">Na mesma direção olfativa</p>
                    <div className="flex flex-wrap gap-2">
                      {activeRefinements.map((chip) => (
                        <button key={chip} type="button" onClick={() => handleSuggestionClick(chip)} className="rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-3 py-1.5 text-xs text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night">{chip}</button>
                      ))}
                    </div>
                  </div>
                )}



                <div className="lazule-ai-results lazule-horizontal-rail lazule-rail-fade flex min-w-0 max-w-full snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible" style={{ '--result-delay': '90ms' }}>
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
