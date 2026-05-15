import { useEffect, useMemo } from 'react';
import { getBrandBySlug, getCatalogProducts } from '../utils/catalog';
import { trackEvent } from '../utils/analytics';
import { ProductCard } from './ProductCard';
import { applyBrandSeo } from '../utils/seo';

function BrandNotFound() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="rounded-[2.5rem] border border-lazule-gold/20 bg-white/[0.055] p-8 text-center shadow-mineral backdrop-blur sm:p-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Boutique LAZULE</p>
        <h1 className="font-display text-4xl text-lazule-mist sm:text-5xl">Marca não encontrada.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
          A marca pode ter mudado de curadoria ou ainda não possui fragrâncias disponíveis no catálogo atual.
        </p>
        <a
          className="lazule-premium-button lazule-cta-shimmer mt-8 inline-flex rounded-full bg-lazule-gold px-7 py-3.5 font-semibold text-lazule-night shadow-aureate"
          href="/catalogo"
        >
          Voltar ao catálogo
        </a>
      </div>
    </section>
  );
}

export function BrandPage({ slug }) {
  const catalogProducts = useMemo(() => getCatalogProducts(), []);
  const brand = useMemo(() => getBrandBySlug(slug, catalogProducts), [catalogProducts, slug]);

  useEffect(() => {
    if (!brand) {
      return;
    }

    applyBrandSeo(brand);
    trackEvent('brand_view', { brandSlug: brand.slug, brandName: brand.name, productCount: brand.products.length });
  }, [brand]);

  if (!brand) {
    return <BrandNotFound />;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
        <a className="transition hover:text-lazule-gold" href="/catalogo">Catálogo</a>
        <span>/</span>
        <span className="text-lazule-gold">{brand.name}</span>
      </nav>

      <div className="relative overflow-hidden rounded-[3rem] border border-lazule-gold/20 bg-lazule-depth p-7 shadow-mineral sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lazule-blue/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-12 h-40 w-40 rounded-full bg-lazule-gold/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-lazule-gold">Página de marca</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-lazule-mist sm:text-6xl lg:text-7xl">{brand.name}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Uma seleção dedicada para explorar a assinatura da marca com navegação premium, SEO dinâmico e catálogo pronto para crescer.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="rounded-full border border-white/15 bg-white/[0.07] px-5 py-3 text-sm text-slate-200">
              <strong className="text-lazule-gold">{brand.products.length}</strong> fragrâncias na curadoria
            </span>
            <a
              className="lazule-premium-button inline-flex justify-center rounded-full border border-lazule-gold/40 bg-white/5 px-6 py-3 text-sm font-semibold text-lazule-gold backdrop-blur hover:border-lazule-gold/70"
              href="/catalogo"
            >
              ← Voltar ao catálogo
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {brand.products.map((product) => (
          <ProductCard key={product.id} product={product} analyticsSection={`brand_${brand.slug}`} />
        ))}
      </div>
    </section>
  );
}
