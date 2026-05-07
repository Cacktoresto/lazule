import { useState } from 'react';
import { formatBRL } from '../utils/currency';
import { createProductWhatsAppMessage, createWhatsAppLink } from '../utils/whatsapp';

function ProductImageFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_28%_18%,rgba(200,162,77,0.22),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.34),transparent_28%),linear-gradient(135deg,#0F172A_0%,#1E3A8A_52%,#0F172A_100%)]">
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(115deg,transparent_0%,rgba(248,250,252,0.12)_46%,transparent_48%),radial-gradient(circle_at_50%_120%,rgba(200,162,77,0.2),transparent_34%)]" />
      <div className="absolute -left-14 top-8 h-44 w-44 rounded-full border border-lazule-gold/20 bg-lazule-blue/20 blur-2xl" />
      <div className="absolute bottom-5 right-5 h-28 w-28 rounded-full border border-lazule-gold/30" />
      <div className="absolute inset-6 rounded-[1.5rem] border border-lazule-gold/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-lazule-gold/40 bg-lazule-night/45 text-4xl font-semibold text-lazule-gold shadow-aureate backdrop-blur">
          L
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-lazule-gold">LAZULE</p>
        <p className="mt-3 max-w-[13rem] text-xs uppercase leading-5 tracking-[0.22em] text-slate-200">
          Curadoria visual em atualização
        </p>
      </div>
    </div>
  );
}

function ProductImageSkeleton() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-lazule-night/75" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(200,162,77,0.24),transparent_26%),radial-gradient(circle_at_75%_26%,rgba(37,99,235,0.22),transparent_32%)]" />
      <div className="absolute inset-x-6 top-8 h-48 rounded-[1.5rem] border border-white/10 bg-white/[0.06]" />
      <div className="absolute bottom-20 left-6 h-3 w-28 rounded-full bg-white/10" />
      <div className="absolute bottom-12 left-6 h-7 w-48 rounded-full bg-white/10" />
      <div className="absolute inset-y-0 -left-2/3 w-2/3 animate-lazule-shimmer bg-gradient-to-r from-transparent via-white/18 to-transparent" />
    </div>
  );
}

export function ProductCard({ product }) {
  const [isImageLoading, setIsImageLoading] = useState(Boolean(product.image));
  const message = createProductWhatsAppMessage(product.name);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-mineral backdrop-blur transition hover:-translate-y-1 hover:border-lazule-gold/40">
      <div className="relative min-h-64 overflow-hidden bg-gradient-to-br from-lazule-royal via-lazule-night to-lazule-blue p-6">
        {product.image ? (
          <>
            {isImageLoading && <ProductImageSkeleton />}
            <img
              className={`absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
                isImageLoading ? 'opacity-0' : 'opacity-80'
              }`}
              src={product.image}
              alt={`Perfume ${product.name}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          </>
        ) : (
          <ProductImageFallback />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lazule-night via-lazule-night/35 to-transparent" />
        {product.featured && (
          <span className="relative z-10 inline-flex rounded-full border border-lazule-gold/40 bg-lazule-night/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lazule-gold backdrop-blur">
            Destaque
          </span>
        )}
        <div className="relative z-10 mt-28">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-200">{product.brand}</p>
          <h3 className="mt-3 font-display text-3xl leading-tight text-lazule-mist">{product.name}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {product.badges.map((badge) => (
            <span key={badge} className="rounded-full border border-lazule-gold/30 bg-lazule-gold/10 px-3 py-1 text-xs text-lazule-gold">
              {badge}
            </span>
          ))}
        </div>

        {product.description && <p className="text-sm leading-6 text-slate-300">{product.description}</p>}
        {product.olfactoryReference && (
          <p className="mt-4 text-sm text-slate-400">
            <span className="text-lazule-gold">Referência olfativa:</span> {product.olfactoryReference}
          </p>
        )}

        <div className="mt-auto pt-6">
          <div className="mb-5 flex items-end justify-between gap-4 border-t border-white/10 pt-5">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Preço LAZULE</span>
            <strong className="text-2xl text-lazule-mist">{formatBRL(product.salePrice)}</strong>
          </div>
          <a
            className="inline-flex w-full items-center justify-center rounded-full bg-lazule-gold px-5 py-3 font-semibold text-lazule-night transition hover:bg-[#dfbd68]"
            href={createWhatsAppLink(message)}
            target="_blank"
            rel="noreferrer"
          >
            Consultar no WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
