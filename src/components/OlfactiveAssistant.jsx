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
import { appendTasteMemorySignal, loadTasteMemoryStore } from '../utils/tasteMemoryStore';
import { SemanticSearchLoading } from './SemanticSearchLoading';
import {
  createOlfactiveAssistantAnalyticsPayload,
  getLivingSemanticSuggestions,
  getOlfactiveRecommendations,
  getSemanticRefinementPaths,
  sanitizeOlfactiveQuery,
} from '../utils/olfactiveAssistant';

const QUICK_SUGGESTIONS = ['roupa escura', 'noite elegante', 'escritório frio', 'clean expensive', 'assinatura limpa', 'presença calma', 'date noturno', 'calor do RJ', 'perfume de aeroporto', 'executivo moderno', 'pós banho premium'];
const DEFAULT_PROMPT = 'Ex.: roupa escura, noite elegante e presença calma sem exagero';
const DISCOVERY_MODULES = ['Leitura contextual', 'Presença editorial'];
const MIN_VISIBLE_DESKTOP_MS = 3200;
const MIN_VISIBLE_MOBILE_MS = 2600;
const MAX_HANDOFF_WAIT_MS = 5000;
const FINAL_PULSE_MS = 340;
const LOADER_FADE_MS = 420;
const LOADING_RITUAL_COPY = ['Lendo sua atmosfera…', 'Finalizando sua curadoria…'];


function getResultNarrative(result, hasRecommendations, query) {
  const safeQuery = String(query || '').trim();
  const quotedQuery = safeQuery ? `“${safeQuery}”` : 'essa busca';
  const isAmbiguous = result.fallbackUsed && (result.detectedIntents?.length ?? 0) === 0;

  if (isAmbiguous) {
    return {
      state: 'ambiguous',
      title: 'Essa busca não aponta diretamente para perfume.',
      body: `${quotedQuery} não é uma direção olfativa direta, mas pode indicar vontade de algo doce, macio e confortável.`,
      cta: 'Ver caminhos próximos',
      chips: ['gourmand', 'doce confortável', 'baunilha cremosa'],
    };
  }

  if (!hasRecommendations || result.fallbackUsed) {
    return {
      state: 'partial',
      title: 'Não encontrei exatamente isso, mas há caminhos próximos.',
      body: 'Entendi mais como uma busca por sensação: menos impacto, mais conforto e uso fácil no dia a dia.',
      cta: 'Explorar essa direção',
      chips: (result.memoryAwareChips ?? []).slice(0, 3),
    };
  }

  return {
    state: 'clear',
    title: 'Encontrei uma direção clara para sua busca.',
    body: result.recommendations?.[0]?.reason ?? 'A leitura aponta para uma assinatura coerente com sua intenção.',
    cta: 'Ver perfumes sugeridos',
    chips: (result.memoryAwareChips ?? []).slice(0, 3),
  };
}

