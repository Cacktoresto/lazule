import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductNavigationSearch } from './ProductNavigationSearch';
import { OlfactiveAssistant } from './OlfactiveAssistant';
import { ProductCard, ProductImageFallback } from './ProductCard';
import { CatalogHighlights } from './CatalogHighlights';
import { getAllProducts } from '../data/catalogRepository';
import { excludeInternalTestProducts } from '../domain/internalTestProduct';
import { getFeaturedCollections } from '../utils/catalog';
import { createBrandPath } from '../utils/productRouting';
import { applyHomeSeo } from '../utils/seo';
import { trackBrandClick, trackCategoryClick, trackEvent, trackProductSelect } from '../utils/analytics';
import { loadTasteMemoryStore } from '../utils/tasteMemoryStore';
import { buildUserAtmosphereProfile } from '../ai/userAtmosphereProfile';
import { resolveOlfactiveMoment } from '../ai/olfactiveMomentEngine';
import { resolveEmotionalRhythm, resolveAdaptiveMotionIntensity } from '../ai/emotionalRhythmEngine';
import { resolvePresenceTimeline } from '../ai/presenceTimelineEngine';
import { buildPresenceCompanionLayer } from '../ai/presenceCompanionLayer';
import { resolveAdaptiveMomentHome, resolveAtmosphericReunionSequence } from '../ai/adaptiveAtmosphericHome';
import { applyEditorialAntiRepetition } from '../ai/editorialIntelligenceSystem';
import { deriveTasteEvolution } from '../ai/tasteEvolutionEngine';
import { createHumanObservationFragments } from '../ai/humanObservationFragmentsEngine';

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



function getHeroBadge(product) {
  const rawType = String(product?.catalogType || product?.type || product?.category || '').toLowerCase();

  if (rawType.includes('nicho')) return 'Niche';
  if (rawType.includes('árabe') || rawType.includes('arabe')) return 'Árabe';
  if (rawType.includes('designer') || rawType.includes('import')) return 'Designer';

  return 'Curadoria';
}

function getHeroFamily(product) {
  const labels = [product?.family, ...(product?.semanticFacets || []), ...(product?.vibeTags || [])]
    .filter(Boolean)
    .map((label) => String(label).trim())
    .filter(Boolean);
  const uniqueLabels = [...new Set(labels)];

  return uniqueLabels.slice(0, 2).join(' • ') || 'Ambarado • Amadeirado';
}

function getLuxuryDescriptor(product) {
  if (product?.narrative) return product.narrative;
  if (product?.editorialPhrase) return product.editorialPhrase;
  if (product?.description) return product.description;

  return 'Presença silenciosa e sofisticada para uma assinatura olfativa memorável.';
}

