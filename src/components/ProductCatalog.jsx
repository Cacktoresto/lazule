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

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
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

  function resetPagination() {
    setVisibleCount(PRODUCTS_PER_PAGE);
  }

  function handleSearchChange(value) {
    setSearchTerm(value);
    resetPagination();
  }

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
    setSearchTerm('');
    resetPagination();
  }

  function loadMoreProducts() {
    setVisibleCount((currentCount) => currentCount + PRODUCTS_PER_PAGE);
  }

  return (
    <section id="catalogo" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
      <div className="mb-10 max-w-3xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.38em] text-lazule-gold">
          Catálogo premium
        </p>
        <h2 className="font-display text-4xl text-lazule-mist sm:text-5xl">Escolha sua próxima assinatura olfativa.</h2>
        <p className="mt-5 text-base leading-7 text-slate-300">
          Produtos selecionados para atendimento personalizado. Consulte disponibilidade pelo WhatsApp antes de finalizar seu pedido.
        </p>
      </div>

      <CatalogHighlights collections={featuredCollections} />

      <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
        <AdvancedFilters
          filters={filters}
          options={filterOptions}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
        />

        <div>
          <div className="mb-6 grid gap-4">
            <SearchBar value={searchTerm} onChange={handleSearchChange} />
            <div className="flex flex-col gap-2 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <strong className="text-lazule-mist">{filteredProducts.length}</strong> fragrâncias encontradas na seleção
              </span>
              <span>
                Total no catálogo: <strong className="text-lazule-gold">{catalogProducts.length}</strong>
              </span>
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} analyticsSection="catalog_grid" />
                ))}
              </div>

              {hasMoreProducts && (
                <div className="mt-10 flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    className="lazule-premium-button lazule-cta-shimmer group relative inline-flex overflow-hidden rounded-full border border-lazule-gold/40 bg-lazule-gold px-8 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-lazule-night shadow-aureate focus:outline-none focus:ring-2 focus:ring-lazule-gold focus:ring-offset-2 focus:ring-offset-lazule-night"
                    onClick={loadMoreProducts}
                  >
                    <span className="relative">Carregar mais fragrâncias</span>
                  </button>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    Exibindo <strong className="text-lazule-mist">{visibleProducts.length}</strong> de{' '}
                    <strong className="text-lazule-gold">{filteredProducts.length}</strong> fragrâncias — mais{' '}
                    <strong className="text-lazule-mist">{Math.min(PRODUCTS_PER_PAGE, remainingProducts)}</strong> no próximo toque
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[2rem] border border-lazule-gold/20 bg-white/[0.05] p-10 text-center shadow-mineral">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-lazule-gold">Curadoria LAZULE</p>
              <h3 className="font-display text-3xl text-lazule-mist">Não encontramos esse perfume no momento, mas nossa curadoria pode te ajudar pelo WhatsApp.</h3>
              <p className="mx-auto mt-4 max-w-2xl text-slate-300">
                Conte para nossa equipe a referência olfativa, ocasião ou faixa de investimento desejada e buscamos uma alternativa à altura.
              </p>
              <a
                className="mt-7 inline-flex rounded-full bg-lazule-gold px-6 py-3 text-sm font-semibold text-lazule-night transition hover:bg-[#dfbd68]"
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
