import { createWhatsAppLink } from '../utils/whatsapp';

const navigationItems = [
  { href: '/', label: 'Início' },
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/faq', label: 'Como funciona' },
];

function NavigationLink({ href, children, className = '' }) {
  return (
    <a
      className={`rounded-full px-3 py-2 transition duration-200 hover:bg-white/5 hover:text-lazule-gold active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night ${className}`}
      href={href}
    >
      {children}
    </a>
  );
}

export function Header({ immersiveProduct = false }) {
  return (
    <header className={`${immersiveProduct ? 'hidden lg:block' : ''} sticky top-0 z-40 border-b border-white/10 bg-lazule-night/85 backdrop-blur-xl`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <a
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-2xl transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
          aria-label="LAZULE FRAGRANCES"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-lazule-gold/40 bg-lazule-royal/30 text-lg font-semibold text-lazule-gold shadow-aureate transition duration-200 group-hover:border-lazule-gold/70">
            L
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold uppercase tracking-[0.3em] text-lazule-mist sm:tracking-[0.38em]">
              Lazule
            </span>
            <span className="block truncate text-[0.68rem] uppercase tracking-[0.22em] text-lazule-gold sm:tracking-[0.28em]">
              Fragrances
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-2 text-sm text-slate-300 md:flex" aria-label="Navegação principal">
          {navigationItems.map((item) => (
            <NavigationLink key={item.href} href={item.href}>
              {item.label}
            </NavigationLink>
          ))}
        </nav>

        <a
          className="lazule-premium-button lazule-cta-shimmer hidden rounded-full border border-lazule-gold/40 bg-lazule-gold px-5 py-2.5 text-sm font-semibold text-lazule-night shadow-aureate lg:inline-flex"
          href={createWhatsAppLink('Olá! Quero conhecer o catálogo da LAZULE FRAGRANCES.')}
          target="_blank"
          rel="noreferrer"
        >
          <span className="relative z-10">Falar no WhatsApp</span>
        </a>
      </div>

      <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 text-sm text-slate-300 [scrollbar-width:none] md:hidden" aria-label="Navegação mobile">
        {navigationItems.map((item) => (
          <NavigationLink key={item.href} href={item.href} className="shrink-0 border border-white/10 bg-white/[0.04]">
            {item.label}
          </NavigationLink>
        ))}
      </nav>
    </header>
  );
}
