import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductNavigationSearch } from './ProductNavigationSearch';
import { OlfactiveAssistant } from './OlfactiveAssistant';
import { ProductCard } from './ProductCard';
import { CatalogHighlights } from './CatalogHighlights';
import { getAllProducts } from '../data/catalogRepository';
import { getFeaturedCollections } from '../utils/catalog';
import { createBrandPath } from '../utils/productRouting';
import { applyHomeSeo } from '../utils/seo';
import { trackBrandClick, trackCategoryClick, trackEvent, trackProductSelect } from '../utils/analytics';

const discoveryPaths = [
  {
    title: 'Importados',
    label: 'Ícones internacionais',
    meta: 'clássicos, presenteáveis, assinatura limpa',
    href: '/catalogo?tipo=Importado',
    gradient: 'from-slate-100/15 via-lazule-blue/20 to-lazule-night',
  },
  {
    title: 'Árabes potentes',
    label: 'Rastro e presença',
    meta: 'âmbar, doçura, noite, intensidade',
    href: '/catalogo?tipo=%C3%81rabe',
    gradient: 'from-lazule-gold/25 via-amber-900/15 to-lazule-night',
  },
  {
    title: 'Nicho autoral',
    label: 'Descoberta editorial',
    meta: 'menos óbvio, mais personalidade',
    href: '/catalogo?tipo=Nicho',
    gradient: 'from-lazule-blue/20 via-lazule-royal/20 to-lazule-night',
  },
  {
    title: 'Femininos leves',
    label: 'Elegância cotidiana',
    meta: 'fresco, delicado, trabalho, pele',
    href: '/catalogo?busca=Feminino',
    gradient: 'from-slate-100/10 via-lazule-blue/15 to-lazule-night',
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
    <div className="mb-6 flex items-start justify-between gap-3 px-1 sm:mb-10 sm:items-end">
      <div className="relative pl-4">
        <span className="absolute left-0 top-1 h-10 w-px rounded-full bg-gradient-to-b from-lazule-gold via-lazule-gold/40 to-transparent" aria-hidden="true" />
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold/90">{eyebrow}</p>
        <h2 className="mt-3 max-w-[12ch] font-display text-[clamp(2rem,11vw,2.55rem)] leading-[0.92] tracking-[-0.035em] text-lazule-mist sm:max-w-none sm:text-5xl">{title}</h2>
      </div>
      {actionHref && (
        <a className="lazule-inline-link shrink-0 rounded-full px-2 py-2.5 text-sm font-semibold text-lazule-gold" href={actionHref}>
          {actionLabel}
        </a>
      )}
    </div>
  );
}

