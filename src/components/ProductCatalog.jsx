import { useEffect, useMemo, useState } from 'react';
import { createWhatsAppLink } from '../utils/whatsapp';
import { getCatalogProducts, getFeaturedCollections } from '../utils/catalog';
import { trackEvent, trackWhatsAppClick } from '../utils/analytics';
import { filterAndSortCatalogProducts } from '../utils/catalogFilters';
import { AdvancedFilters, ALL_VALUE } from './AdvancedFilters';
import { ProductCard } from './ProductCard';
import { SearchBar } from './SearchBar';
import { CatalogHighlights } from './CatalogHighlights';

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

function getInitialCatalogState() {
  const params = new URLSearchParams(window.location.search);
  const category = CATALOG_QUERY_PARAMS.map((param) => params.get(param)).find(Boolean) ?? DEFAULT_FILTERS.category;

  return {
    filters: { ...DEFAULT_FILTERS, category },
    searchTerm: params.get('busca') ?? params.get('q') ?? '',
  };
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

  const catalogProducts = useMemo(() => getCatalogProducts(), []);
  const featuredCollections = useMemo(() => getFeaturedCollections(catalogProducts), [catalogProducts]);

  const filterOptions = useMemo(() => {
    return {
      categories: uniqueSorted(catalogProducts.map((product) => product.catalogType)),
      genders: uniqueSorted(catalogProducts.map((product) => product.gender)),
      brands: uniqueSorted(catalogProducts.map((product) => product.brand)),
    };
  }, [catalogProducts]);

  const filteredProducts = useMemo(
    () => filterAndSortCatalogProducts(catalogProducts, filters, searchTerm),
    [catalogProducts, filters, searchTerm],
  );

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMoreProducts = visibleProducts.length < filteredProducts.length;
  const remainingProducts = filteredProducts.length - visibleProducts.length;
  const appliedFilterChips = useMemo(() => getAppliedFilterChips(filters, searchTerm), [filters, searchTerm]);

  function resetPagination() {
    setVisibleCount(PRODUCTS_PER_PAGE);
  }

  function applySearch(nextSearchTerm = draftSearchTerm) {
    setSearchTerm(nextSearchTerm.trim());
    resetPagination();
  }

  function handleSearchChange(value) {
    setDraftSearchTerm(value);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    applySearch();
  }

  function clearSearch() {
    setDraftSearchTerm('');
    setSearchTerm('');
    resetPagination();
  }

  useEffect(() => {
    syncCatalogUrl(filters, searchTerm);
  }, [filters, searchTerm]);

  useEffect(() => {
    const normalizedQuery = searchTerm.trim();

    if (!normalizedQuery) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      trackEvent('search', { query: normalizedQuery, resultCount: filteredProducts.length });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [filteredProducts.length, searchTerm]);

  function handleFilterChange(filterName, value) {
    setFilters((currentFilters) => ({ ...currentFilters, [filterName]: value }));
    resetPagination();
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setDraftSearchTerm('');
    setSearchTerm('');
    resetPagination();
  }

  function loadMoreProducts() {
    setVisibleCount((currentCount) => currentCount + PRODUCTS_PER_PAGE);
  }

  return (
    <section id="catalogo" className="relative mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20 lg:py-24">
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)] lg:items-end">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-lazule-gold sm:tracking-[0.38em]">
            Catálogo premium
          </p>
          <h2 className="font-display text-4xl leading-tight text-lazule-mist sm:text-5xl">Escolha sua próxima assinatura olfativa.</h2>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Produtos selecionados para atendimento personalizado. Consulte disponibilidade pelo WhatsApp antes de finalizar seu pedido.
          </p>
        </div>

        <div className="rounded-[2rem] border border-lazule-gold/20 bg-lazule-depth/80 p-4 shadow-mineral backdrop-blur sm:p-5">
          <SearchBar
            value={draftSearchTerm}
            onChange={handleSearchChange}
            onSubmit={handleSearchSubmit}
            onClear={clearSearch}
            hasSearch={Boolean(draftSearchTerm.trim() || searchTerm.trim())}
          />
        </div>
      </div>

      <CatalogHighlights collections={featuredCollections} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <AdvancedFilters
          filters={filters}
          options={filterOptions}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
        />

        <div className="min-w-0">
          <div className="mb-6 grid gap-4">
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300 sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <strong className="text-lazule-mist">{filteredProducts.length}</strong> fragrâncias encontradas na seleção
                </span>
                <span>
                  Total no catálogo: <strong className="text-lazule-gold">{catalogProducts.length}</strong>
                </span>
              </div>

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

          {filteredProducts.length > 0 ? (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} analyticsSection="catalog_grid" />
                ))}
              </div>

              {hasMoreProducts && (
                <div className="mt-10 flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    className="lazule-premium-button lazule-cta-shimmer group relative inline-flex min-h-12 w-full items-center justify-center overflow-hidden rounded-full border border-lazule-gold/40 bg-lazule-gold px-6 py-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-lazule-night shadow-aureate focus:outline-none focus:ring-2 focus:ring-lazule-gold focus:ring-offset-2 focus:ring-offset-lazule-night sm:w-auto sm:px-8 sm:tracking-[0.22em]"
                    onClick={loadMoreProducts}
                  >
                    <span className="relative">Carregar mais fragrâncias</span>
                  </button>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 sm:tracking-[0.24em]">
                    Exibindo <strong className="text-lazule-gold">{visibleProducts.length}</strong> de{' '}
                    <strong className="text-lazule-gold">{filteredProducts.length}</strong> fragrâncias — mais{' '}
                    <strong className="text-lazule-mist">{Math.min(PRODUCTS_PER_PAGE, remainingProducts)}</strong> no próximo toque
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[2rem] border border-lazule-gold/20 bg-white/[0.05] p-6 text-center shadow-mineral sm:p-10">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-lazule-gold sm:tracking-[0.35em]">Curadoria LAZULE</p>
              <h3 className="font-display text-3xl leading-tight text-lazule-mist">Não encontramos esse perfume no momento.</h3>
              <p className="mx-auto mt-4 max-w-2xl text-slate-300">
                Fale com a curadoria LAZULE pelo WhatsApp que ajudamos você a encontrar uma alternativa.
              </p>
              <a
                className="lazule-premium-button lazule-cta-shimmer mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-lazule-gold px-6 py-3 text-center text-sm font-semibold text-lazule-night shadow-aureate sm:w-auto"
                href={createWhatsAppLink('Olá! Quero uma curadoria personalizada da LAZULE FRAGRANCES.')}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsAppClick({ section: 'empty_results', query: searchTerm })}
              >
                Pedir curadoria no WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
