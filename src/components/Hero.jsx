import { createWhatsAppLink } from '../utils/whatsapp';

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-lazule-depth">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(115deg,transparent_0%,rgba(248,250,252,0.08)_45%,transparent_46%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        <div className="flex flex-col justify-center">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.45em] text-lazule-gold">
            LAZULE FRAGRANCES
          </p>
          <h1 className="max-w-4xl font-display text-5xl leading-[0.98] text-lazule-mist sm:text-6xl lg:text-7xl">
            Luxo mineral em fragrâncias de presença profunda.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200">
            Uma curadoria premium de perfumes importados e árabes, apresentada com a profundidade azul do lápis-lazúli e atendimento direto pelo WhatsApp.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <a
              className="inline-flex items-center justify-center rounded-full bg-lazule-gold px-7 py-3.5 font-semibold text-lazule-night shadow-aureate transition hover:-translate-y-0.5 hover:bg-[#dfbd68]"
              href="#catalogo"
            >
              Ver catálogo
            </a>
            <a
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 py-3.5 font-semibold text-lazule-mist backdrop-blur transition hover:-translate-y-0.5 hover:border-lazule-gold/60 hover:text-lazule-gold"
              href={createWhatsAppLink('Olá! Quero uma recomendação premium da LAZULE FRAGRANCES.')}
              target="_blank"
              rel="noreferrer"
            >
              Comprar pelo WhatsApp
            </a>
          </div>
        </div>

        <div className="relative min-h-[430px] rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-6 shadow-mineral backdrop-blur">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-lazule-gold/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-lazule-blue/30 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] border border-lazule-gold/20 bg-lazule-night/70 p-8">
            <div>
              <div className="mb-8 h-1 w-24 rounded-full bg-lazule-gold" />
              <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Seleção curada</p>
              <h2 className="mt-4 font-display text-4xl text-lazule-mist">Perfumes para assinatura olfativa.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {['Profundo', 'Elegante', 'Mineral', 'Memorável'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <span className="text-sm font-semibold text-lazule-gold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
