import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductNavigationSearch } from './ProductNavigationSearch';
import { ProductCard } from './ProductCard';
import { getCatalogProducts, getFeaturedCollections } from '../utils/catalog';
import { createBrandPath } from '../utils/productRouting';

const categoryTiles = [
  {
    title: 'Importados',
    label: 'Ícones',
    href: '/catalogo?tipo=Importado',
    gradient: 'from-slate-100/20 via-lazule-blue/20 to-lazule-night',
  },
  {
    title: 'Árabes',
    label: 'Intensos',
    href: '/catalogo?tipo=%C3%81rabe',
    gradient: 'from-lazule-gold/30 via-amber-900/20 to-lazule-night',
  },
  {
    title: 'Nicho',
    label: 'Autorais',
    href: '/catalogo?tipo=Nicho',
    gradient: 'from-violet-200/20 via-lazule-royal/30 to-lazule-night',
  },
  {
    title: 'Femininos',
    label: 'Leves',
    href: '/catalogo?busca=Feminino',
    gradient: 'from-rose-200/20 via-lazule-blue/20 to-lazule-night',
  },
];

const curatedBrands = ['Azzaro', 'Carolina Herrera', 'Dior', 'Giorgio Armani', 'Lattafa', 'Montale', 'Paco Rabanne', 'Yves Saint Laurent'];

