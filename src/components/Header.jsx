import { useEffect, useState } from 'react';
import { createWhatsAppLink } from '../utils/whatsapp';
import { CartDrawer } from './commerce/CartDrawer';
import { useLuxuryCart } from '../commerce/checkout/useLuxuryCart';

const navigationItems = [
  { href: '/', label: 'Início' },
  { href: '/catalogo', label: 'Curadoria' },
  { href: '/faq', label: 'Ritual' },
  { href: '/identidade', label: 'Assinatura olfativa' },
  { href: '/carrinho', label: 'Seleção' },
];

export function Header({ immersiveProduct = false, suppressCartUi = false }) {
  return <header className={`${immersiveProduct ? 'lazule-header--immersive-product' : ''} lazule-header sticky top-0 z-40 border-b border-white/[0.075] bg-[rgba(5,10,25,0.82)] backdrop-blur-2xl`}>
    <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-8 lg:py-3'>
      <a href='/' className='group inline-flex items-center gap-3 text-lazule-gold' aria-label='LAZULE Fragrances — início'>
        <span className='grid h-8 w-8 place-items-center rounded-full border border-lazule-gold/30 bg-lazule-gold/10 font-display text-base leading-none shadow-[0_12px_30px_rgba(200,162,77,0.08)] transition group-hover:border-lazule-gold/50 sm:h-9 sm:w-9 sm:text-lg'>L</span>
        <span className='leading-none'>
          <span className='block text-[0.68rem] font-semibold uppercase tracking-[0.3em] sm:text-[0.72rem] sm:tracking-[0.34em]'>Lazule</span>
          <span className='mt-1 hidden text-[0.58rem] uppercase tracking-[0.3em] text-slate-300/62 sm:block'>Fragrance Intelligence</span>
        </span>
      </a>
      <nav className='hidden items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.035] p-1 text-sm text-slate-300 md:flex'>
        {navigationItems.map((item)=><a key={item.href} href={item.href} className='rounded-full px-3.5 py-2 text-[0.82rem] transition hover:bg-lazule-gold/10 hover:text-lazule-gold focus-visible:ring-2 focus-visible:ring-lazule-gold/60'>{item.label}</a>)}
      </nav>
      <div className='flex items-center gap-2'>
        <a className='lazule-premium-button hidden rounded-full border border-lazule-gold/30 bg-lazule-gold/10 px-5 py-2.5 text-sm font-semibold text-lazule-mist transition hover:border-lazule-gold/50 hover:text-lazule-gold lg:inline-flex' href={createWhatsAppLink('Olá! Quero uma curadoria olfativa da LAZULE FRAGRANCES.')} target='_blank' rel='noreferrer'>Concierge</a>
        {!suppressCartUi && <CartEntryPoint />}
      </div>
    </div>
  </header>;
}

function CartEntryPoint() {
  const [cartOpen, setCartOpen] = useState(false);
  const { items, total, quantity } = useLuxuryCart();
  const hasItems = quantity > 0;

  useEffect(() => {
    function handleSelectionAdded() {
      setCartOpen(true);
    }

    window.addEventListener('lazule:selection-added', handleSelectionAdded);
    return () => window.removeEventListener('lazule:selection-added', handleSelectionAdded);
  }, []);

  return <>
    <button
      type='button'
      onClick={() => setCartOpen(true)}
      className='relative inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-lazule-gold/40 bg-[linear-gradient(135deg,rgba(200,162,77,0.14),rgba(5,10,25,0.86))] px-3.5 py-2 text-[0.72rem] font-semibold normal-case tracking-normal text-lazule-gold shadow-[0_10px_28px_rgba(0,0,0,0.22)] transition hover:border-lazule-gold/60 hover:bg-lazule-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night sm:px-4 sm:text-sm'
      aria-label={hasItems ? `Abrir sua seleção com ${quantity} ${quantity === 1 ? 'item' : 'itens'}` : 'Abrir sua seleção'}
      aria-haspopup='dialog'
      aria-expanded={cartOpen}
    >
      🛍 Sua seleção ({quantity})
    </button>
    <button
      type='button'
      onClick={() => setCartOpen(true)}
      className={`fixed bottom-4 right-4 z-50 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-lazule-gold/35 bg-[#07101f]/95 px-3.5 text-[0.72rem] font-semibold normal-case tracking-normal text-lazule-gold shadow-[0_18px_48px_rgba(0,0,0,0.42)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/75 focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night md:hidden ${hasItems && !cartOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
      aria-label={hasItems ? `Abrir sua seleção com ${quantity} ${quantity === 1 ? 'item' : 'itens'}` : 'Abrir sua seleção'}
      aria-haspopup='dialog'
      aria-expanded={cartOpen}
      tabIndex={hasItems && !cartOpen ? 0 : -1}
    >
      🛍 Sua seleção ({quantity})
    </button>
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={items} total={total} />
  </>;
}
