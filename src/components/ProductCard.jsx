import { formatBRL } from '../utils/currency';
import { createProductWhatsAppMessage, createWhatsAppLink } from '../utils/whatsapp';

export function ProductCard({ product }) {
  const message = createProductWhatsAppMessage(product.name);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-mineral backdrop-blur transition hover:-translate-y-1 hover:border-lazule-gold/40">
      <div className="relative min-h-64 overflow-hidden bg-gradient-to-br from-lazule-royal via-lazule-night to-lazule-blue p-6">
        {product.image ? (
          <img
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
            src={product.image}
            alt={`Perfume ${product.name}`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_30%_20%,rgba(200,162,77,0.28),transparent_28%),linear-gradient(130deg,transparent_0%,rgba(248,250,252,0.13)_48%,transparent_50%)]" />
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
