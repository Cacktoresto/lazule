import { useMemo, useState } from 'react';
import { getCatalogProducts } from '../utils/catalog';
import { navigateSpa } from '../utils/navigation';
import { createProductPath, createProductSlug } from '../utils/productRouting';
import { findBestProductMatch } from '../utils/search';
import { trackEvent } from '../utils/analytics';

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

    trackEvent('search_navigation', {
      query: normalizedTerm,
      destination,
      score: match?.score,
      productId: matchedProduct?.id,
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
        <div className={`grid gap-3 border border-lazule-gold/25 bg-lazule-night/75 shadow-aureate backdrop-blur sm:grid-cols-[1fr_auto] ${
          compact ? 'grid-cols-[1fr_auto] rounded-full p-1.5' : 'rounded-[1.8rem] p-2 sm:rounded-full sm:p-2.5'
        }`}>
          <input
            id="product-navigation-search"
            className={`min-h-12 rounded-full border border-white/10 bg-white/[0.08] px-4 text-base text-lazule-mist outline-none placeholder:text-slate-400 transition duration-200 hover:border-lazule-gold/40 focus-visible:border-lazule-gold/75 focus-visible:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night ${compact ? 'py-2' : 'py-3'}`}
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={compact ? 'Buscar perfume' : 'Digite Asad, Sauvage, Hacivat...'}
            autoComplete="off"
            inputMode="search"
          />
          <button
            className={`lazule-premium-button lazule-cta-shimmer min-h-12 rounded-full bg-lazule-gold text-sm font-semibold text-lazule-night shadow-aureate ${compact ? 'px-5' : 'px-6'}`}
            type="submit"
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
