import { createWhatsAppLink } from '../utils/whatsapp';

export function WhatsAppButton() {
  return (
    <a
      className="lazule-premium-button lazule-cta-shimmer fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-lazule-gold text-xl font-black text-lazule-night shadow-aureate sm:h-auto sm:w-auto sm:px-5 sm:py-3 sm:text-sm sm:font-semibold"
      href={createWhatsAppLink('Olá! Quero conhecer o catálogo da LAZULE FRAGRANCES.')}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a LAZULE pelo WhatsApp"
    >
      <span className="sm:hidden">W</span>
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
