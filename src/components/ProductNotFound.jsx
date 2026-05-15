import { createWhatsAppLink } from '../utils/whatsapp';
import { trackWhatsAppClick } from '../utils/analytics';

function getRequestedTerm() {
  return new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
}

export function ProductNotFound() {
  const requestedTerm = getRequestedTerm();
  const whatsappMessage = requestedTerm
    ? `Olá! Gostaria de consultar disponibilidade do perfume: ${requestedTerm}`
    : 'Olá! Gostaria de consultar disponibilidade de um perfume.';

  return (
    <section className="relative overflow-hidden px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-lazule-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-lazule-blue/25 blur-3xl" />

      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[3rem] border border-lazule-gold/25 bg-lazule-depth/85 p-7 text-center shadow-mineral backdrop-blur sm:p-10 lg:p-14">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full border border-lazule-gold/40 bg-lazule-royal/35 text-2xl font-semibold text-lazule-gold shadow-aureate">
          L
        </div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.42em] text-lazule-gold">Curadoria LAZULE</p>
        <h1 className="font-display text-4xl leading-tight text-lazule-mist sm:text-5xl lg:text-6xl">
          Ops… não encontramos essa fragrância no catálogo atual.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Nosso catálogo está sempre evoluindo e podemos verificar disponibilidade diretamente para você.
        </p>

        {requestedTerm && (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-4 text-sm text-slate-300">
            Perfume consultado: <strong className="font-semibold text-lazule-gold">{requestedTerm}</strong>
          </div>
        )}

        <div className="mx-auto mt-9 grid max-w-xl gap-3 sm:grid-cols-[1.1fr_0.9fr]">
          <a
            className="lazule-premium-button lazule-cta-shimmer inline-flex min-h-12 items-center justify-center rounded-full bg-lazule-gold px-6 py-3 text-sm font-semibold text-lazule-night shadow-aureate"
            href={createWhatsAppLink(whatsappMessage)}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackWhatsAppClick({ source_page: 'product_not_found', cta_location: 'not_found_whatsapp', search_term: requestedTerm })}
          >
            <span className="relative z-10">Consultar disponibilidade no WhatsApp</span>
          </a>
          <a
            className="lazule-premium-button inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-lazule-mist hover:border-lazule-gold/60 hover:text-lazule-gold"
            href="/catalogo"
          >
            Voltar ao catálogo
          </a>
        </div>
      </div>
    </section>
  );
}