function UnifiedDiscovery({ brands, curatedProducts }) {
  const spotlightProducts = curatedProducts.slice(0, 3);

  return (
    <Reveal className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-14">
      <div className="lazule-surface-premium relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.032] p-4 shadow-[0_30px_100px_rgba(2,6,23,0.30)] backdrop-blur-xl sm:rounded-[2.4rem] sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(200,162,77,0.13),transparent_26%),radial-gradient(circle_at_88%_20%,rgba(37,99,235,0.13),transparent_30%)]" />
        <div className="relative mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold/90">Descoberta LAZULE</p>
            <h2 className="mt-2 max-w-[12ch] font-display text-[clamp(2rem,10vw,2.45rem)] leading-[0.95] text-lazule-mist sm:max-w-none sm:text-4xl">Escolha como explorar.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:max-w-xl">
              Um mapa silencioso para navegar por desejo, ocasião e assinatura — curado como uma conversa privada, sem ruído de marketplace.
            </p>
          </div>
          <a className="lazule-inline-link self-start rounded-full px-1 py-2 text-sm font-semibold text-lazule-gold sm:self-auto" href="/catalogo">
            Explorar catálogo
          </a>
        </div>

        <div className="relative grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
            {discoveryPaths.map((path, index) => (
              <a
                key={path.title}
                className={`lazule-discovery-card lazule-touch-card lazule-reveal-item relative flex min-h-36 min-w-[16rem] snap-start scroll-ml-4 flex-col justify-between overflow-hidden rounded-[1.65rem] border border-white/10 bg-gradient-to-br ${path.gradient} p-5 transition focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night sm:min-h-40`}
                href={path.href}
                style={{ '--item-delay': `${index * 50}ms` }}
                onClick={() => trackCategoryClick(path.title, { source_page: 'home_unified_discovery', category_label: path.label })}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">{path.label}</span>
                  <span className="h-px w-8 bg-lazule-gold/60" aria-hidden="true" />
                </span>
                <span>
                  <strong className="block font-display text-[1.65rem] font-normal leading-none text-lazule-mist">{path.title}</strong>
                  <span className="mt-2 block text-xs leading-5 text-slate-300">{path.meta}</span>
                </span>
              </a>
            ))}
          </div>

          <aside className="lazule-surface-premium space-y-5 rounded-[1.65rem] border border-white/10 bg-lazule-night/40 p-5">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-lazule-gold">Seleção agora</p>
              <div className="mt-3 grid gap-2.5">
                {spotlightProducts.map((product, index) => (
                  <a
                    key={product.id ?? product.productSlug ?? product.name}
                    className="lazule-reveal-item lazule-touch-card group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3 transition hover:border-lazule-gold/35 hover:bg-white/[0.075]"
                    href={`/catalogo?busca=${encodeURIComponent(product.name)}`}
                    style={{ '--item-delay': `${220 + index * 45}ms` }}
                    onClick={() => trackProductSelect(product, { source_page: 'home_unified_discovery', section: 'home_curated_discovery', interaction_type: 'curated_shortcut' })}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-lazule-mist">{product.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">{product.brand || 'Curadoria LAZULE'}</span>
                    </span>
                    <span className="text-xs font-semibold text-lazule-gold transition group-hover:translate-x-0.5">Ver</span>
                  </a>
                ))}
              </div>
            </div>

            {brands.length ? (
              <div className="border-t border-white/10 pt-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-lazule-gold">Assinaturas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {brands.slice(0, 6).map((brand, index) => (
                    <a
                      key={brand}
                      className="lazule-brand-pill lazule-reveal-item rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur transition hover:border-lazule-gold/55 hover:text-lazule-gold focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
                      href={createBrandPath(brand)}
                      style={{ '--item-delay': `${360 + index * 35}ms` }}
                      onClick={() => trackBrandClick(brand, { source_page: 'home_unified_discovery' })}
                    >
                      {brand}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </Reveal>
  );
}

function ProductRail({ eyebrow, title, products, actionHref }) {
  if (!products.length) {
    return null;
  }

  return (
    <Reveal className="py-7 sm:py-10">
      <SectionHeading eyebrow={eyebrow} title={title} actionHref={actionHref} />
      <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-4 pt-1 sm:gap-5">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="lazule-reveal-item w-[min(76vw,17rem)] shrink-0 snap-start scroll-ml-4 sm:w-[20rem] sm:max-w-[19rem]"
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
  useEffect(() => {
    applyHomeSeo();
  }, []);

  const { collections, heroProduct, brands, products } = useMemo(() => {
    const products = getAllProducts();
    const featuredCollections = getFeaturedCollections(products);
    const [firstHeroProduct] = featuredCollections.weeklySelection.length ? featuredCollections.weeklySelection : products;
    const availableBrandSet = new Set(products.map((product) => product.brand));
    const visibleBrands = curatedBrands.filter((brand) => availableBrandSet.has(brand));

    return {
      collections: featuredCollections,
      heroProduct: firstHeroProduct,
      brands: visibleBrands.length ? visibleBrands : [...availableBrandSet].slice(0, 8),
      products,
    };
  }, []);

  return (
    <>
      <section id="top" className="lazule-hero relative overflow-hidden bg-lazule-depth">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(248,250,252,0.10),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.9)_100%)]" />
        <div className="pointer-events-none absolute inset-x-[10%] top-24 h-px bg-gradient-to-r from-transparent via-lazule-gold/35 to-transparent opacity-70" />
        <div className="lazule-mobile-container relative mx-auto grid min-h-[min(760px,78svh)] max-w-7xl content-end gap-7 px-4 pb-9 pt-8 sm:min-h-[82svh] sm:px-8 sm:pb-12 sm:pt-20 md:grid-cols-[0.95fr_1.05fr] md:items-end md:py-24">
          <div className="lazule-hero-copy relative z-10 max-w-xl pb-1">
            <p className="mb-4 text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold sm:mb-5 sm:text-[0.68rem] sm:tracking-[0.46em]">LAZULE FRAGRANCES</p>
            <h1 className="max-w-[11ch] font-display text-[clamp(3.15rem,16vw,4.35rem)] leading-[0.86] tracking-[-0.055em] text-lazule-mist sm:max-w-[10ch] sm:text-7xl lg:text-8xl">Perfume com percepção.</h1>
            <p className="mt-5 max-w-[32rem] text-[0.98rem] leading-7 text-slate-200/85 sm:mt-6 sm:text-lg">
              Uma boutique digital escura, calma e inteligente para encontrar fragrâncias por atmosfera, ocasião e presença.
            </p>
            <a
              className="lazule-premium-button lazule-cta-shimmer lazule-hero-cta mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-lazule-gold px-6 text-center text-sm font-semibold uppercase tracking-[0.15em] text-lazule-night shadow-aureate min-[390px]:w-auto sm:mt-8 sm:px-7 sm:tracking-[0.18em]"
              href="/catalogo"
              onClick={() => trackEvent('hero_cta_click', { source_page: 'home', cta_location: 'hero_primary' })}
            >
              <span className="relative z-10">Entrar na curadoria</span>
            </a>
          </div>

          <a
            className="lazule-hero-product lazule-surface-premium group relative mx-auto block aspect-[4/5] w-full max-w-[min(19.5rem,88vw)] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.052] shadow-mineral backdrop-blur-xl sm:max-w-[25rem] sm:rounded-[2.8rem] md:mr-0"
            href={heroProduct ? `/catalogo?busca=${encodeURIComponent(heroProduct.name)}` : '/catalogo'}
            aria-label="Abrir destaque LAZULE"
            onClick={() => heroProduct && trackProductSelect(heroProduct, { source_page: 'home_hero_product', section: 'home_hero_product', interaction_type: 'hero_product' })}
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
            <div className="absolute inset-x-4 bottom-4 rounded-[1.45rem] border border-white/10 bg-lazule-night/70 p-4 backdrop-blur-xl sm:inset-x-5 sm:bottom-5 sm:rounded-[1.8rem] sm:p-5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-lazule-gold">Destaque</p>
              <p className="mt-2 line-clamp-1 font-display text-[1.35rem] leading-none text-lazule-mist sm:text-2xl">{heroProduct?.name ?? 'Curadoria LAZULE'}</p>
            </div>
          </a>
        </div>
      </section>

      <div className="lazule-sticky-search sticky top-[8.6rem] z-30 border-y border-white/10 bg-lazule-night/76 px-3 py-2.5 shadow-[0_18px_52px_rgba(2,6,23,0.24)] backdrop-blur-2xl sm:top-[7.35rem] sm:px-4 sm:py-3 md:top-[4.75rem]">
        <div className="mx-auto max-w-3xl">
          <ProductNavigationSearch className="lazule-home-search" compact />
        </div>
      </div>

      <OlfactiveAssistant products={products} sourcePage="home" className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-14" />

      <UnifiedDiscovery brands={brands} curatedProducts={collections.weeklySelection} />

      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-8 lg:pb-28">
        <ProductRail eyebrow="Mais desejados" title="Ícones em rotação" products={collections.mostWanted.slice(0, 6)} actionHref="/catalogo?busca=importado" />
        <ProductRail eyebrow="Árabes" title="Intensidade limpa" products={collections.arabicHighlights.slice(0, 6)} actionHref="/catalogo?tipo=%C3%81rabe" />

        <Reveal className="lazule-surface-premium mt-9 overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-white/[0.04] p-5 shadow-mineral backdrop-blur-xl sm:mt-12 sm:rounded-[2.7rem] sm:p-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold">Curadoria humana</p>
          <h2 className="mt-3 max-w-2xl font-display text-[clamp(2rem,10vw,2.6rem)] leading-none text-lazule-mist sm:text-4xl">Luxo sem excesso.</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Uma experiência deliberadamente contida: mais atmosfera, menos ruído, e uma curadoria que transforma desejo em assinatura olfativa.
          </p>
        </Reveal>

        <CatalogHighlights collections={collections} className="mt-14 sm:mt-16 lg:mt-20" />
      </main>
    </>
  );
}