function AssistantResultCard({ recommendation, result, sourcePage, compact = false }) {
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

  if (compact) {
    return (
      <article className="lazule-ai-card lazule-surface-premium grid w-[min(82vw,23.5rem)] snap-start grid-cols-[4.2rem_1fr_auto] items-center gap-3 overflow-hidden rounded-[1.1rem] border border-white/6 bg-lazule-night/46 px-2.5 py-2.5 shadow-[0_10px_24px_rgba(2,6,23,0.16)] sm:w-[24.8rem]">
        <a
          className="relative aspect-square overflow-hidden rounded-[0.95rem] bg-lazule-depth"
          href={directBuy ? productPath : whatsappLink}
          target={directBuy ? undefined : '_blank'}
          rel={directBuy ? undefined : 'noreferrer'}
          onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')}
          aria-label={directBuy ? `Ver ${product.name}` : `Consultar ${product.name}`}
        >
          {product.image ? <img className="absolute inset-0 h-full w-full object-cover" src={product.image} alt={`Perfume ${product.name}`} loading="lazy" decoding="async" /> : <ProductImageFallback label="Curadoria LAZULE" />}
        </a>
        <div className="min-w-0">
          <p className="line-clamp-1 text-[0.62rem] tracking-[0.18em] text-lazule-gold/75">{product.brand}</p>
          <h3 className="line-clamp-1 font-display text-[1.01rem] leading-tight text-lazule-mist">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-[0.72rem] leading-5 text-slate-300/90">{reason}</p>
        </div>
        <a className="inline-flex min-h-8 items-center rounded-full border border-lazule-gold/18 px-2.5 py-1 text-[0.62rem] tracking-[0.06em] text-lazule-gold/90 transition hover:border-lazule-gold/40 hover:bg-lazule-gold/12" href={directBuy ? productPath : whatsappLink} target={directBuy ? undefined : '_blank'} rel={directBuy ? undefined : 'noreferrer'} onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')}>
          Ver
        </a>
      </article>
    );
  }

  return (
    <article className="lazule-ai-card lazule-surface-premium grid gap-5 overflow-hidden rounded-[1.4rem] border border-white/6 bg-lazule-night/42 p-4 shadow-[0_14px_34px_rgba(2,6,23,0.18)] sm:grid-cols-[minmax(7.2rem,8.2rem)_1fr] sm:items-center sm:p-[1.25rem] lg:grid-cols-[8.6rem_1fr]">
      <a
        className="relative aspect-[3/4] max-h-[9.3rem] overflow-hidden rounded-[0.9rem] bg-lazule-depth/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/60 sm:max-h-[9.6rem]"
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

      <div className="min-w-0">
        <p className="line-clamp-1 text-[0.58rem] tracking-[0.18em] text-lazule-gold/65">{product.brand}</p>
        <a href={directBuy ? productPath : whatsappLink} target={directBuy ? undefined : '_blank'} rel={directBuy ? undefined : 'noreferrer'} onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')} className="mt-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold">
          <h3 className="line-clamp-2 font-display text-[1.35rem] leading-[0.96] tracking-[-0.02em] text-lazule-mist transition hover:text-lazule-gold/90 sm:text-[1.85rem]">{product.name}</h3>
        </a>
        <strong className="mt-2 block text-[0.86rem] font-medium text-lazule-gold/88 sm:text-[0.93rem]">{directBuy ? formatBRL(product.salePrice) : statusMeta.badge}</strong>
        <p className="mt-3 line-clamp-4 max-w-2xl text-[0.93rem] leading-7 text-slate-200/92">{reason}</p>
        <p className="mt-2.5 text-[0.84rem] leading-6 text-slate-400/90">Presença limpa e segura, com construção silenciosa e assinatura sofisticada.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            className="lazule-premium-button inline-flex min-h-10 items-center rounded-full border border-lazule-gold/20 bg-lazule-gold/[0.03] px-4 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-lazule-gold/90 transition hover:border-lazule-gold/45 hover:bg-lazule-gold/12 hover:text-lazule-gold"
            href={directBuy ? productPath : whatsappLink}
            target={directBuy ? undefined : '_blank'}
            rel={directBuy ? undefined : 'noreferrer'}
            onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')}
          >
            {directBuy ? 'Ver perfume' : 'Consultar'}
          </a>
        </div>
      </div>
    </article>
  );
}

