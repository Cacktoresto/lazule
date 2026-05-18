import { formatBRL } from '../utils/currency';
import { trackBrandClick, trackProductSelect } from '../utils/analytics';
import { createBrandPath, createProductPath } from '../utils/productRouting';

function FeaturedProductCard({ product, section }) {
  return (
    <article className="lazule-product-card min-w-[17rem] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] shadow-mineral backdrop-blur sm:min-w-[21rem]">
      <a
        className="group block"
        href={createProductPath(product)}
        onClick={() => trackProductSelect(product, { source_page: section, section, interaction_type: 'highlight' })}
      >
        <div className="relative h-60 overflow-hidden bg-lazule-depth p-5">
          {product.image ? (
            <img
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105"
              src={product.image}
              alt={`Perfume ${product.name}`}
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-lazule-night via-lazule-night/25 to-transparent" />
          <span className={`relative z-10 rounded-full border px-3 py-1 text-xs ${product.availability.className}`}>{product.availability.label}</span>
          <div className="absolute inset-x-5 bottom-5 z-10">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-200">{product.brand}</p>
            <h3 className="mt-2 line-clamp-2 font-display text-2xl leading-tight text-lazule-mist group-hover:text-lazule-gold">
              {product.name}
            </h3>
          </div>
        </div>
      </a>
      <div className="p-5">
        <div className="flex items-end justify-between gap-4">
          <a className="text-xs uppercase tracking-[0.24em] text-lazule-gold transition hover:text-[#dfbd68]" href={createBrandPath(product.brand)} onClick={() => trackBrandClick(product.brand, { source_page: section })}>
            {product.brand}
          </a>
          <strong className="text-xl text-lazule-mist">{formatBRL(product.salePrice)}</strong>
        </div>
        {product.olfactoryReference && (
          <p className="mt-3 text-sm text-slate-400">
            Inspiração olfativa: <span className="text-slate-200">{product.olfactoryReference}</span>
          </p>
        )}
      </div>
    </article>
  );
}

function HighlightRail({ eyebrow, title, description, products, section }) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="mt-8 rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-5 shadow-mineral backdrop-blur sm:p-7">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-lazule-gold">{eyebrow}</p>
          <h3 className="mt-2 font-display text-3xl text-lazule-mist">{title}</h3>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">{description}</p>
      </div>
      <div className="flex snap-x gap-5 overflow-x-auto pb-3 [scrollbar-color:rgba(200,162,77,0.55)_transparent]">
        {products.map((product) => (
          <div key={product.id} className="snap-start">
            <FeaturedProductCard product={product} section={section} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function CatalogHighlights({ collections, className = '' }) {
  return (
    <section className={`relative ${className || 'mb-14'}`} aria-labelledby="catalog-highlights-title">
      <div className="mx-auto mb-7 flex max-w-xl items-center gap-4 text-lazule-gold/60 sm:mb-9">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-lazule-gold/45 to-lazule-gold/10" aria-hidden="true" />
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] sm:tracking-[0.38em]">Continue explorando</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-lazule-gold/45 to-lazule-gold/10" aria-hidden="true" />
      </div>
      <div className="relative overflow-hidden rounded-[3rem] border border-lazule-gold/20 bg-lazule-depth p-5 shadow-mineral sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-lazule-blue/35 blur-3xl" />
        <div className="pointer-events-none absolute left-1/4 top-0 h-48 w-48 rounded-full bg-lazule-gold/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-lazule-gold">Boutique inteligente</p>
          <h2 id="catalog-highlights-title" className="mt-4 max-w-3xl font-display text-4xl leading-tight text-lazule-mist sm:text-5xl">
            Descubra fragrâncias selecionadas por momento, desejo e assinatura olfativa.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Trilhas premium derivadas automaticamente do catálogo atual para facilitar descoberta sem comprometer a curadoria LAZULE.
          </p>

          <HighlightRail
            eyebrow="Seleção da semana"
            title="Escolhas com presença imediata"
            description="Uma vitrine rotativa pronta para futura integração dinâmica."
            products={collections.weeklySelection}
            section="weekly_selection"
          />
          <HighlightRail
            eyebrow="Mais procurados"
            title="Ícones e referências desejadas"
            description="Produtos com marcas fortes, destaque editorial ou referência olfativa reconhecida."
            products={collections.mostWanted}
            section="most_wanted"
          />
          <HighlightRail
            eyebrow="Árabes em destaque"
            title="Intensidade oriental em curadoria mineral"
            description="Fragrâncias árabes reais do catálogo para explorar potência, fixação e assinatura marcante."
            products={collections.arabicHighlights}
            section="arabic_highlights"
          />
        </div>
      </div>
    </section>
  );
}
