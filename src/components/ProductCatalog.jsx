import { useEffect, useMemo, useRef, useState } from 'react';
import { loadSearchRuntime, preloadSemanticRuntime } from '../ai/semanticRuntimeLoader';
import { createWhatsAppLink } from '../utils/whatsapp';
import { getAllProducts } from '../data/catalogRepository';
import { getFeaturedCollections } from '../utils/catalog';
import { trackEvent, trackSearch, trackWhatsAppClick } from '../utils/analytics';
import { filterAndSortCatalogProducts } from '../utils/catalogFilters';
import { AdvancedFilters, ALL_VALUE } from './AdvancedFilters';
import { ProductCard } from './ProductCard';
import { SearchBar } from './SearchBar';
import { CatalogHighlights } from './CatalogHighlights';
import { SemanticSearchLoading } from './SemanticSearchLoading';
import { applyCatalogSeo } from '../utils/seo';
import { buildDiscoveryGroups, getContextualRecommendations, getDiscoveryChips, matchDiscoveryTags } from '../utils/catalogDiscovery';

const DEFAULT_FILTERS = {
  category: ALL_VALUE,
  gender: ALL_VALUE,
  brand: ALL_VALUE,
  priceRange: 'all',
  imageMode: 'all',
  availabilityStatus: 'all',
  availableOnly: false,
  sortBy: 'featured',
};

const PRODUCTS_PER_PAGE = 24;

const CATALOG_QUERY_PARAMS = ['tipo', 'categoria', 'category'];

