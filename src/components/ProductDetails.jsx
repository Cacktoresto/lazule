import { useState } from 'react';
import { products } from '../data/products';
import { formatBRL } from '../utils/currency';
import { createProductSlug, findProductBySlug } from '../utils/productRouting';
import { createProductWhatsAppMessage, createWhatsAppLink } from '../utils/whatsapp';
import { ProductImageFallback } from './ProductCard';

function DetailImage({ product }) {
  const [isImageLoading, setIsImageLoading] = useState(Boolean(product?.image));

  return (
    <div className="relative min-h-[22rem] overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-gradient-to-br from-lazule-royal via-lazule-night to-lazule-blue shadow-mineral sm:min-h-[30rem] lg:min-h-[40rem]">
      {product?.image ? (
        <>
          {isImageLoading && (
            <div className="absolute inset-0 overflow-hidden bg-lazule-night/75" aria-hidden="true">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(200,162,77,0.24),transparent_26%),radial-gradient(circle_at_75%_26%,rgba(37,99,235,0.22),transparent_32%)]" />
              <div className="absolute inset-x-8 top-10 h-2/3 rounded-[1.5rem] border border-white/10 bg-white/[0.06]" />
              <div className="absolute inset-y-0 -left-2/3 w-2/3 animate-lazule-shimmer bg-gradient-to-r from-transparent via-white/18 to-transparent" />
            </div>
          )}
          <img
            className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
              isImageLoading ? 'opacity-0' : 'opacity-90'
            }`}
            src={product.image}
            alt={`Perfume ${product.name}`}
            loading="eager"
            decoding="async"
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
          />
        </>
      ) : (
        <ProductImageFallback />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-lazule-night via-lazule-night/20 to-transparent" />
      <div className="absolute inset-6 rounded-[1.5rem] border border-white/10" />
    </div>
  );
}

function ProductNotFound() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="overflow-hidden rounded-[2.5rem] border border-lazule-gold/20 bg-white/[0.055] p-8 text-center shadow-mineral backdrop-blur sm:p-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Curadoria LAZULE</p>
        <h1 className="font-display text-4xl text-lazule-mist sm:text-5xl">Produto não encontrado.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300">
          Esta fragrância pode ter mudado de endereço ou saído da seleção atual. Volte ao catálogo para consultar a curadoria disponível.
        </p>
        <a
          className="lazule-premium-button lazule-cta-shimmer mt-8 inline-flex rounded-full bg-lazule-gold px-7 py-3.5 font-semibold text-lazule-night shadow-aureate"
          href="/#catalogo"
        >
          Voltar ao catálogo
        </a>
      </div>
    </section>
  );
}

export function ProductDetails({ slug }) {
  const normalizedSlug = createProductSlug(slug);
  const product = findProductBySlug(products, normalizedSlug);

  if (!product) {
    return <ProductNotFound />;
  }

  const badges = Array.isArray(product.badges) ? product.badges : [];
  const description = String(product.description || '').trim();
  const olfactoryReference = String(product.olfactoryReference || '').trim();
  const whatsAppMessage = createProductWhatsAppMessage(product.name);

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
      <a className="mb-8 inline-flex text-sm font-semibold text-lazule-gold transition hover:text-[#dfbd68]" href="/#catalogo">
        ← Voltar ao catálogo
      </a>

      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <DetailImage product={product} />

        <article className="rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-6 shadow-mineral backdrop-blur sm:p-8 lg:p-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-lazule-gold">Página individual</p>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-300">{product.brand}</p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-lazule-mist sm:text-5xl lg:text-6xl">{product.name}</h1>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-lazule-night/35 p-4">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Categoria</span>
              <p className="mt-2 font-semibold text-lazule-mist">{product.category}</p>
            </div>
            {product.gender && (
              <div className="rounded-2xl border border-white/10 bg-lazule-night/35 p-4">
                <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Gênero</span>
                <p className="mt-2 font-semibold text-lazule-mist">{product.gender}</p>
              </div>
            )}
          </div>

          {badges.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span key={badge} className="rounded-full border border-lazule-gold/30 bg-lazule-gold/10 px-3 py-1 text-xs text-lazule-gold">
                  {badge}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8 space-y-6 text-base leading-8 text-slate-300">
            {description && <p>{description}</p>}
            {olfactoryReference && (
              <p>
                <span className="font-semibold text-lazule-gold">Referência olfativa:</span> {olfactoryReference}
              </p>
            )}
          </div>

          <div className="mt-10 rounded-[2rem] border border-lazule-gold/20 bg-lazule-night/45 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <span className="text-xs uppercase tracking-[0.25em] text-slate-400">Preço LAZULE</span>
              <strong className="text-3xl text-lazule-mist">{formatBRL(product.salePrice)}</strong>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                className="lazule-premium-button lazule-cta-shimmer inline-flex flex-1 items-center justify-center rounded-full bg-lazule-gold px-6 py-3.5 font-semibold text-lazule-night shadow-aureate"
                href={createWhatsAppLink(whatsAppMessage)}
                target="_blank"
                rel="noreferrer"
              >
                Consultar no WhatsApp
              </a>
              <a
                className="lazule-premium-button inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3.5 font-semibold text-lazule-mist backdrop-blur hover:border-lazule-gold/60 hover:text-lazule-gold"
                href="/#catalogo"
              >
                Voltar ao catálogo
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
