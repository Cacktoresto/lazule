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

const QUICK_SUGGESTIONS = ['doce confortável', 'roupa escura', 'escritório frio', 'presença limpa', 'date noturno', 'calor do RJ', 'cheiro de aeroporto', 'perfume de respeito', 'social de verão', 'ambiente climatizado', 'cheiro organizado'];
const DEFAULT_PROMPT = 'Ex: doce confortável, mas sem pesar';

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
      chips: ['doce confortável', 'sem pesar', 'baunilha macia'],
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

function humanizeUiCopy(value = '') {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\bvanilla\b/gi, 'baunilha')
    .replace(/\bamber\b/gi, 'âmbar')
    .replace(/\bmoderate projection\b/gi, 'presença sem gritar')
    .replace(/\bclean luxury\b/gi, 'limpo com cara de cuidado')
    .replace(/\bintimate signature\b/gi, 'presença mais próxima')
    .replace(/\bcreamy\b/gi, 'aveludado')
    .replace(/\bcozy\b/gi, 'confortável')
    .replace(/\s+/g, ' ')
    .trim();
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
      <article className="lazule-ai-card grid w-[min(88vw,30rem)] snap-start grid-cols-[3.7rem_1fr] items-center gap-3 border-l border-white/10 bg-transparent px-0.5 py-2 sm:w-[29rem] sm:grid-cols-[4rem_1fr]">
        <a
          className="relative aspect-square overflow-hidden rounded-[0.85rem] bg-lazule-depth"
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
          <p className="mt-1 line-clamp-2 text-[0.72rem] leading-5 text-slate-300/90">{humanizeUiCopy(reason)}</p>
        </div>
        
      </article>
    );
  }

  return (
    <article className="lazule-ai-card relative grid gap-4 overflow-visible border-l border-white/12 bg-transparent px-0 py-2 sm:grid-cols-[7.4rem_1fr] sm:items-center lg:grid-cols-[8.4rem_1fr]">
      <a
        className="relative z-10 aspect-[3/4] max-h-[8.6rem] translate-x-1 overflow-hidden rounded-[0.95rem] bg-lazule-depth/80 shadow-[0_12px_26px_rgba(2,6,23,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/60 sm:-mt-1 sm:max-h-[9.5rem]"
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

      <div className="min-w-0 sm:pl-1">
        <p className="line-clamp-1 text-[0.56rem] tracking-[0.2em] text-lazule-gold/65">{product.brand}</p>
        <a href={directBuy ? productPath : whatsappLink} target={directBuy ? undefined : '_blank'} rel={directBuy ? undefined : 'noreferrer'} onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')} className="mt-1 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold">
          <h3 className="line-clamp-2 font-display text-[1.35rem] leading-[0.96] tracking-[-0.02em] text-lazule-mist transition hover:text-lazule-gold/90 sm:text-[1.85rem]">{product.name}</h3>
        </a>
        <strong className="mt-2 block text-[0.84rem] font-medium text-lazule-gold/80 sm:text-[0.9rem]">{directBuy ? formatBRL(product.salePrice) : statusMeta.badge}</strong>
        <p className="mt-2 line-clamp-3 max-w-3xl text-[0.95rem] leading-6 text-slate-200/90">{humanizeUiCopy(reason)}</p>
        <p className="mt-1.5 text-[0.82rem] leading-6 text-slate-400/85">Vai bem quando você quer presença sem parecer que tentou demais.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className="lazule-premium-button inline-flex min-h-8.5 items-center rounded-full border border-lazule-gold/16 bg-transparent px-3 py-1 text-[0.62rem] tracking-[0.11em] text-lazule-gold/84 transition hover:border-lazule-gold/32 hover:text-lazule-gold"
            href={directBuy ? productPath : whatsappLink}
            target={directBuy ? undefined : '_blank'}
            rel={directBuy ? undefined : 'noreferrer'}
            onClick={() => trackResultClick(directBuy ? 'product' : 'whatsapp')}
          >
            {directBuy ? 'Ver essa presença' : 'Seguir nessa direção'}
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
      <div className="lazule-ai-concierge lazule-surface-premium relative min-w-0 overflow-hidden rounded-[1.9rem] border border-white/6 bg-[radial-gradient(circle_at_83%_20%,rgba(202,161,89,0.12),transparent_42%),radial-gradient(circle_at_14%_72%,rgba(90,106,144,0.16),transparent_52%),linear-gradient(124deg,rgba(10,15,30,0.94),rgba(9,18,38,0.87)_44%,rgba(5,10,21,0.97))] p-4 shadow-[0_22px_60px_rgba(2,6,23,0.22)] min-[390px]:p-4.5 sm:rounded-[2.5rem] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.04),transparent)] opacity-20" />
        
        <div className="relative grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
          <div className="min-w-0">
            <p className="text-[0.6rem] tracking-[0.28em] text-lazule-gold/75 sm:text-[0.64rem]">Concierge olfativo</p>
            <h2 id="olfactive-assistant-title" className="mt-3 max-w-[12ch] font-display text-[clamp(1.95rem,9.5vw,2.45rem)] leading-[0.9] tracking-[-0.035em] text-lazule-mist sm:mt-4 sm:max-w-[10ch] sm:text-5xl">Curadoria com presença.</h2>
            <p className="mt-5 max-w-xl text-[0.95rem] leading-7 text-slate-300/92 sm:mt-7">Continuando sua curadoria: descreva a intenção em poucas palavras. A leitura vem primeiro, depois o perfume que melhor sustenta esse clima.</p>

            <form className={`lazule-ai-form mt-5 min-w-0 space-y-4 sm:mt-6 ${isLazVisible ? "lazule-query-converging" : ""}`} onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="olfactive-query">Descreva o perfume ideal</label>
              <textarea
                id="olfactive-query"
                className="lazule-ai-textarea lazule-input-premium min-h-[4.4rem] w-full max-w-full resize-none rounded-[1rem] border border-white/6 bg-lazule-night/35 px-3.5 py-2.5 text-[0.92rem] leading-6 text-lazule-mist outline-none transition placeholder:text-slate-500/80 hover:border-lazule-gold/16 focus:border-lazule-gold/36 focus:ring-1 focus:ring-lazule-gold/16 sm:min-h-[4.9rem] sm:rounded-[1.2rem] sm:px-4 sm:py-3 sm:text-[0.96rem]"
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
                <span className="relative z-10 min-w-0 max-w-full whitespace-normal break-words">{isSearchProcessing ? 'Interpretando atmosfera…' : 'Seguir nessa direção'}</span>
              </button>
            </form>
          </div>

          <div className="lazule-ai-stage relative min-w-0 overflow-hidden rounded-[1.35rem] border border-white/6 bg-white/[0.01] p-4 sm:translate-y-5 sm:rounded-[1.8rem] sm:p-6" aria-live="polite">
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

            {result && canRevealResults ? null : null}
          </div>
        </div>

        {result && canRevealResults ? (
          <div className="lazule-result-reveal mt-7 min-w-0 max-w-full overflow-hidden">
                {(() => {
                  const narrative = getResultNarrative(result, hasRecommendations, query);
                  const actionSuggestions = narrative.state === 'clear' ? activeRefinements : (narrative.chips.length ? narrative.chips : activeRefinements);
                  return (
                    <>
                      <div className="grid gap-5 rounded-[1.25rem] border-l border-white/9 bg-transparent px-2 py-2 sm:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div>
                          <p className="text-[0.64rem] font-semibold tracking-[0.16em] text-lazule-gold/90">LAZ interpretou</p>
                          <h3 className="mt-2 font-display text-[clamp(1.3rem,4.2vw,1.8rem)] leading-tight tracking-[-0.02em] text-lazule-mist">{humanizeUiCopy(narrative.title)}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{humanizeUiCopy(narrative.body)}</p>
                        </div>
                        {!!actionSuggestions.length && (
                          <div className="flex flex-wrap content-start gap-2">
                            {actionSuggestions.slice(0, 3).map((chip) => <span key={`result-chip-${chip}`} className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-[0.71rem] text-slate-200">{humanizeUiCopy(chip)}</span>)}
                          </div>
                        )}
                        {!!activeRefinements.length && (
                          <button type="button" onClick={() => handleSuggestionClick(activeRefinements[0])} className="mt-4 inline-flex items-center rounded-full border border-lazule-gold/30 px-3.5 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night">
                            {narrative.cta}
                          </button>
                        )}
                      </div>

                      {!!recommendations.length && (
                        <div className="mt-4 space-y-4 sm:space-y-5">
                          <AssistantResultCard recommendation={recommendations[0]} result={result} sourcePage={sourcePage} />
                          {recommendations.length > 1 && (
                            <div>
                              <p className="mb-2 text-[0.7rem] tracking-[0.12em] text-slate-400/80">Rastros de descoberta</p>
                              <div className="lazule-ai-results lazule-horizontal-rail lazule-rail-fade flex min-w-0 max-w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-2" style={{ '--result-delay': '140ms' }}>
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
    </section>
  );
}
