import { useMemo } from 'react';
import { getCatalogProducts } from '../utils/catalog';
import { createProductPath, findProductBySlug } from '../utils/productRouting';
import { createWhatsAppLink } from '../utils/whatsapp';
import { trackWhatsAppClick } from '../utils/analytics';

function getSuggestionParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    requestedTerm: params.get('q')?.trim() ?? '',
    suggestionSlug: params.get('suggestion')?.trim() ?? '',
  };
}

export function ProductSuggestion() {
  const { requestedTerm, suggestionSlug } = getSuggestionParams();
  const catalogProducts = useMemo(() => getCatalogProducts(), []);
  const suggestedProduct = suggestionSlug ? findProductBySlug(catalogProducts, suggestionSlug) : null;
  const productName = suggestedProduct?.name ?? 'fragrância sugerida';
  const whatsappMessage = requestedTerm
    ? `Olá! Busquei por "${requestedTerm}" e gostaria de consultar disponibilidade da sugestão: ${productName}`
    : `Olá! Gostaria de consultar disponibilidade da sugestão: ${productName}`;

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
          Encontramos uma fragrância parecida com sua busca.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          Confira a sugestão mais próxima ou fale com nossa equipe para confirmar disponibilidade e alternativas.
        </p>

        <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
          {requestedTerm && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-4 text-sm text-slate-300">
              Busca: <strong className="font-semibold text-lazule-gold">{requestedTerm}</strong>
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-5 py-4 text-sm text-slate-300">
            Sugestão: <strong className="font-semibold text-lazule-gold">{productName}</strong>
          </div>
        </div>

        <div className="mx-auto mt-9 grid max-w-3xl gap-3 lg:grid-cols-3">
          {suggestedProduct ? (
            <a
              className="lazule-premium-button lazule-cta-shimmer inline-flex min-h-12 items-center justify-center rounded-full bg-lazule-gold px-6 py-3 text-sm font-semibold text-lazule-night shadow-aureate"
              href={createProductPath(suggestedProduct)}
            >
              <span className="relative z-10">Ver sugestão</span>
            </a>
          ) : (
            <a
              className="lazule-premium-button lazule-cta-shimmer inline-flex min-h-12 items-center justify-center rounded-full bg-lazule-gold px-6 py-3 text-sm font-semibold text-lazule-night shadow-aureate"
              href="/catalogo"
            >
              <span className="relative z-10">Ver catálogo</span>
            </a>
          )}
          <a
            className="lazule-premium-button inline-flex min-h-12 items-center justify-center rounded-full border border-lazule-gold/50 bg-lazule-gold/10 px-6 py-3 text-sm font-semibold text-lazule-gold hover:bg-lazule-gold hover:text-lazule-night"
            href={createWhatsAppLink(whatsappMessage)}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackWhatsAppClick({ source_page: 'product_suggestion', cta_location: 'suggestion_whatsapp', search_term: requestedTerm, product_name: productName })}
          >
            Consultar disponibilidade no WhatsApp
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
