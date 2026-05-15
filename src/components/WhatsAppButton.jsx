import { trackEvent, trackWhatsappClick } from '../utils/analytics';
import { createWhatsAppLink } from '../utils/whatsapp';

export function WhatsAppButton({ hidden = false } = {}) {
  if (hidden) {
    return null;
  }

  return (
    <a
      className="lazule-floating-whatsapp lazule-premium-button lazule-cta-shimmer fixed bottom-[calc(20px+env(safe-area-inset-bottom))] right-[calc(16px+env(safe-area-inset-right))] z-[55] inline-flex h-14 w-14 items-center justify-center rounded-full border border-lazule-gold/40 bg-lazule-gold text-lg font-black leading-none text-lazule-night shadow-aureate outline-none transition-all duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night sm:bottom-[calc(24px+env(safe-area-inset-bottom))] sm:right-[calc(24px+env(safe-area-inset-right))] sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:text-sm sm:font-semibold"
      href={createWhatsAppLink('Olá! Quero conhecer o catálogo da LAZULE FRAGRANCES.')}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a curadoria LAZULE FRAGRANCES pelo WhatsApp"
      onClick={() => {
        trackEvent('floating_whatsapp_click', { source_page: 'global', cta_location: 'floating_whatsapp' });
        trackWhatsappClick({ source_page: 'global', cta_location: 'floating_whatsapp' });
      }}
    >
      <span className="relative z-10 flex h-full w-full items-center justify-center sm:hidden" aria-hidden="true">W</span>
      <span className="relative z-10 hidden sm:inline">WhatsApp</span>
    </a>
  );
}
