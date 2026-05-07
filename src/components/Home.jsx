import { createWhatsAppLink } from '../utils/whatsapp';

const fragranceWorlds = [
  {
    title: 'Importados',
    description: 'Clássicos internacionais e lançamentos de presença refinada para quem busca assinatura elegante.',
  },
  {
    title: 'Árabes',
    description: 'Perfumes intensos, envolventes e marcantes, com projeção generosa e acabamento sofisticado.',
  },
  {
    title: 'Nicho',
    description: 'Descobertas olfativas autorais e propostas menos óbvias para uma experiência mais exclusiva.',
  },
];

const lazuleReasons = [
  'Curadoria objetiva para reduzir dúvidas e acelerar boas escolhas.',
  'Atendimento direto pelo WhatsApp antes da compra.',
  'Seleção organizada entre pronta entrega, encomenda e disponibilidade consultiva.',
];

export function Home() {
  return (
    <>
      <section id="top" className="relative overflow-hidden bg-lazule-depth">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(115deg,transparent_0%,rgba(248,250,252,0.08)_45%,transparent_46%)]" />
        <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-lazule-gold/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="flex flex-col justify-center">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.45em] text-lazule-gold">
              LAZULE FRAGRANCES
            </p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.98] text-lazule-mist sm:text-6xl lg:text-7xl">
              Fragrâncias premium para transformar presença em assinatura.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200">
              Curadoria de importados, árabes e nicho com a profundidade azul do lápis-lazúli e atendimento humano pelo WhatsApp.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                className="lazule-premium-button lazule-cta-shimmer inline-flex items-center justify-center rounded-full bg-lazule-gold px-7 py-3.5 font-semibold text-lazule-night shadow-aureate"
                href="/catalogo"
              >
                Explorar catálogo
              </a>
              <a
                className="lazule-premium-button inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3.5 font-semibold text-lazule-mist backdrop-blur hover:border-lazule-gold/60 hover:text-lazule-gold"
                href={createWhatsAppLink('Olá! Quero uma recomendação premium da LAZULE FRAGRANCES.')}
                target="_blank"
                rel="noreferrer"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="relative min-h-[430px] rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-6 shadow-mineral backdrop-blur">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-lazule-gold/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-lazule-blue/30 blur-3xl" />
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-lazule-night/70 p-8">
              <div>
                <div className="mb-8 h-1 w-24 rounded-full bg-lazule-gold" />
                <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Boutique olfativa</p>
                <h2 className="mt-4 font-display text-4xl text-lazule-mist">Descoberta guiada, compra segura.</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {['Curadoria', 'Presença', 'Elegância', 'Confiança'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <span className="text-sm font-semibold text-lazule-gold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="mb-9 max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.38em] text-lazule-gold">Universos LAZULE</p>
          <h2 className="font-display text-4xl text-lazule-mist sm:text-5xl">Três caminhos para encontrar sua próxima fragrância.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {fragranceWorlds.map((world) => (
            <article key={world.title} className="lazule-product-card rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-mineral backdrop-blur">
              <span className="mb-7 block h-1 w-16 rounded-full bg-lazule-gold" />
              <h3 className="font-display text-3xl text-lazule-mist">{world.title}</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">{world.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-24">
        <div className="grid gap-8 overflow-hidden rounded-[3rem] border border-lazule-gold/20 bg-lazule-depth p-7 shadow-mineral sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-lazule-gold">Por que LAZULE?</p>
            <h2 className="mt-4 font-display text-4xl text-lazule-mist sm:text-5xl">Premium sem complicar a escolha.</h2>
          </div>
          <div className="grid gap-4">
            {lazuleReasons.map((reason) => (
              <div key={reason} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 text-sm leading-6 text-slate-300">
                {reason}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
