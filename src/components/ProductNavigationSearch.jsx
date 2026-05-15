import { useMemo, useState } from 'react';
import { getCatalogProducts } from '../utils/catalog';
import { navigateSpa } from '../utils/navigation';
import { createProductPath, createProductSlug } from '../utils/productRouting';
import { findBestProductMatch } from '../utils/search';
import { trackEvent, trackSearch } from '../utils/analytics';

function createNotFoundPath(term) {
  return `/produto-nao-encontrado?q=${encodeURIComponent(term)}`;
}

function createSuggestionPath(term, product) {
  const params = new URLSearchParams({ q: term, suggestion: createProductSlug(product.name) });

  return `/produto-sugerido?${params.toString()}`;
}

export function ProductNavigationSearch({ className = '', compact = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const catalogProducts = useMemo(() => getCatalogProducts(), []);

  function handleSubmit(event) {
    event.preventDefault();

    const normalizedTerm = searchTerm.trim();

    if (!normalizedTerm) {
      return;
    }

    const match = findBestProductMatch(normalizedTerm, catalogProducts);
    const matchedProduct = match?.product ?? null;
    const destination = match?.destination ?? 'product_not_found';

    trackEvent('search_submit', { searchTerm: normalizedTerm, sourcePage: compact ? 'home_sticky_search' : 'product_navigation_search' });
    trackSearch({
      searchTerm: normalizedTerm,
      resultCount: matchedProduct ? 1 : 0,
      sourcePage: compact ? 'home_sticky_search' : 'product_navigation_search',
      destination,
      score: match?.score,
      product_id: matchedProduct?.id,
    });

    if (!matchedProduct) {
      navigateSpa(createNotFoundPath(normalizedTerm));
      return;
    }

    navigateSpa(
      destination === 'direct'
        ? createProductPath(matchedProduct)
        : createSuggestionPath(normalizedTerm, matchedProduct),
    );
  }

  return (
    <form className={`w-full ${className}`} role="search" aria-label="Buscar e abrir perfume" onSubmit={handleSubmit}>
      <label className="block w-full" htmlFor="product-navigation-search">
        {!compact && (
          <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">
            Encontre seu perfume
          </span>
        )}
        <div className={`lazule-search-shell group grid gap-3 border border-lazule-gold/20 bg-lazule-night/70 shadow-aureate backdrop-blur-xl transition duration-300 focus-within:border-lazule-gold/65 focus-within:bg-lazule-night/86 focus-within:shadow-[0_18px_54px_rgba(200,162,77,0.14)] sm:grid-cols-[1fr_auto] ${
          compact ? 'grid-cols-[1fr_auto] rounded-full p-1.5' : 'rounded-[1.8rem] p-2 sm:rounded-full sm:p-2.5'
        }`}>
          <div className="relative min-w-0">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lazule-gold/68 transition duration-300 group-focus-within:scale-110 group-focus-within:text-lazule-gold"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
            >
              <path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
            <input
              id="product-navigation-search"
              className={`min-h-12 w-full rounded-full border border-white/10 bg-white/[0.075] px-4 pl-11 text-base text-lazule-mist outline-none placeholder:text-slate-400 transition duration-300 hover:border-lazule-gold/40 focus-visible:border-lazule-gold/75 focus-visible:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-lazule-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night ${compact ? 'py-2' : 'py-3'}`}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => trackEvent('search_focus', { source_page: compact ? 'home_sticky_search' : 'product_navigation_search' })}
              placeholder={compact ? 'Buscar perfume' : 'Digite Asad, Sauvage, Hacivat...'}
              autoComplete="off"
              inputMode="search"
            />
          </div>
          <button
            className={`lazule-premium-button lazule-cta-shimmer min-h-12 rounded-full bg-lazule-gold text-sm font-semibold text-lazule-night shadow-aureate ${compact ? 'px-5' : 'px-6'}`}
            type="submit"
            aria-label={compact ? 'Pesquisar perfume' : undefined}
          >
            <span className="relative z-10">{compact ? 'Ir' : 'Pesquisar'}</span>
          </button>
        </div>
      </label>
      {!compact && (
        <p className="mt-3 text-xs leading-5 text-slate-400">
          A busca abre diretamente o produto mais relevante. Se não encontrarmos, consultamos disponibilidade para você.
        </p>
      )}
    </form>
  );
}
