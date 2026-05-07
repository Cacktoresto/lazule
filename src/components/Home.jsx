import { createWhatsAppLink } from '../utils/whatsapp';

const catalogWhatsAppLink = createWhatsAppLink('Olá! Quero uma recomendação premium da LAZULE FRAGRANCES.');

const fragranceWorlds = [
  {
    title: 'Importados',
    eyebrow: 'Clássicos e lançamentos',
    description: 'Seleção de grifes internacionais com assinatura elegante, ótima presença e compra assistida.',
    href: '/catalogo?tipo=Importado',
    cta: 'Ver importados',
  },
  {
    title: 'Árabes',
    eyebrow: 'Intensidade marcante',
    description: 'Perfumes envolventes, com projeção generosa, boa performance e propostas olfativas memoráveis.',
    href: '/catalogo?tipo=%C3%81rabe',
    cta: 'Ver árabes',
  },
  {
    title: 'Nicho',
    eyebrow: 'Descobertas autorais',
    description: 'Fragrâncias menos óbvias para quem busca exclusividade, sofisticação e uma experiência mais rara.',
    href: '/catalogo?tipo=Nicho',
    cta: 'Ver nicho',
  },
];

const lazuleReasons = [
  'Curadoria objetiva para reduzir dúvidas e acelerar boas escolhas.',
  'Atendimento direto pelo WhatsApp antes da compra.',
  'Seleção organizada entre pronta entrega, encomenda e disponibilidade consultiva.',
];

const heroHighlights = ['Importados selecionados', 'Árabes intensos', 'Nicho exclusivo'];

export function Home() {
  return (
    <>
      <section id="top" className="relative overflow-hidden bg-lazule-depth">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(115deg,transparent_0%,rgba(248,250,252,0.08)_45%,transparent_46%)]" />
        <div className="pointer-events-none absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-lazule-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-8 h-80 w-80 rounded-full bg-lazule-blue/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.03fr_0.97fr] lg:py-24 xl:py-28">
          <div className="flex flex-col justify-center">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.45em] text-lazule-gold">
              LAZULE FRAGRANCES
            </p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.96] text-lazule-mist sm:text-6xl lg:text-7xl">
              Sua próxima assinatura olfativa começa com uma curadoria premium.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200">
              Explore perfumes importados, árabes e nicho em uma experiência clara, sofisticada e acompanhada por atendimento humano antes da compra.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                className="lazule-premium-button lazule-cta-shimmer inline-flex items-center justify-center rounded-full bg-lazule-gold px-8 py-4 font-semibold text-lazule-night shadow-aureate focus:outline-none focus:ring-2 focus:ring-lazule-gold focus:ring-offset-2 focus:ring-offset-lazule-night"
                href="/catalogo"
              >
                Ver catálogo
              </a>
              <a
                className="lazule-premium-button inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 font-semibold text-lazule-mist backdrop-blur hover:border-lazule-gold/60 hover:text-lazule-gold focus:outline-none focus:ring-2 focus:ring-lazule-gold focus:ring-offset-2 focus:ring-offset-lazule-night"
                href={catalogWhatsAppLink}
                target="_blank"
                rel="noreferrer"
              >
                Falar no WhatsApp
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {heroHighlights.map((highlight) => (
                <a
                  key={highlight}
                  className="rounded-full border border-lazule-gold/20 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 transition hover:border-lazule-gold/60 hover:text-lazule-gold focus:outline-none focus:ring-2 focus:ring-lazule-gold focus:ring-offset-2 focus:ring-offset-lazule-night"
                  href={`/catalogo?busca=${encodeURIComponent(highlight.replace(' selecionados', '').replace(' intensos', '').replace(' exclusivo', ''))}`}
                >
                  {highlight}
                </a>
              ))}
            </div>
          </div>

          <div className="relative min-h-[430px] rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-mineral backdrop-blur sm:p-6">
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-lazule-gold/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-lazule-blue/30 blur-3xl" />
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-lazule-night/70 p-6 sm:p-8">
              <div>
                <div className="mb-8 h-1 w-24 rounded-full bg-lazule-gold" />
                <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Boutique olfativa</p>
                <h2 className="mt-4 font-display text-4xl text-lazule-mist sm:text-5xl">Descoberta guiada, escolha segura.</h2>
                <p className="mt-5 text-sm leading-6 text-slate-300">
                  Conte seu estilo, ocasião e faixa de investimento. A LAZULE direciona você para opções com presença, elegância e disponibilidade consultiva.
                </p>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <a className="lazule-product-card rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-lazule-gold/50" href="/catalogo">
                  <span className="text-sm font-semibold text-lazule-gold">Explorar catálogo</span>
                  <span className="mt-2 block text-xs leading-5 text-slate-400">Veja toda a seleção premium.</span>
                </a>
                <a className="lazule-product-card rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-lazule-gold/50" href={catalogWhatsAppLink} target="_blank" rel="noreferrer">
                  <span className="text-sm font-semibold text-lazule-gold">Conhecer curadoria</span>
                  <span className="mt-2 block text-xs leading-5 text-slate-400">Receba orientação pelo WhatsApp.</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.38em] text-lazule-gold">Universos LAZULE</p>
            <h2 className="font-display text-4xl text-lazule-mist sm:text-5xl">Três caminhos funcionais para chegar ao perfume certo.</h2>
          </div>
          <a
            className="lazule-premium-button inline-flex w-fit justify-center rounded-full border border-lazule-gold/40 px-6 py-3 text-sm font-semibold text-lazule-gold hover:bg-lazule-gold hover:text-lazule-night"
            href="/catalogo"
          >
            Explorar catálogo
          </a>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {fragranceWorlds.map((world) => (
            <a key={world.title} className="lazule-product-card group block rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-mineral backdrop-blur transition hover:border-lazule-gold/55 focus:outline-none focus:ring-2 focus:ring-lazule-gold focus:ring-offset-2 focus:ring-offset-lazule-night" href={world.href}>
              <span className="mb-7 block h-1 w-16 rounded-full bg-lazule-gold" />
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-lazule-gold">{world.eyebrow}</p>
              <h3 className="font-display text-3xl text-lazule-mist group-hover:text-lazule-gold">{world.title}</h3>
              <p className="mt-4 text-sm leading-6 text-slate-300">{world.description}</p>
              <span className="mt-7 inline-flex text-sm font-semibold text-lazule-gold">
                {world.cta} <span aria-hidden="true" className="ml-2">→</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-24">
        <div className="grid gap-8 overflow-hidden rounded-[3rem] border border-lazule-gold/20 bg-lazule-depth p-7 shadow-mineral sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-lazule-gold">Por que LAZULE?</p>
            <h2 className="mt-4 font-display text-4xl text-lazule-mist sm:text-5xl">Premium sem complicar a escolha.</h2>
            <a
              className="lazule-premium-button mt-7 inline-flex rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-lazule-mist hover:border-lazule-gold/60 hover:text-lazule-gold"
              href={catalogWhatsAppLink}
              target="_blank"
              rel="noreferrer"
            >
              Conhecer curadoria
            </a>
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
