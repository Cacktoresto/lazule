import { createWhatsAppLink } from '../utils/whatsapp';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-lazule-night/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="group flex items-center gap-3" aria-label="LAZULE FRAGRANCES">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-lazule-gold/40 bg-lazule-royal/30 text-lg font-semibold text-lazule-gold shadow-aureate">
            L
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.38em] text-lazule-mist">
              Lazule
            </span>
            <span className="block text-[0.68rem] uppercase tracking-[0.28em] text-lazule-gold">
              Fragrances
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a className="transition hover:text-lazule-gold" href="#top">
            Início
          </a>
          <a className="transition hover:text-lazule-gold" href="#catalogo">
            Catálogo
          </a>
          <a className="transition hover:text-lazule-gold" href="#atendimento">
            Atendimento
          </a>
        </nav>

        <a
          className="hidden rounded-full border border-lazule-gold/40 bg-lazule-gold px-5 py-2.5 text-sm font-semibold text-lazule-night shadow-aureate transition hover:-translate-y-0.5 hover:bg-[#dfbd68] lg:inline-flex"
          href={createWhatsAppLink('Olá! Quero conhecer o catálogo da LAZULE FRAGRANCES.')}
          target="_blank"
          rel="noreferrer"
        >
          Falar no WhatsApp
        </a>
      </div>
    </header>
  );
}