function Reveal({ as: Component = 'section', className = '', delay = 0, children, ...props }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.16 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      className={`lazule-reveal ${isVisible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...props}
    >
      {children}
    </Component>
  );
}

function SectionHeading({ eyebrow, title, actionHref, actionLabel = 'Ver tudo' }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 px-1">
      <div className="relative pl-4">
        <span className="absolute left-0 top-1 h-10 w-px rounded-full bg-gradient-to-b from-lazule-gold via-lazule-gold/40 to-transparent" aria-hidden="true" />
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold/90">{eyebrow}</p>
        <h2 className="mt-2 max-w-[13ch] font-display text-[2rem] leading-[0.92] text-lazule-mist sm:max-w-none sm:text-4xl">{title}</h2>
      </div>
      {actionHref && (
        <a className="lazule-inline-link shrink-0 rounded-full px-1 py-2 text-sm font-semibold text-lazule-gold" href={actionHref}>
          {actionLabel}
        </a>
      )}
    </div>
  );
}

function ProductRail({ eyebrow, title, products, actionHref }) {
  if (!products.length) {
    return null;
  }

  return (
    <Reveal className="py-9 sm:py-10">
      <SectionHeading eyebrow={eyebrow} title={title} actionHref={actionHref} />
      <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 pt-1 sm:gap-5">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="lazule-reveal-item w-[74vw] max-w-[19rem] shrink-0 snap-start scroll-ml-4 sm:w-[20rem]"
            style={{ '--item-delay': `${Math.min(index, 5) * 55}ms` }}
          >
            <ProductCard product={product} analyticsSection="home_editorial_rail" />
          </div>
        ))}
      </div>
    </Reveal>
  );
}

export function Home() {
  const { collections, heroProduct, brands } = useMemo(() => {
    const products = getCatalogProducts();
    const featuredCollections = getFeaturedCollections(products);
    const [firstHeroProduct] = featuredCollections.weeklySelection.length ? featuredCollections.weeklySelection : products;
    const availableBrandSet = new Set(products.map((product) => product.brand));
    const visibleBrands = curatedBrands.filter((brand) => availableBrandSet.has(brand));

    return {
      collections: featuredCollections,
      heroProduct: firstHeroProduct,
      brands: visibleBrands.length ? visibleBrands : [...availableBrandSet].slice(0, 8),
    };
  }, []);

  return (
    <>
      <section id="top" className="lazule-hero relative overflow-hidden bg-lazule-depth">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(248,250,252,0.12),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.86)_100%)]" />
        <div className="relative mx-auto grid min-h-[74svh] max-w-7xl content-end gap-8 px-5 pb-8 pt-14 sm:px-8 md:grid-cols-[0.95fr_1.05fr] md:items-end md:py-20">
          <div className="lazule-hero-copy relative z-10 max-w-xl pb-2">
            <p className="mb-4 text-[0.68rem] font-semibold uppercase tracking-[0.42em] text-lazule-gold">LAZULE FRAGRANCES</p>
            <h1 className="font-display text-5xl leading-[0.9] text-lazule-mist sm:text-6xl lg:text-7xl">Perfume com assinatura.</h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-slate-200 sm:text-lg">
              Curadoria premium para descobrir fragrâncias importadas, árabes e nicho em poucos toques.
            </p>
            <a
              className="lazule-premium-button lazule-cta-shimmer lazule-hero-cta mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-lazule-gold px-7 text-sm font-semibold uppercase tracking-[0.18em] text-lazule-night shadow-aureate"
              href="/catalogo"
            >
              <span className="relative z-10">Explorar agora</span>
            </a>
          </div>

          <a
            className="lazule-hero-product group relative mx-auto block aspect-[4/5] w-full max-w-[24rem] overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.055] shadow-mineral backdrop-blur md:mr-0"
            href={heroProduct ? `/catalogo?busca=${encodeURIComponent(heroProduct.name)}` : '/catalogo'}
            aria-label="Abrir destaque LAZULE"
          >
            {heroProduct?.image ? (
              <img
                className="absolute inset-0 h-full w-full object-cover opacity-85 transition duration-700 group-hover:scale-105 group-active:scale-[1.025]"
                src={heroProduct.image}
                alt={`Perfume ${heroProduct.name}`}
                loading="eager"
                decoding="async"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-lazule-night via-lazule-night/20 to-transparent" />
            <div className="absolute inset-x-5 bottom-5 rounded-[1.6rem] border border-white/10 bg-lazule-night/62 p-4 backdrop-blur-xl">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-lazule-gold">Destaque</p>
              <p className="mt-2 line-clamp-1 font-display text-2xl text-lazule-mist">{heroProduct?.name ?? 'Curadoria LAZULE'}</p>
            </div>
          </a>
        </div>
      </section>

      <div className="lazule-sticky-search sticky top-[7.35rem] z-30 border-y border-white/10 bg-lazule-night/78 px-4 py-3 shadow-[0_18px_52px_rgba(2,6,23,0.24)] backdrop-blur-2xl md:top-[4.75rem]">
        <div className="mx-auto max-w-3xl">
          <ProductNavigationSearch className="lazule-home-search" compact />
        </div>
      </div>

      <Reveal className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-12">
        <SectionHeading eyebrow="Descoberta rápida" title="Escolha pelo desejo" actionHref="/catalogo" />
        <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1">
          {categoryTiles.map((category, index) => (
            <a
              key={category.title}
              className={`lazule-touch-card lazule-reveal-item relative flex h-40 min-w-[9.8rem] snap-start scroll-ml-4 flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${category.gradient} p-5 shadow-mineral transition hover:border-lazule-gold/45 focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night`}
              href={category.href}
              style={{ '--item-delay': `${index * 55}ms` }}
            >
              <span className="h-1 w-10 rounded-full bg-lazule-gold/90" />
              <span>
                <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-lazule-gold">{category.label}</span>
                <strong className="mt-2 block font-display text-2xl font-normal text-lazule-mist">{category.title}</strong>
              </span>
            </a>
          ))}
        </div>
      </Reveal>

      <Reveal className="mx-auto max-w-7xl px-4 pb-7 sm:px-8">
        <SectionHeading eyebrow="Marcas" title="Navegue por assinatura" actionHref="/catalogo" />
        <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 pt-1">
          {brands.map((brand, index) => (
            <a
              key={brand}
              className="lazule-brand-pill lazule-reveal-item shrink-0 snap-start rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-lazule-gold/55 hover:text-lazule-gold focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
              href={createBrandPath(brand)}
              style={{ '--item-delay': `${Math.min(index, 7) * 42}ms` }}
            >
              {brand}
            </a>
          ))}
        </div>
      </Reveal>

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 lg:pb-24">
        <ProductRail eyebrow="Seleção LAZULE" title="Poucos, bons, agora" products={collections.weeklySelection.slice(0, 6)} actionHref="/catalogo" />
        <ProductRail eyebrow="Mais desejados" title="Ícones em rotação" products={collections.mostWanted.slice(0, 6)} actionHref="/catalogo?busca=importado" />
        <ProductRail eyebrow="Árabes" title="Intensidade limpa" products={collections.arabicHighlights.slice(0, 6)} actionHref="/catalogo?tipo=%C3%81rabe" />

        <Reveal className="mt-9 overflow-hidden rounded-[2.4rem] border border-lazule-gold/20 bg-white/[0.045] p-6 shadow-mineral backdrop-blur sm:p-9">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold">Curadoria humana</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl leading-none text-lazule-mist">Luxo sem excesso.</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Uma home mais leve para encontrar o perfume certo com menos fricção, mais imagem e escolhas claras.
          </p>
        </Reveal>
      </main>
    </>
  );
}
