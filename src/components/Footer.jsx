import { createWhatsAppLink } from '../utils/whatsapp';

export function Footer() {
  return (
    <footer id="atendimento" className="lazule-cinematic-footer border-t border-white/10 surface-lazule-dark px-4 py-9 sm:px-8 sm:py-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.38em] text-lazule-mist">LAZULE</p>
          <p className="mt-2 text-xs uppercase tracking-[0.28em] text-lazule-gold">Fragrances</p>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
            Curadoria premium de perfumes importados, árabes e nicho, com atendimento direto para escolher e comprar com segurança.
          </p>
        </div>
        <a
          className="lazule-premium-button inline-flex w-fit rounded-full border-laz-accent surface-lazule-card px-6 py-3 text-sm font-semibold text-lazule-mist hover:text-white laz-hover-lift"
          href={createWhatsAppLink('Olá! Preciso de atendimento da LAZULE FRAGRANCES.')}
          target="_blank"
          rel="noreferrer"
        >
          Falar no WhatsApp
        </a>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 LAZULE FRAGRANCES. Todos os direitos reservados.</span>
        <a
          className="w-fit rounded-full px-3 py-2 text-slate-500 transition hover:text-lazule-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
          href="/influencer/login"
          aria-label="Acessar Área do parceiro"
        >
          Área do parceiro
        </a>
      </div>
    </footer>
  );
}