function formatSemanticChip(value) {
  const labels = {
    aquatic: 'Marinho',
    marine: 'Marinho',
    fresh: 'Frescor',
    hot_weather: 'Clima quente',
    summer: 'Verão',
    clean_luxury: 'Clean',
    post_bath: 'Pós-banho',
    nightlife: 'Balada',
    clean: 'Clean',
    elegant: 'Elegante',
    woody_executive: 'Sofisticado',
  };

  const mapped = (labels[value] ?? value).replace(/_/g, ' ');
  return mapped
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getInitialCatalogState() {
  const params = new URLSearchParams(window.location.search);
  const category = CATALOG_QUERY_PARAMS.map((param) => params.get(param)).find(Boolean) ?? DEFAULT_FILTERS.category;

  return {
    filters: { ...DEFAULT_FILTERS, category },
    searchTerm: params.get('busca') ?? params.get('q') ?? '',
  };
}


function resolveSemanticMood(query) {
  const normalized = query.toLowerCase();
  if (!normalized) return 'default';
  if (/\b(mar|ocean|praia|aquatic|marine)\b/i.test(normalized)) return 'marine';
  if (/\b(banho|clean|fresh)\b|sab\w+o/i.test(normalized)) return 'clean';
  if (/\b(balada|noite|party|club)\b/i.test(normalized)) return 'night';
  if (/\b(couro|leather|oud|âmbar|ambar)\b/i.test(normalized)) return 'leather';
  if (/\b(luxo|premium)\b|eleg\w+|sofistic/i.test(normalized)) return 'luxury';
  return 'default';
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function getAppliedFilterChips(filters, searchTerm) {
  return [
    searchTerm.trim() ? { label: 'Busca', value: searchTerm.trim() } : null,
    filters.category !== ALL_VALUE ? { label: 'Tipo', value: filters.category } : null,
    filters.gender !== ALL_VALUE ? { label: 'Gênero', value: filters.gender } : null,
    filters.brand !== ALL_VALUE ? { label: 'Marca', value: filters.brand } : null,
    filters.availabilityStatus !== 'all' ? { label: 'Disponibilidade', value: filters.availabilityStatus } : null,
    filters.priceRange !== 'all' ? { label: 'Preço', value: filters.priceRange } : null,
    filters.imageMode !== 'all' ? { label: 'Imagem', value: filters.imageMode } : null,
    filters.sortBy !== 'featured' ? { label: 'Ordem', value: filters.sortBy } : null,
  ].filter(Boolean);
}

function syncCatalogUrl(filters, searchTerm) {
  const params = new URLSearchParams();
  const normalizedSearch = searchTerm.trim();

  if (normalizedSearch) {
    params.set('busca', normalizedSearch);
  }

  if (filters.category !== ALL_VALUE) {
    params.set('tipo', filters.category);
  }

  const query = params.toString();
  const nextUrl = query ? `/catalogo?${query}` : '/catalogo';
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (window.location.pathname === '/catalogo' && currentUrl !== nextUrl) {
    window.history.replaceState(null, '', nextUrl);
  }
}

export function ProductCatalog() {
  const initialCatalogState = useMemo(() => getInitialCatalogState(), []);
  const [draftSearchTerm, setDraftSearchTerm] = useState(initialCatalogState.searchTerm);
  const [searchTerm, setSearchTerm] = useState(initialCatalogState.searchTerm);
  const [filters, setFilters] = useState(initialCatalogState.filters);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const [shouldScrollToResults, setShouldScrollToResults] = useState(Boolean(new URLSearchParams(window.location.search).get('src')));
  const [activeDiscoveryChipIds, setActiveDiscoveryChipIds] = useState([]);
  const [isSemanticLoading, setIsSemanticLoading] = useState(false);
  const [semanticRuntimeState, setSemanticRuntimeState] = useState('idle');
  const [interpretedIntent, setInterpretedIntent] = useState({ matchedSignals: [], semanticEntity: null });
  const [enableSemanticHydration, setEnableSemanticHydration] = useState(false);
  const resultsRef = useRef(null);

  const catalogProducts = useMemo(() => getAllProducts(), []);
  const featuredCollections = useMemo(() => getFeaturedCollections(catalogProducts), [catalogProducts]);

  const filterOptions = useMemo(() => {
    return {
      categories: uniqueSorted(catalogProducts.map((product) => product.catalogType)),
      genders: uniqueSorted(catalogProducts.map((product) => product.gender)),
      brands: uniqueSorted(catalogProducts.map((product) => product.brand)),
    };
  }, [catalogProducts]);

  const baseFilteredProducts = useMemo(
    () => filterAndSortCatalogProducts(catalogProducts, filters, searchTerm),
    [catalogProducts, filters, searchTerm],
  );

  const filteredProducts = useMemo(() => baseFilteredProducts.filter((product) => matchDiscoveryTags(product, activeDiscoveryChipIds)), [baseFilteredProducts, activeDiscoveryChipIds]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const relatedRecommendations = useMemo(() => {
    if (!enableSemanticHydration) return [];
    return getContextualRecommendations({ catalogProducts, filteredProducts, searchTerm, activeChipIds: activeDiscoveryChipIds });
  }, [activeDiscoveryChipIds, catalogProducts, enableSemanticHydration, filteredProducts, searchTerm]);
  const heroRecommendation = relatedRecommendations[0] ?? filteredProducts[0] ?? null;
  const spotlightProducts = useMemo(() => {
    const source = [...relatedRecommendations, ...filteredProducts].filter(Boolean);
    const deduped = [];
    const seen = new Set();
    source.forEach((product) => {
      if (!product || seen.has(product.id) || (heroRecommendation && product.id === heroRecommendation.id)) return;
      seen.add(product.id);
      deduped.push(product);
    });
    return deduped.slice(0, 4);
  }, [filteredProducts, heroRecommendation, relatedRecommendations]);
  const hasMoreProducts = visibleProducts.length < filteredProducts.length;
  const remainingProducts = filteredProducts.length - visibleProducts.length;
  const appliedFilterChips = useMemo(() => getAppliedFilterChips(filters, searchTerm), [filters, searchTerm]);
  const discoveryChips = useMemo(() => getDiscoveryChips(), []);
  const discoveryGroups = useMemo(() => buildDiscoveryGroups(catalogProducts, activeDiscoveryChipIds), [catalogProducts, activeDiscoveryChipIds]);

  const semanticSignalChips = useMemo(() => {
    const topSignals = (interpretedIntent.matchedSignals ?? []).slice(0, 4).map((entry) => formatSemanticChip(entry.signal));
    const atmosphereChip = interpretedIntent.semanticEntity?.atmosphere ? formatSemanticChip(interpretedIntent.semanticEntity.atmosphere) : null;
    const climateChip = interpretedIntent.semanticEntity?.climate ? formatSemanticChip(interpretedIntent.semanticEntity.climate) : null;
    return [...new Set([...topSignals, atmosphereChip, climateChip].filter(Boolean))].slice(0, 4);
  }, [interpretedIntent]);

  useEffect(() => {
    const startedAt = performance.now();
    if (import.meta.env.DEV) console.info('[Catalog] mount');
    preloadSemanticRuntime();
    const id = window.setTimeout(() => {
      setEnableSemanticHydration(true);
      if (import.meta.env.DEV) console.info('[Catalog] semantic modules hydration enabled');
    }, 450);
    if (import.meta.env.DEV) {
      requestAnimationFrame(() => console.info('[Catalog] first paint ms', Math.round(performance.now() - startedAt)));
    }
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const normalizedTerm = searchTerm.trim();

    if (!normalizedTerm) {
      setInterpretedIntent({ matchedSignals: [], semanticEntity: null });
      setSemanticRuntimeState('idle');
      return;
    }

    let isMounted = true;
    setSemanticRuntimeState('loading');

    loadSearchRuntime()
      .then(({ queryUnderstanding }) => {
        if (import.meta.env.DEV) console.info('[Catalog] semantic query runtime loaded');
        if (!isMounted) return;
        setInterpretedIntent(queryUnderstanding.interpretUserIntent(normalizedTerm));
        setSemanticRuntimeState('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setInterpretedIntent({ matchedSignals: [], semanticEntity: null });
        setSemanticRuntimeState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [searchTerm]);

  function resetPagination() {
    setVisibleCount(PRODUCTS_PER_PAGE);
  }

  function handleApplySearch(term) {
    const normalizedTerm = term.trim();

    setDraftSearchTerm(normalizedTerm);
    setSearchTerm(normalizedTerm);
    setVisibleCount(PRODUCTS_PER_PAGE);
    syncCatalogUrl(filters, normalizedTerm);
    trackEvent('search_submit', { searchTerm: normalizedTerm, sourcePage: 'catalog' });
  }

  function handleSearchChange(value) {
    setDraftSearchTerm(value);
  }


  function toggleDiscoveryChip(chipId) {
    setActiveDiscoveryChipIds((currentIds) => currentIds.includes(chipId) ? currentIds.filter((id) => id !== chipId) : [...currentIds, chipId]);
    resetPagination();
  }

  function clearSearch() {
    setDraftSearchTerm('');
    setSearchTerm('');
    setVisibleCount(PRODUCTS_PER_PAGE);
    syncCatalogUrl(filters, '');
  }

  useEffect(() => {
    syncCatalogUrl(filters, searchTerm);
    applyCatalogSeo({ filters, searchTerm, resultCount: filteredProducts.length });
  }, [filteredProducts.length, filters, searchTerm]);

  useEffect(() => {
    trackEvent('catalog_view', { result_count: filteredProducts.length, source_page: 'catalog' }, { dedupeKey: `catalog_view|${window.location.search}|${filteredProducts.length}`, dedupeMs: 1500 });
  }, [filteredProducts.length]);

  useEffect(() => {
    const normalizedQuery = searchTerm.trim();

    if (!normalizedQuery) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      trackSearch({ searchTerm: normalizedQuery, resultCount: filteredProducts.length, sourcePage: 'catalog' });
      if (filteredProducts.length === 0) {
        trackEvent('empty_search_result', { searchTerm: normalizedQuery, resultCount: 0, sourcePage: 'catalog' });
      }
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [filteredProducts.length, searchTerm]);


  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedTerm = draftSearchTerm.trim();
      setSearchTerm(normalizedTerm);
      setVisibleCount(PRODUCTS_PER_PAGE);
    }, 280);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearchTerm]);


  useEffect(() => {
    const hasSemanticContext = Boolean(searchTerm.trim() || activeDiscoveryChipIds.length);
    if (!hasSemanticContext) {
      setIsSemanticLoading(false);
      return undefined;
    }

    const startedAt = Date.now();
    setIsSemanticLoading(true);

    const completionId = window.setTimeout(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 1700 - elapsed);
      window.setTimeout(() => setIsSemanticLoading(false), remaining);
    }, 320);

    const safetyId = window.setTimeout(() => setIsSemanticLoading(false), 5000);

    return () => {
      window.clearTimeout(completionId);
      window.clearTimeout(safetyId);
    };
  }, [searchTerm, filters, activeDiscoveryChipIds]);

  useEffect(() => {
    if (!shouldScrollToResults || !resultsRef.current) return;
    resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShouldScrollToResults(false);
  }, [filteredProducts.length, shouldScrollToResults]);

  function handleFilterChange(filterName, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [filterName]: value }));
    trackEvent('filter_apply', { filter_name: filterName, filter_value: value, source_page: 'catalog' });
    resetPagination();
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setDraftSearchTerm('');
    setSearchTerm('');
    resetPagination();
  }

  function loadMoreProducts() {
    trackEvent('catalog_load_more', { visible_count: visibleProducts.length, result_count: filteredProducts.length, source_page: 'catalog' });
    setVisibleCount((currentCount) => currentCount + PRODUCTS_PER_PAGE);
  }

  return (
    <section id="catalogo" data-semantic-mood={resolveSemanticMood(searchTerm)} className="lazule-cinematic-section relative mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-20 lg:py-24">
      <div className="mb-7 grid gap-5 sm:mb-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)] lg:items-end">
        <div className="max-w-3xl">
          <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-lazule-gold sm:mb-4 sm:text-xs sm:tracking-[0.38em]">
            Catálogo premium
          </p>
          <h2 className="font-display text-[clamp(2.25rem,11vw,3rem)] leading-[1.02] text-lazule-mist sm:text-5xl">Descubra sua próxima assinatura olfativa.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300 sm:mt-5 sm:text-base sm:leading-7">
            Uma seleção editorial de importados, árabes e nicho com apoio consultivo para escolher com segurança e desejo.
          </p>
        </div>

        <div className="lazule-surface-premium rounded-[1.6rem] border border-lazule-gold/20 bg-lazule-depth/80 p-3.5 shadow-mineral backdrop-blur sm:rounded-[2rem] sm:p-5">
          <SearchBar
            value={draftSearchTerm}
            onChange={handleSearchChange}
            onSubmit={handleApplySearch}
            onClear={clearSearch}
            hasSearch={Boolean(draftSearchTerm.trim() || searchTerm.trim())}
            onFocus={() => {
              if (semanticRuntimeState === 'idle') {
                setSemanticRuntimeState('loading');
              }
              void loadSearchRuntime()
                .then(() => setSemanticRuntimeState((state) => (state === 'loading' ? 'ready' : state)))
                .catch(() => setSemanticRuntimeState('error'));
            }}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 sm:mb-6">
        {discoveryChips.map((chip) => {
          const active = activeDiscoveryChipIds.includes(chip.id);
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => toggleDiscoveryChip(chip.id)}
              className={`lazule-premium-button rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${active ? 'laz-pulse border-[var(--laz-border-premium)] bg-[#b7924924] text-[#f1e4c6]' : 'border-[var(--laz-border-mineral)] bg-[#0f1d38ad] text-[#cad8f2] hover:border-[#92afe57a] hover:text-lazule-mist'}`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
        <AdvancedFilters
          filters={filters}
          options={filterOptions}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
        />

        <div className="min-w-0" ref={resultsRef} id="catalog-results">
          <div className="mb-6 grid gap-4">
            <SemanticSearchLoading isActive={isSemanticLoading} interpretedChips={semanticSignalChips} />
            <div className="lazule-feedback-card laz-reveal flex flex-col gap-3 rounded-[1.5rem] border border-[var(--laz-border-mineral)] bg-[#0e1b36c7] px-4 py-4 text-sm text-slate-300 shadow-mineral sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <strong className="text-lazule-mist">{filteredProducts.length}</strong> resultado(s) {searchTerm ? 'encontrado(s)' : 'curado(s)'}
                </span>
                <span>
                  Total no catálogo: <strong className="text-lazule-gold">{catalogProducts.length}</strong>
                </span>
              </div>

              {searchTerm && <p className="text-lazule-gold">Resultados para: <strong>"{searchTerm}"</strong></p>}


              {activeDiscoveryChipIds.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3" aria-label="Discovery ativo">
                  {activeDiscoveryChipIds.map((chipId) => {
                    const chip = discoveryChips.find((entry) => entry.id === chipId);
                    if (!chip) return null;
                    return (
                      <span key={chip.id} className="rounded-full border border-lazule-gold/35 bg-lazule-gold/10 px-3 py-1 text-xs font-semibold text-lazule-gold">
                        Descoberta: <span className="text-lazule-mist">{chip.label}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {appliedFilterChips.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3" aria-label="Filtros ativos">
                  {appliedFilterChips.map((chip) => (
                    <span key={`${chip.label}-${chip.value}`} className="rounded-full border border-lazule-gold/30 bg-lazule-gold/10 px-3 py-1 text-xs font-semibold text-lazule-gold">
                      {chip.label}: <span className="text-lazule-mist">{chip.value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>


          {discoveryGroups.length > 0 && (
            <div className="lazule-editorial-flow lazule-flow-bridge mb-8 grid gap-4 sm:grid-cols-2">
              {discoveryGroups.slice(0, 2).map((group) => (
                <article key={group.id} className="lazule-surface-premium laz-converge relative overflow-hidden rounded-2xl border bg-[#0f1b35d4] p-4">
                  <span className="lazule-ambient-layer" />
                  <p className="text-[0.62rem] uppercase tracking-[0.2em] text-lazule-gold">Curadoria contextual</p>
                  <h3 className="mt-2 font-display text-xl text-lazule-mist">{group.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.products.slice(0, 3).map((product) => (
                      <a key={product.id} href={product.productPath} className="rounded-full border border-[var(--laz-border-mineral)] bg-[#0c1730a3] px-3 py-1 text-xs text-slate-300 hover:border-[var(--laz-border-premium)] hover:text-lazule-mist">{product.name}</a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {filteredProducts.length > 0 ? (
            <>
              {heroRecommendation && (
                <article className="lazule-editorial-flow lazule-hero-block relative mb-8 overflow-hidden rounded-[1.9rem] border border-[var(--laz-border-mineral)] p-5 sm:p-6">
                  <span className="pointer-events-none absolute inset-0 lazule-hero-aura" />
                  <div className="relative z-[1] mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-lazule-gold/40 bg-lazule-gold/10 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-lazule-gold">Vitrine sensorial</span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-slate-300">{searchTerm ? `Curadoria para “${searchTerm}”` : 'Curadoria viva LAZULE'}</span>
                  </div>
                  <div className="relative z-[1] grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
                    <div>
                      <h3 className="font-display text-3xl leading-tight text-lazule-mist sm:text-4xl">{heroRecommendation.name}</h3>
                      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">{heroRecommendation.narrative || heroRecommendation.description || 'Destaque contextual recomendado pela inteligência olfativa LAZULE.'}</p>
                    </div>
                    <ProductCard product={heroRecommendation} analyticsSection="catalog_hero" highlightQuery={searchTerm} variant="hero" />
                  </div>
                </article>
              )}

              {spotlightProducts.length > 0 && (
                <section className="lazule-editorial-flow lazule-flow-bridge mb-8">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="font-display text-2xl text-lazule-mist">Streaming de descoberta</h4>
                    <p className="text-[0.62rem] uppercase tracking-[0.2em] text-slate-400">handoff contextual</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {spotlightProducts.map((product, index) => (
                      <ProductCard key={product.id} product={product} analyticsSection="catalog_spotlight" highlightQuery={searchTerm} variant={index % 3 === 0 ? 'featured' : 'default'} />
                    ))}
                  </div>
                </section>
              )}

              <div className="lazule-organic-grid grid gap-4 min-[520px]:grid-cols-2 md:gap-5 xl:grid-cols-6">
                {visibleProducts.map((product, index) => (
                  <div key={product.id} className={index % 7 === 0 ? 'xl:col-span-3' : index % 5 === 0 ? 'xl:col-span-3' : 'xl:col-span-2'}>
                    <ProductCard product={product} analyticsSection="catalog_grid" highlightQuery={searchTerm} variant={index % 7 === 0 ? 'featured' : 'default'} />
                  </div>
                ))}
              </div>

              {hasMoreProducts && (
                <div className="mt-10 flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    className="lazule-premium-button lazule-cta-shimmer group relative inline-flex min-h-12 w-full items-center justify-center overflow-hidden rounded-full border border-[#2c58a8] bg-gradient-to-r from-[#17356a] via-[#214886] to-[#193b73] px-5 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#ecf2ff] shadow-mineral focus:outline-none focus:ring-2 focus:ring-[#5a8eff8a] focus:ring-offset-2 focus:ring-offset-lazule-night sm:w-auto sm:px-8 sm:tracking-[0.22em]"
                    onClick={loadMoreProducts}
                  >
                    <span className="relative">Carregar mais fragrâncias</span>
                  </button>
                  <p className="max-w-sm text-xs uppercase leading-5 tracking-[0.14em] text-slate-400 sm:tracking-[0.24em]">
                    Exibindo <strong className="text-lazule-gold">{visibleProducts.length}</strong> de{' '}
                    <strong className="text-lazule-gold">{filteredProducts.length}</strong> fragrâncias — mais{' '}
                    <strong className="text-lazule-mist">{Math.min(PRODUCTS_PER_PAGE, remainingProducts)}</strong> no próximo toque
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="lazule-surface-premium laz-converge rounded-[2rem] border bg-[#0d1a33d6] p-6 text-center sm:p-10">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#a9bbe0] sm:tracking-[0.35em]">Curadoria LAZULE</p>
              <h3 className="font-display text-3xl leading-tight text-lazule-mist">Não encontramos algo exatamente nessa direção — mas seguimos na sua atmosfera.</h3>
              <p className="mx-auto mt-4 max-w-2xl text-slate-300">
                Não deixamos sua descoberta morrer: expandimos leitura semântica, vibe e contexto social para manter opções relevantes.
              </p>
              <a
                className="lazule-premium-button lazule-cta-shimmer mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#2c58a8] bg-gradient-to-r from-[#17356a] via-[#214886] to-[#193b73] px-6 py-3 text-center text-sm font-semibold text-[#ecf2ff] shadow-mineral sm:w-auto"
                href={createWhatsAppLink('Olá! Quero uma curadoria personalizada da LAZULE FRAGRANCES.')}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsAppClick({ cta_location: 'empty_results', source_page: 'catalog', search_term: searchTerm })}
              >
                Pedir curadoria no WhatsApp
              </a>
              </div>
              {relatedRecommendations.length > 0 && (
                <div className="rounded-[1.5rem] border border-[var(--laz-border-mineral)] bg-[#0d1a32c8] p-4 sm:p-5">
                  <p className="text-[0.62rem] uppercase tracking-[0.2em] text-lazule-gold">Fallback inteligente</p>
                  <h4 className="mt-2 font-display text-2xl text-lazule-mist">Você também pode gostar</h4>
                  <p className="mt-2 text-sm text-slate-300">Selecionamos fragrâncias próximas da vibe buscada para manter sua descoberta fluida.</p>
                  <div className="mt-4 grid gap-3 min-[480px]:grid-cols-2">
                    {relatedRecommendations.slice(0, 4).map((product) => (
                      <a key={product.id} href={product.productPath} className="rounded-xl border border-white/10 px-3 py-2 text-left text-sm text-slate-200 hover:border-lazule-gold/40">
                        <span className="block text-[0.62rem] uppercase tracking-[0.18em] text-slate-400">{product.brand}</span>
                        <span className="block text-base text-lazule-mist">{product.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CatalogHighlights collections={featuredCollections} className="mb-0 mt-16 sm:mt-20 lg:mt-24" />
    </section>
  );
}
