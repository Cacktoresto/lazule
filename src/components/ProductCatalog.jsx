import { useMemo, useState } from 'react';
import { products } from '../data/products';
import { createWhatsAppLink } from '../utils/whatsapp';
import { createSearchIndex, inferBrandFromName, normalizeSearchText } from '../utils/search';
import { AdvancedFilters, ALL_VALUE, PRICE_RANGES } from './AdvancedFilters';
import { ProductCard } from './ProductCard';
import { SearchBar } from './SearchBar';

const DEFAULT_FILTERS = {
  category: ALL_VALUE,
  gender: ALL_VALUE,
  brand: ALL_VALUE,
  priceRange: 'all',
  imageMode: 'all',
  availableOnly: false,
  sortBy: 'featured',
};

const PRODUCTS_PER_PAGE = 24;
const PROMOTIONAL_NAME_PATTERN = /^-?\s*\d+\s*%\s*off$/i;

function isPromotionalName(value) {
  return PROMOTIONAL_NAME_PATTERN.test(String(value ?? '').trim());
}

function getSafeProductName(product) {
  if (!isPromotionalName(product.name)) {
    return product.name;
  }

  const description = String(product.description ?? '').trim();

  if (description && !isPromotionalName(description)) {
    return description;
  }

  return 'Fragrância LAZULE';
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function matchesSearch(product, normalizedSearch) {
  if (!normalizedSearch) {
    return true;
  }

  const terms = normalizedSearch.split(' ').filter(Boolean);
  return terms.every((term) => product.searchIndex.includes(term));
}

function getPriceRange(value) {
  return PRICE_RANGES.find((range) => range.value === value) ?? PRICE_RANGES[0];
}

function sortProducts(productsToSort, sortBy) {
  const sortedProducts = [...productsToSort];

  if (sortBy === 'price-asc') {
    return sortedProducts.sort((a, b) => a.salePrice - b.salePrice);
  }

  if (sortBy === 'price-desc') {
    return sortedProducts.sort((a, b) => b.salePrice - a.salePrice);
  }

  if (sortBy === 'name-asc') {
    return sortedProducts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  if (sortBy === 'brand-asc') {
    return sortedProducts.sort((a, b) => a.brand.localeCompare(b.brand, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  }

  return sortedProducts.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, 'pt-BR'));
}

export function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);

  const catalogProducts = useMemo(() => {
    return products.map((product) => {
      const safeName = getSafeProductName(product);
      const inferredBrand = product.brand && !isPromotionalName(product.brand) ? product.brand : inferBrandFromName(safeName);
      const brand = inferredBrand || inferBrandFromName(safeName);
      const enrichedProduct = { ...product, name: safeName, originalName: product.name, brand };

      return {
        ...enrichedProduct,
        normalizedBrand: normalizeSearchText(brand),
        normalizedCategory: normalizeSearchText(product.category),
        normalizedGender: normalizeSearchText(product.gender),
        searchIndex: createSearchIndex(enrichedProduct),
      };
    });
  }, []);

  const filterOptions = useMemo(() => {
    return {
      categories: uniqueSorted(catalogProducts.map((product) => product.category)),
      genders: uniqueSorted(catalogProducts.map((product) => product.gender)),
      brands: uniqueSorted(catalogProducts.map((product) => product.brand)),
    };
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    const priceRange = getPriceRange(filters.priceRange);

    const matchedProducts = catalogProducts.filter((product) => {
      const matchesCategory = filters.category === ALL_VALUE || product.category === filters.category;
      const matchesGender = filters.gender === ALL_VALUE || product.gender === filters.gender;
      const matchesBrand = filters.brand === ALL_VALUE || product.brand === filters.brand;
      const matchesPrice = product.salePrice >= priceRange.min && product.salePrice <= priceRange.max;
      const matchesImage =
        filters.imageMode === 'all' ||
        (filters.imageMode === 'with' && Boolean(product.image)) ||
        (filters.imageMode === 'without' && !product.image);
      const matchesAvailability = !filters.availableOnly || product.available || product.badges?.includes('Pronta entrega');

      return (
        matchesSearch(product, normalizedSearch) &&
        matchesCategory &&
        matchesGender &&
        matchesBrand &&
        matchesPrice &&
        matchesImage &&
        matchesAvailability
      );
    });

    return sortProducts(matchedProducts, filters.sortBy);
  }, [catalogProducts, filters, searchTerm]);

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
                <strong className="text-lazule-mist">{filteredProducts.length}</strong> fragrâncias encontradas
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
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {hasMoreProducts && (
                <div className="mt-10 flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    className="group relative inline-flex overflow-hidden rounded-full border border-lazule-gold/40 bg-lazule-gold px-8 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-lazule-night shadow-aureate transition hover:-translate-y-0.5 hover:bg-[#dfbd68] focus:outline-none focus:ring-2 focus:ring-lazule-gold focus:ring-offset-2 focus:ring-offset-lazule-night"
                    onClick={loadMoreProducts}
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition duration-700 group-hover:translate-x-full" />
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
              <h3 className="font-display text-3xl text-lazule-mist">Nenhuma fragrância encontrada com esses filtros.</h3>
              <p className="mx-auto mt-4 max-w-2xl text-slate-300">
                Fale conosco no WhatsApp para uma curadoria personalizada.
              </p>
              <a
                className="mt-7 inline-flex rounded-full bg-lazule-gold px-6 py-3 text-sm font-semibold text-lazule-night transition hover:bg-[#dfbd68]"
                href={createWhatsAppLink('Olá! Quero uma curadoria personalizada da LAZULE FRAGRANCES.')}
                target="_blank"
                rel="noreferrer"
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
