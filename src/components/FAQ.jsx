import { useEffect } from 'react';
import { createWhatsAppLink } from '../utils/whatsapp';
import { applyFaqSeo } from '../utils/seo';

const steps = [
  {
    title: 'Como comprar',
    description: 'Explore o catálogo, abra a página do produto e confirme detalhes, valores e disponibilidade pelo WhatsApp antes de fechar o pedido.',
  },
  {
    title: 'Atendimento pelo WhatsApp',
    description: 'O atendimento é consultivo: ajudamos a comparar famílias olfativas, marcas, ocasiões de uso e alternativas dentro do seu objetivo.',
  },
  {
    title: 'Disponibilidade dos produtos',
    description: 'A seleção pode mudar conforme estoque e fornecedor. Por isso, a confirmação final acontece sempre no atendimento.',
  },
  {
    title: 'Pronta entrega e encomenda',
    description: 'Alguns itens podem estar disponíveis para envio ou retirada mais rápida; outros entram como encomenda mediante consulta.',
  },
  {
    title: 'Envio/retirada',
    description: 'As opções de envio ou retirada são alinhadas no WhatsApp de acordo com sua localização, produto escolhido e disponibilidade.',
  },
  {
    title: 'Curadoria LAZULE',
    description: 'A LAZULE organiza importados, árabes e nicho em uma experiência limpa para facilitar descobertas premium e compras mais seguras.',
  },
];

export function FAQ() {
  useEffect(() => {
    applyFaqSeo();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
      <div className="relative overflow-hidden rounded-[3rem] border border-lazule-gold/20 bg-lazule-depth p-7 shadow-mineral sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lazule-blue/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-12 h-40 w-40 rounded-full bg-lazule-gold/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.42em] text-lazule-gold">Como funciona</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-lazule-mist sm:text-6xl lg:text-7xl">Uma compra premium, clara e assistida.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            A LAZULE combina catálogo digital com atendimento humano para confirmar disponibilidade, orientar escolhas e conduzir cada pedido com segurança.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className="lazule-premium-button lazule-cta-shimmer inline-flex justify-center rounded-full bg-lazule-gold px-7 py-3.5 font-semibold text-lazule-night shadow-aureate"
              href="/catalogo"
            >
              Explorar catálogo
            </a>
            <a
              className="lazule-premium-button inline-flex justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3.5 font-semibold text-lazule-mist backdrop-blur hover:border-lazule-gold/60 hover:text-lazule-gold"
              href={createWhatsAppLink('Olá! Quero entender como comprar na LAZULE FRAGRANCES.')}
              target="_blank"
              rel="noreferrer"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <article key={step.title} className="lazule-product-card rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-mineral backdrop-blur">
            <span className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-lazule-gold/35 bg-lazule-gold/10 text-sm font-semibold text-lazule-gold">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h2 className="font-display text-3xl text-lazule-mist">{step.title}</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
