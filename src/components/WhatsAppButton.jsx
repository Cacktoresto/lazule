import { trackWhatsAppClick } from '../utils/analytics';
import { createWhatsAppLink } from '../utils/whatsapp';

export function WhatsAppButton() {
  return (
    <a
      className="lazule-premium-button lazule-cta-shimmer fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-lazule-gold/40 bg-lazule-gold text-lg font-black leading-none text-lazule-night shadow-aureate outline-none sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:text-sm sm:font-semibold"
      href={createWhatsAppLink('Olá! Quero conhecer o catálogo da LAZULE FRAGRANCES.')}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a LAZULE pelo WhatsApp"
      onClick={() => trackWhatsAppClick({ section: 'floating_button' })}
    >
      <span className="relative z-10 flex h-full w-full items-center justify-center sm:hidden" aria-hidden="true">W</span>
      <span className="relative z-10 hidden sm:inline">WhatsApp</span>
    </a>
  );
}
