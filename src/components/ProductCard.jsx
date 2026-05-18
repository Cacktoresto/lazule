import { useState } from 'react';
import { formatBRL } from '../utils/currency';
import { getAvailabilityStatus } from '../utils/availability';
import { trackProductSelect } from '../utils/analytics';
import { createProductPath } from '../utils/productRouting';

export function ProductImageFallback({ label = 'Imagem em atualização' } = {}) {
  return (
    <div
      className="lazule-image-fallback absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_28%_18%,rgba(200,162,77,0.22),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.34),transparent_28%),linear-gradient(135deg,#050816_0%,#1E3A8A_52%,#0F172A_100%)]"
      role="img"
      aria-label={label}
    >
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(115deg,transparent_0%,rgba(248,250,252,0.12)_46%,transparent_48%),radial-gradient(circle_at_50%_120%,rgba(200,162,77,0.2),transparent_34%)]" />
      <div className="absolute inset-5 rounded-[1.6rem] border border-lazule-gold/20" />
      <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-lazule-gold/55 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-lazule-gold/40 bg-lazule-night/45 text-4xl font-semibold text-lazule-gold shadow-aureate backdrop-blur">
          L
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-lazule-gold">LAZULE</p>
        <p className="mt-3 max-w-[12rem] text-[0.64rem] uppercase tracking-[0.26em] text-slate-200/78">{label}</p>
      </div>
    </div>
  );
}

function ProductImageSkeleton() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-lazule-night/75" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(200,162,77,0.24),transparent_26%),radial-gradient(circle_at_75%_26%,rgba(37,99,235,0.22),transparent_32%)]" />
      <div className="absolute inset-x-6 top-8 h-48 rounded-[1.5rem] border border-white/10 bg-white/[0.06]" />
      <div className="absolute inset-y-0 -left-2/3 w-2/3 animate-lazule-shimmer bg-gradient-to-r from-transparent via-white/18 to-transparent" />
    </div>
  );
}

export function ProductCard({ product, analyticsSection = 'catalog_grid' }) {
  const [isImageLoading, setIsImageLoading] = useState(Boolean(product.image));
  const [hasImageFailed, setHasImageFailed] = useState(false);
  const productPath = createProductPath(product);
  const availability = product.availability ?? getAvailabilityStatus(product);
  const heroBadge = product.featured ? 'Destaque' : availability.label;

  return (
    <article className="lazule-product-card group h-full overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.052] shadow-mineral backdrop-blur">
      <a
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
        href={productPath}
        onClick={() => trackProductSelect(product, { source_page: analyticsSection, section: analyticsSection, interaction_type: 'card' })}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-lazule-royal via-lazule-night to-lazule-blue">
          {product.image && !hasImageFailed ? (
            <>
              {isImageLoading && <ProductImageSkeleton />}
              <img
                className={`absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105 group-active:scale-[1.025] ${
                  isImageLoading ? 'opacity-0' : 'opacity-90'
                }`}
                src={product.image}
                alt={`Perfume ${product.name}`}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsImageLoading(false)}
                onError={() => {
                  setHasImageFailed(true);
                  setIsImageLoading(false);
                }}
              />
            </>
          ) : (
            <ProductImageFallback label={product.image ? 'Imagem temporariamente indisponível' : 'Imagem em atualização'} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-lazule-night/80 via-transparent to-transparent" />
          <span className="absolute left-4 top-4 rounded-full border border-lazule-gold/35 bg-lazule-night/58 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-lazule-gold backdrop-blur">
            {heroBadge}
          </span>
        </div>

        <div className="flex flex-1 flex-col px-4 py-4">
          <p className="line-clamp-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{product.brand}</p>
          <h3 className="mt-2 line-clamp-2 font-display text-[1.65rem] leading-[0.98] text-lazule-mist transition group-hover:text-lazule-gold">
            {product.name}
          </h3>
          <strong className="mt-4 text-xl text-lazule-mist">{formatBRL(product.salePrice)}</strong>
        </div>
      </a>
    </article>
  );
}
