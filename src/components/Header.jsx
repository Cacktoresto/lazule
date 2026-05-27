import { useState } from 'react';
import { createWhatsAppLink } from '../utils/whatsapp';
import { CartDrawer } from './commerce/CartDrawer';
import { useLuxuryCart } from '../commerce/checkout/useLuxuryCart';

const navigationItems = [
  { href: '/', label: 'Início' },
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/faq', label: 'Como funciona' },
  { href: '/identidade', label: 'Sua assinatura' },
  { href: '/carrinho', label: 'Seleção' },
];

export function Header({ immersiveProduct = false }) {
  const [cartOpen, setCartOpen] = useState(false);
  const { items, total, quantity } = useLuxuryCart();
  return <header className={`${immersiveProduct ? 'hidden lg:block' : ''} sticky top-0 z-40 border-b border-white/10 surface-lazule-glass backdrop-blur-2xl`}>
    <div className='mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8'>
      <a href='/' className='text-sm uppercase tracking-[0.3em] text-lazule-gold'>Lazule Fragrances</a>
      <nav className='hidden items-center gap-2 text-sm text-slate-300 md:flex'>
        {navigationItems.map((item)=><a key={item.href} href={item.href} className='rounded-full px-3 py-2 hover:bg-lazule-blue/10'>{item.label}</a>)}
      </nav>
      <div className='flex items-center gap-2'>
        <a className='hidden rounded-full border border-lazule-gold/40 px-5 py-2.5 text-sm text-lazule-mist lg:inline-flex' href={createWhatsAppLink('Olá! Quero conhecer o catálogo da LAZULE FRAGRANCES.')} target='_blank' rel='noreferrer'>Falar no WhatsApp</a>
        <button onClick={() => setCartOpen(true)} className='rounded-full border border-lazule-gold/30 px-3 py-2 text-xs text-lazule-gold'>Seleção ({quantity})</button>
      </div>
    </div>
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} items={items} total={total} />
  </header>;
}
