import { createWhatsAppLink } from '../utils/whatsapp';

export function Footer() {
  return (
    <footer id="atendimento" className="border-t border-white/10 bg-lazule-night px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.38em] text-lazule-mist">LAZULE</p>
          <p className="mt-2 text-xs uppercase tracking-[0.28em] text-lazule-gold">Fragrances</p>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
            Catálogo premium em construção, com foco em curadoria, disponibilidade e atendimento direto para uma compra segura.
          </p>
        </div>
        <a
          className="lazule-premium-button inline-flex w-fit rounded-full border border-lazule-gold/40 px-6 py-3 text-sm font-semibold text-lazule-gold hover:bg-lazule-gold hover:text-lazule-night"
          href={createWhatsAppLink('Olá! Preciso de atendimento da LAZULE FRAGRANCES.')}
          target="_blank"
          rel="noreferrer"
        >
          Solicitar atendimento
        </a>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-xs text-slate-500">
        © 2026 LAZULE FRAGRANCES. Todos os direitos reservados.
      </div>
    </footer>
  );
}
