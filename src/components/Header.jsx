import { createWhatsAppLink } from '../utils/whatsapp';

const navigationItems = [
  { href: '/', label: 'Início' },
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/faq', label: 'Como funciona' },
  { href: '/identidade', label: 'Sua assinatura' },
  { href: '/influencer/login', label: 'Área do parceiro', ariaLabel: 'Acessar Área do parceiro', variant: 'partner' },
];

function NavigationLink({ href, children, className = '', ariaLabel }) {
  return (
    <a
      className={`rounded-full px-3 py-2.5 transition duration-200 hover:bg-lazule-blue/10 hover:text-lazule-mist active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night ${className}`}
      href={href}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

export function Header({ immersiveProduct = false }) {
  return (
    <header className={`${immersiveProduct ? 'hidden lg:block' : ''} lazule-cinematic-header sticky top-0 z-40 border-b border-white/10 surface-lazule-glass shadow-mineral-soft backdrop-blur-2xl`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-8 sm:py-4">
        <a
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-2xl transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
          aria-label="LAZULE FRAGRANCES"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 border border-lazule-gold/40 bg-lazule-royal/30 text-lg font-semibold text-lazule-gold shadow-aureate transition duration-200 group-hover:border-lazule-gold/70">
            L
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold uppercase tracking-[0.24em] text-lazule-mist sm:tracking-[0.38em]">
              Lazule
            </span>
            <span className="block truncate text-[0.64rem] uppercase tracking-[0.18em] text-lazule-gold sm:text-[0.68rem] sm:tracking-[0.28em]">
              Fragrances
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-2 text-sm text-slate-300 md:flex" aria-label="Navegação principal">
          {navigationItems.map((item) => (
            <NavigationLink
              key={item.href}
              href={item.href}
              ariaLabel={item.ariaLabel}
              className={item.variant === 'partner' ? 'text-slate-400 hover:text-lazule-gold' : ''}
            >
              {item.label}
            </NavigationLink>
          ))}
        </nav>

        <a
          className="lazule-premium-button lazule-cta-shimmer hidden rounded-full border border-lazule-gold/40 surface-lazule-card border-laz-accent px-5 py-2.5 text-sm font-semibold text-lazule-mist shadow-laz-glow hover:text-white lg:inline-flex"
          href={createWhatsAppLink('Olá! Quero conhecer o catálogo da LAZULE FRAGRANCES.')}
          target="_blank"
          rel="noreferrer"
        >
          <span className="relative z-10">Falar no WhatsApp</span>
        </a>
      </div>

      <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 pb-3 text-[0.82rem] text-slate-300 sm:flex sm:flex-wrap sm:text-sm md:hidden" aria-label="Navegação mobile">
        {navigationItems.map((item) => (
          <NavigationLink
            key={item.href}
            href={item.href}
            ariaLabel={item.ariaLabel}
            className={`shrink-0 border-glass surface-lazule-soft text-center ${
              item.variant === 'partner' ? 'border-lazule-gold/20 bg-lazule-gold/[0.035] text-slate-400' : ''
            }`}
          >
            {item.label}
          </NavigationLink>
        ))}
      </nav>
    </header>
  );
}