function buildHomeEditorialPulse(atmosphereProfile = {}, sensoryPresence = {}) {
  const lines = [
    sensoryPresence?.adaptiveHome?.headline,
    sensoryPresence?.reunion?.headline,
    atmosphereProfile?.density === 'dense' ? 'Hoje o clima pede projeção mais próxima e textura densa.' : 'Hoje o clima favorece perfumes mais respiráveis e com saída limpa.',
    atmosphereProfile?.motionCadence === 'dynamic' ? 'Seu padrão recente está mais exploratório, com alternância entre dia e noite.' : 'Seu padrão recente está estável e consistente, com escolhas mais cirúrgicas.',
  ].filter(Boolean);
  return applyEditorialAntiRepetition(lines);
}
function UnifiedDiscovery({ brands, curatedProducts, discoveryItems, tasteNarrative }) {
  const spotlightProducts = curatedProducts.slice(0, 3);

  return (
    <Reveal className="mx-auto max-w-7xl px-3 py-6 min-[390px]:px-4 sm:px-8 sm:py-10">
      <div className="lazule-surface-premium relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[0.032] p-3.5 shadow-[0_22px_72px_rgba(2,6,23,0.26)] backdrop-blur-xl min-[390px]:rounded-[1.85rem] min-[390px]:p-4 sm:rounded-[2.4rem] sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(200,162,77,0.13),transparent_26%),radial-gradient(circle_at_88%_20%,rgba(37,99,235,0.13),transparent_30%)]" />
        <div className="relative mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold/90">Descoberta LAZULE</p>
            <h2 className="mt-2 max-w-[12ch] font-display text-[clamp(2rem,10vw,2.45rem)] leading-[0.95] text-lazule-mist sm:max-w-none sm:text-4xl">Escolha como explorar.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:max-w-xl">
              {tasteNarrative}
            </p>
          </div>
          <a className="lazule-inline-link self-start rounded-full px-1 py-2 text-sm font-semibold text-lazule-gold sm:self-auto" href="/catalogo">
            Explorar catálogo
          </a>
        </div>

        <div className="relative grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
            {discoveryItems.map((path, index) => (
              <a
                key={path.title}
                className={`lazule-discovery-card lazule-touch-card lazule-reveal-item relative flex min-h-32 w-[min(78vw,15rem)] shrink-0 snap-start scroll-ml-3 flex-col justify-between overflow-hidden rounded-[1.35rem] border border-white/10 bg-gradient-to-br ${path.gradient} p-4 transition focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night sm:min-h-40 sm:w-auto sm:min-w-[16rem] sm:rounded-[1.65rem] sm:p-5`}
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

          <aside className="lazule-surface-premium space-y-4 rounded-[1.35rem] border border-white/10 bg-lazule-night/40 p-4 sm:space-y-5 sm:rounded-[1.65rem] sm:p-5">
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
                  {brands.slice(0, 4).map((brand, index) => (
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
    <Reveal className="py-6 sm:py-10">
      <SectionHeading eyebrow={eyebrow} title={title} actionHref={actionHref} />
      <div className="lazule-horizontal-rail lazule-rail-fade flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-3 pt-1 sm:gap-5 sm:pb-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="lazule-reveal-item w-[min(70vw,14.5rem)] shrink-0 snap-start scroll-ml-3 min-[390px]:w-[min(68vw,15.5rem)] sm:w-[20rem] sm:max-w-[19rem]"
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

  const [atmosphereProfile, setAtmosphereProfile] = useState(() => buildUserAtmosphereProfile(null));

  useEffect(() => {
    const store = loadTasteMemoryStore(window.localStorage);
    setAtmosphereProfile(buildUserAtmosphereProfile(store.profile));
  }, []);

  const sensoryPresence = useMemo(() => {
    const moment = resolveOlfactiveMoment({ recentDensity: atmosphereProfile.density, olfactivePhase: atmosphereProfile.phase, sessionDepth: atmosphereProfile.depthAlpha });
    const rhythm = resolveEmotionalRhythm({ sessionDepth: atmosphereProfile.depthAlpha, recurrenceScore: atmosphereProfile.recurrenceScore, navigationPattern: atmosphereProfile.motionCadence === 'dynamic' ? 'exploratory' : 'balanced' });
    const timeline = resolvePresenceTimeline(atmosphereProfile);
    const companion = buildPresenceCompanionLayer({ moment, rhythm, timeline });
    const adaptiveHome = resolveAdaptiveMomentHome({ moment, rhythm, profile: atmosphereProfile, isMobile: window.matchMedia('(max-width: 768px)').matches, prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    const reunion = resolveAtmosphericReunionSequence({ companionNarrative: companion.narrative, rhythm });
    return { moment, rhythm, timeline, companion, adaptiveHome, reunion, motionIntensity: resolveAdaptiveMotionIntensity(rhythm, window.matchMedia('(prefers-reduced-motion: reduce)').matches) };
  }, [atmosphereProfile]);

  const editorialPulse = useMemo(() => buildHomeEditorialPulse(atmosphereProfile, sensoryPresence), [atmosphereProfile, sensoryPresence]);
  const observationFragments = useMemo(() => createHumanObservationFragments({ profile: atmosphereProfile, context: 'home' }), [atmosphereProfile]);
  const tasteEvolution = useMemo(() => deriveTasteEvolution({ profile: atmosphereProfile, events: [], wishlist: [] }), [atmosphereProfile]);

  const { collections, heroProduct, brands, products, discoveryItems } = useMemo(() => {
    const products = excludeInternalTestProducts(getAllProducts());
    const featuredCollections = getFeaturedCollections(products);
    const [firstHeroProduct] = featuredCollections.weeklySelection.length ? featuredCollections.weeklySelection : products;
    const availableBrandSet = new Set(products.map((product) => product.brand));
    const visibleBrands = curatedBrands.filter((brand) => availableBrandSet.has(brand));

    const prioritizeDense = atmosphereProfile.density === 'dense';
    const sortedDiscovery = [...discoveryPaths].sort((a, b) => {
      const aDense = /intensidade|noite|rastro|potentes/i.test(`${a.meta} ${a.title}`);
      const bDense = /intensidade|noite|rastro|potentes/i.test(`${b.meta} ${b.title}`);
      return prioritizeDense ? Number(bDense) - Number(aDense) : Number(aDense) - Number(bDense);
    });
    return {
      collections: featuredCollections,
      heroProduct: firstHeroProduct,
      brands: visibleBrands.length ? visibleBrands : [...availableBrandSet].slice(0, 8),
      products,
      discoveryItems: sortedDiscovery,
    };
  }, [atmosphereProfile.density]);

  return (
    <div className="lazule-home-shell overflow-x-clip" data-home-mood={sensoryPresence.adaptiveHome.heroMood} data-motion-intensity={sensoryPresence.motionIntensity} style={{ '--lazule-memory-depth': atmosphereProfile.depthAlpha }}>
      <section id="top" className="lazule-hero lazule-cinematic-hero lazule-luxury-hero relative overflow-hidden bg-lazule-depth">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(200,162,77,0.14),transparent_24%),radial-gradient(circle_at_80%_4%,rgba(43,92,178,0.18),transparent_30%),linear-gradient(180deg,rgba(3,7,18,0.22)_0%,rgba(5,8,22,0.92)_100%)]" />
        <div className="pointer-events-none absolute inset-x-[8%] top-24 h-px bg-gradient-to-r from-transparent via-lazule-gold/30 to-transparent opacity-70" />
        <div className="pointer-events-none absolute right-[8%] top-[18%] hidden h-72 w-72 rounded-full bg-lazule-gold/10 blur-3xl lg:block" />
        <div className="lazule-mobile-container relative mx-auto grid min-h-[min(760px,82svh)] max-w-7xl content-end gap-10 px-4 pb-10 pt-8 min-[390px]:px-5 sm:min-h-[86svh] sm:px-8 sm:pb-16 sm:pt-24 md:grid-cols-[0.9fr_1.1fr] md:items-center md:py-28 lg:gap-16 lg:py-32">
          <div className="lazule-hero-copy relative z-10 max-w-2xl pb-1">
            <p className="mb-3 text-[0.62rem] font-medium uppercase tracking-[0.32em] text-slate-300/70">{sensoryPresence.reunion.microFragment}</p>
            <p className="mb-5 text-[0.64rem] font-semibold uppercase tracking-[0.4em] text-lazule-gold sm:text-[0.7rem] sm:tracking-[0.5em]">LAZULE FRAGRANCES</p>
            <h1 className="max-w-[11ch] font-display text-[clamp(3rem,13vw,4.35rem)] leading-[0.86] tracking-[-0.06em] text-lazule-mist sm:max-w-[10ch] sm:text-7xl lg:text-[6.3rem]">Perfume com percepção.</h1>
            <p className="mt-6 max-w-[36rem] text-base leading-7 text-slate-200/82 sm:mt-8 sm:text-xl sm:leading-9">
              Uma curadoria olfativa calma, precisa e editorial — fragrâncias escolhidas por atmosfera, ocasião e presença.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                className="lazule-premium-button lazule-cta-shimmer lazule-hero-cta inline-flex min-h-12 w-full items-center justify-center rounded-full bg-lazule-gold px-7 text-center text-sm font-semibold uppercase tracking-[0.16em] text-lazule-night shadow-aureate min-[390px]:w-auto sm:px-8 sm:tracking-[0.2em]"
                href="/catalogo"
                onClick={() => trackEvent('hero_cta_click', { source_page: 'home', cta_location: 'hero_primary' })}
              >
                <span className="relative z-10">Entrar na curadoria</span>
              </a>
              <a className="lazule-inline-link inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-lazule-gold" href="#assistente">
                Consultar concierge
              </a>
            </div>
          </div>

          <a
            className="lazule-hero-product lazule-featured-fragrance group relative mx-auto block w-full max-w-[min(24rem,88vw)] overflow-hidden rounded-[2.35rem] border border-white/10 bg-white/[0.045] p-3 shadow-mineral backdrop-blur-xl sm:max-w-[31rem] sm:rounded-[3rem] sm:p-4 md:mr-0"
            href={heroProduct ? `/catalogo?busca=${encodeURIComponent(heroProduct.name)}` : '/catalogo'}
            aria-label="Abrir curadoria em destaque LAZULE"
            onClick={() => heroProduct && trackProductSelect(heroProduct, { source_page: 'home_hero_product', section: 'home_hero_product', interaction_type: 'hero_product' })}
          >
            <div className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 rounded-full bg-lazule-gold/18 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-4 h-64 w-64 rounded-full bg-lazule-blue/18 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(145deg,rgba(7,13,29,0.74),rgba(16,38,79,0.54))] p-4 sm:rounded-[2.45rem] sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-lazule-gold">Curadoria em destaque</p>
                <span className="rounded-full border border-lazule-gold/30 bg-lazule-gold/10 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#eedebd]">{getHeroBadge(heroProduct)}</span>
              </div>
              <div className="lazule-featured-image-frame relative aspect-[4/5] overflow-hidden rounded-[1.55rem] border border-white/10 bg-lazule-night/70 sm:rounded-[2rem]">
                {heroProduct?.image ? (
                  <img
                    className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.035] group-active:scale-[1.015]"
                    src={heroProduct.image}
                    alt={`Perfume ${heroProduct.name}`}
                    loading="eager"
                    decoding="async"
                  />
                ) : <ProductImageFallback label="Curadoria LAZULE" />}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,22,0.05)_0%,rgba(5,8,22,0.28)_52%,rgba(5,8,22,0.78)_100%)]" />
              </div>
              <div className="relative mt-6">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-300/70">{getHeroFamily(heroProduct)}</p>
                <h2 className="mt-2 line-clamp-2 font-display text-[clamp(2rem,7vw,3.15rem)] leading-[0.88] tracking-[-0.04em] text-lazule-mist">{heroProduct?.name ?? 'Curadoria LAZULE'}</h2>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-200/74 sm:text-base">{getLuxuryDescriptor(heroProduct)}</p>
              </div>
            </div>
          </a>
        </div>
      </section>

      <div className="lazule-sticky-search sticky top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-30 border-y border-white/10 bg-lazule-night/76 px-2.5 py-2 shadow-[0_18px_52px_rgba(2,6,23,0.24)] backdrop-blur-2xl sm:top-[7.35rem] sm:px-4 sm:py-3 md:top-[4.75rem]">
        <div className="mx-auto max-w-3xl">
          <ProductNavigationSearch className="lazule-home-search" compact />
        </div>
      </div>

      {editorialPulse.length ? (
        <section className="mx-auto max-w-7xl px-3 py-5 min-[390px]:px-4 sm:px-8 sm:py-6">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 sm:rounded-[1.8rem] sm:p-6">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-lazule-gold">Leitura editorial de hoje</p>
            <div className="mt-3 grid gap-2">
              {editorialPulse.map((line) => (
                <p key={line} className="text-sm leading-6 text-slate-300">{line}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}


      <div id="assistente">
        <OlfactiveAssistant products={products} sourcePage="home" className="mx-auto max-w-7xl px-3 py-6 min-[390px]:px-4 sm:px-8 sm:py-10" />
      </div>

      <UnifiedDiscovery brands={brands} curatedProducts={collections.weeklySelection} discoveryItems={discoveryItems} tasteNarrative={tasteEvolution.narrative} />
      <section className="mx-auto max-w-7xl px-3 pb-2 min-[390px]:px-4 sm:px-8">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 sm:rounded-[1.8rem] sm:p-6">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-lazule-gold">Observações em tempo real</p>
          <div className="mt-3 grid gap-2">
            {observationFragments.map((line) => (
              <p key={line} className="text-sm leading-6 text-slate-300">{line}</p>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-3 pb-14 min-[390px]:px-4 sm:px-8 lg:pb-28">
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
    </div>
  );
}