export function OlfactiveAssistant({ products = [], sourcePage = 'home', className = 'mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10' }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [isSearchProcessing, setIsSearchProcessing] = useState(false);
  const [isLazVisible, setIsLazVisible] = useState(false);
  const [resultsReady, setResultsReady] = useState(false);
  const [canRevealResults, setCanRevealResults] = useState(false);
  const [loaderPhase, setLoaderPhase] = useState('idle');
  const [activeRefinements, setActiveRefinements] = useState([]);
  const [tasteSignals, setTasteSignals] = useState([]);
  const [wardrobeMemory, setWardrobeMemory] = useState({ entries: [], favorites: [], inspirations: [] });
  const timeoutRef = useRef(null);
  const handoffRef = useRef({ seq: 0, startedAt: 0, minVisibleMs: MIN_VISIBLE_DESKTOP_MS, timers: [] });

  const initialExamples = useMemo(() => QUICK_SUGGESTIONS.slice(0, 4).join(' · '), []);


  useEffect(() => {
    const tasteMemory = loadTasteMemoryStore(window.localStorage);
    setTasteSignals(tasteMemory.events);
    setWardrobeMemory(loadWardrobeMemory(window.localStorage));
  }, []);

  useEffect(() => {
    trackEvent('ai_assistant_view', { source_page: sourcePage }, { dedupeKey: `ai_assistant_view|${sourcePage}`, dedupeMs: 3000 });

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      handoffRef.current.timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [sourcePage]);

  function resetHandoffTimers() {
    handoffRef.current.timers.forEach((timerId) => window.clearTimeout(timerId));
    handoffRef.current.timers = [];
  }

  function startLazSession(nextResult) {
    const nextSeq = handoffRef.current.seq + 1;
    const minVisibleMs = window.matchMedia('(max-width: 767px)').matches ? MIN_VISIBLE_MOBILE_MS : MIN_VISIBLE_DESKTOP_MS;
    handoffRef.current = { ...handoffRef.current, seq: nextSeq, startedAt: Date.now(), minVisibleMs };
    resetHandoffTimers();

    setPendingResult(null);
    setResult(null);
    setResultsReady(false);
    setCanRevealResults(false);
    setIsLazVisible(true);
    setLoaderPhase('converging');
    setIsSearchProcessing(true);

    timeoutRef.current = window.setTimeout(() => {
      setLoaderPhase('processing');
      loadRecommendationKnowledgeBase(products).then((knowledgeBase) => nextResult(knowledgeBase)).catch(() => nextResult(products)).finally(() => {
        if (handoffRef.current.seq !== nextSeq) return;
        const now = Date.now();
        const elapsed = now - handoffRef.current.startedAt;
        const waitForMin = Math.max(0, handoffRef.current.minVisibleMs - elapsed);
        const waitForSafety = Math.max(0, MAX_HANDOFF_WAIT_MS - elapsed);
        const waitMs = Math.min(waitForMin, waitForSafety);
        const finalizeId = window.setTimeout(() => {
          if (handoffRef.current.seq !== nextSeq) return;
          setLoaderPhase('finalizing');
          const fadeId = window.setTimeout(() => {
            if (handoffRef.current.seq !== nextSeq) return;
            setIsLazVisible(false);
            setCanRevealResults(true);
            setIsSearchProcessing(false);
          }, FINAL_PULSE_MS + LOADER_FADE_MS);
          handoffRef.current.timers.push(fadeId);
        }, waitMs);
        handoffRef.current.timers.push(finalizeId);
      });
    }, 680);
  }

  function runAssistant(nextQuery = query) {
    const safeQuery = sanitizeOlfactiveQuery(nextQuery);

    if (!safeQuery) {
      setResult(null);
      setQuery('');
      return;
    }

    setQuery(safeQuery);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    startLazSession((knowledgeBase) => {
        const nextResult = getOlfactiveRecommendations(safeQuery, knowledgeBase, { limit: 6, tasteSignals, collectionEntries: wardrobeMemory.entries });
        setPendingResult(nextResult);
        setResultsReady(true);
        const signal = { source: 'semantic_search', query: safeQuery, intents: nextResult.detectedIntents, chips: nextResult.memoryAwareChips, ts: Date.now() };
        const nextStore = appendTasteMemorySignal({ events: tasteSignals }, signal, window.localStorage);
        setTasteSignals(nextStore.events);
        trackEvent('ai_assistant_query', createOlfactiveAssistantAnalyticsPayload(nextResult, {
          query: safeQuery,
          sourcePage,
        }));
      });
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
    if (!canRevealResults || !resultsReady || !pendingResult) return;
    setResult(pendingResult);
  }, [canRevealResults, pendingResult, resultsReady]);

  useEffect(() => {
    if (!result) return;
    setActiveRefinements(getSemanticRefinementPaths(result).slice(0, 2));
  }, [result]);

  return (
    <section className={`${className} lazule-ai-section ${isLazVisible ? `lazule-curation-ritual lazule-phase-${loaderPhase}` : ""}`} aria-labelledby="olfactive-assistant-title">
      <div className="lazule-ai-concierge lazule-surface-premium relative min-w-0 overflow-hidden rounded-[1.6rem] border border-white/7 bg-[linear-gradient(128deg,rgba(10,16,30,0.94),rgba(11,21,43,0.88)_48%,rgba(6,10,22,0.96))] p-4 shadow-[0_16px_44px_rgba(2,6,23,0.16)] min-[390px]:p-4.5 sm:rounded-[2.2rem] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.055),transparent)] opacity-20" />
        <div className="lazule-ai-orb absolute -right-20 -top-20 h-24 w-24 rounded-full border border-lazule-gold/8 bg-lazule-gold/5 opacity-15 blur-[0.35px] sm:h-28 sm:w-28 sm:opacity-20" aria-hidden="true" />
        <div className="relative grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          <div className="min-w-0">
            <p className="text-[0.6rem] tracking-[0.28em] text-lazule-gold/75 sm:text-[0.64rem]">Concierge olfativo</p>
            <h2 id="olfactive-assistant-title" className="mt-3 max-w-[12ch] font-display text-[clamp(1.95rem,9.5vw,2.45rem)] leading-[0.9] tracking-[-0.035em] text-lazule-mist sm:mt-4 sm:max-w-[10ch] sm:text-5xl">Curadoria com presença.</h2>
            <p className="mt-5 max-w-xl text-[0.95rem] leading-7 text-slate-300/92 sm:mt-7">Continuando sua curadoria: descreva o momento e a leitura surge em camadas — intenção, destaque central e direções complementares.</p>

            <div className="mt-3.5 flex flex-wrap gap-2 sm:mt-5" aria-label="Momentos de descoberta">
              {DISCOVERY_MODULES.map((label) => <span key={label} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.67rem] tracking-[0.12em] text-slate-200">{label}</span>)}
            </div>

            <form className={`lazule-ai-form mt-5 min-w-0 space-y-4 sm:mt-6 ${isLazVisible ? "lazule-query-converging" : ""}`} onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="olfactive-query">Descreva o perfume ideal</label>
              <textarea
                id="olfactive-query"
                className="lazule-ai-textarea lazule-input-premium min-h-[5.8rem] w-full max-w-full resize-none rounded-[1.1rem] border border-white/8 bg-lazule-night/52 px-3.5 py-3 text-[0.92rem] leading-6 text-lazule-mist outline-none transition placeholder:text-slate-500/90 hover:border-lazule-gold/20 focus:border-lazule-gold/45 focus:ring-1 focus:ring-lazule-gold/20 sm:min-h-[6.6rem] sm:rounded-[1.35rem] sm:px-4.5 sm:py-3.5 sm:text-[0.96rem]"
                value={query}
                maxLength={180}
                placeholder={DEFAULT_PROMPT}
                onChange={(event) => setQuery(event.target.value)}
              />

              <div className={`lazule-ai-chips flex min-w-0 max-w-full flex-wrap gap-1.5 pb-1 sm:gap-2 ${isLazVisible ? "lazule-chips-absorbing" : ""}`} aria-label="Sugestões rápidas">
                {(query.trim() ? livingSuggestions.slice(0, 3) : QUICK_SUGGESTIONS.slice(0, 3)).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="lazule-premium-button min-h-7.5 min-w-0 max-w-full rounded-full border border-white/12 bg-white/[0.02] px-2.5 py-1 text-[0.72rem] leading-tight text-slate-300 transition hover:border-lazule-gold/35 hover:text-lazule-gold focus:outline-none focus:ring-1 focus:ring-lazule-gold/30 min-[390px]:px-3 sm:min-h-8 sm:text-[0.78rem]"
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
                className="lazule-ai-cta lazule-premium-button inline-flex min-h-10 w-full min-w-0 max-w-full items-center justify-center rounded-full border border-lazule-gold/24 bg-lazule-gold/[0.08] px-4 py-2.5 text-center text-[0.76rem] uppercase leading-tight tracking-[0.14em] text-lazule-gold shadow-none transition hover:bg-lazule-gold/[0.14] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-5"
                disabled={isSearchProcessing}
              >
                <span className="relative z-10 min-w-0 max-w-full whitespace-normal break-words">{isSearchProcessing ? 'Interpretando atmosfera…' : 'Receber curadoria'}</span>
              </button>
            </form>
          </div>

          <div className="lazule-ai-stage relative min-w-0 overflow-hidden rounded-[1.35rem] border border-white/7 bg-white/[0.02] p-4 sm:rounded-[1.95rem] sm:p-7" aria-live="polite">
            {!result && !isLazVisible ? (
              <div className="min-w-0 max-w-full overflow-hidden flex min-h-[9.5rem] flex-col justify-center text-center sm:min-h-[14rem] sm:text-left">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Curadoria em contexto</p>
                <h3 className="mt-3 font-display text-[clamp(1.85rem,8vw,2.25rem)] leading-tight tracking-[-0.03em] text-lazule-mist sm:text-3xl">Como você quer ser percebido hoje?</h3>
                <p className="mt-4 text-sm leading-6 text-slate-300">Comece por uma sensação: {initialExamples}.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {onboardingSuggestions.map((suggestion) => <button key={`onboarding-${suggestion}`} type="button" onClick={() => handleSuggestionClick(suggestion)} className="rounded-full border border-lazule-gold/20 bg-lazule-gold/10 px-3 py-1.5 text-xs text-lazule-gold">{suggestion}</button>)}
                </div>
              </div>
            ) : null}

            {isLazVisible ? (
              <div className="min-h-[9.5rem] min-w-0 max-w-full sm:min-h-[14rem]" role="status" aria-live="polite">
                <SemanticSearchLoading isActive={isLazVisible} isVisible={isLazVisible} phase={loaderPhase} fadeDurationMs={LOADER_FADE_MS} interpretedChips={livingSuggestions.slice(0, 3)} query={query} loadingCopy={LOADING_RITUAL_COPY} className="max-w-full" />
              </div>
            ) : null}

            {result && canRevealResults ? (
              <div className="lazule-result-reveal min-w-0 max-w-full overflow-hidden">
                {(() => {
                  const narrative = getResultNarrative(result, hasRecommendations, query);
                  const actionSuggestions = narrative.state === 'clear' ? activeRefinements : (narrative.chips.length ? narrative.chips : activeRefinements);
                  return (
                    <>
                      <div className="mb-4 rounded-[1.35rem] border border-white/7 bg-white/[0.02] px-3.5 py-3.5 sm:px-[1.125rem]">
                        <p className="text-[0.64rem] font-semibold tracking-[0.16em] text-lazule-gold/90">Leitura da busca</p>
                        <h3 className="mt-2 font-display text-[clamp(1.45rem,6.5vw,2rem)] leading-tight tracking-[-0.02em] text-lazule-mist">{narrative.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-slate-300">{narrative.body}</p>
                        {!!actionSuggestions.length && (
                          <div className="mt-3.5 flex flex-wrap gap-2">
                            {actionSuggestions.slice(0, 3).map((chip) => <span key={`result-chip-${chip}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.72rem] text-slate-200">{chip}</span>)}
                          </div>
                        )}
                        {!!activeRefinements.length && (
                          <button type="button" onClick={() => handleSuggestionClick(activeRefinements[0])} className="mt-4 inline-flex items-center rounded-full border border-lazule-gold/30 px-3.5 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night">
                            {narrative.cta}
                          </button>
                        )}
                      </div>

                      {!!recommendations.length && (
                        <div className="space-y-[1.125rem] sm:space-y-[1.375rem]">
                          <AssistantResultCard recommendation={recommendations[0]} result={result} sourcePage={sourcePage} />
                          {recommendations.length > 1 && (
                            <div>
                              <p className="mb-3 text-[0.74rem] tracking-[0.08em] text-slate-400">Outras direções possíveis</p>
                              <div className="lazule-ai-results lazule-horizontal-rail lazule-rail-fade flex min-w-0 max-w-full snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2.5" style={{ '--result-delay': '140ms' }}>
                                {recommendations.slice(1, 4).map((recommendation) => (
                                  <AssistantResultCard
                                    key={recommendation.product.id ?? recommendation.product.productSlug ?? recommendation.product.name}
                                    recommendation={recommendation}
                                    result={result}
                                    sourcePage={sourcePage}
                                    compact
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
