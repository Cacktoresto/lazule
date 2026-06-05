import { useEffect } from 'react';
import { formatBRL } from '../../utils/currency';
import { removeFromLuxurySelection, upsertLuxuryQuantity } from '../../commerce/cart/luxuryCartState';
import { useLuxuryCart } from '../../commerce/checkout/useLuxuryCart';
import { trackCartView } from '../../utils/analytics';

export function CartPage() {
  const { items, total } = useLuxuryCart();
  const hasItems = items.length > 0;

  useEffect(() => {
    trackCartView({ items, total, source_page: 'cart_page' });
  }, [items, total]);

  return <section className='mx-auto max-w-5xl px-4 py-6 pb-24 text-lazule-mist sm:px-6 sm:py-10'>
    <div className='flex items-end justify-between gap-4'>
      <div>
        <p className='text-xs font-semibold uppercase tracking-[0.24em] text-lazule-gold/80'>Sua seleção</p>
        <h1 className='mt-2 font-display text-3xl leading-tight text-white sm:text-4xl'>Revise e finalize</h1>
      </div>
      <a href='/catalogo' className='hidden rounded-full px-3 py-2 text-sm font-semibold text-lazule-gold sm:inline-flex'>Continuar comprando</a>
    </div>

    {hasItems ? <div className='mt-6 space-y-3'>{items.map((item)=><article key={item.id} className='rounded-2xl border border-white/10 bg-slate-950/55 p-3 sm:p-4'>
      <div className='grid grid-cols-[72px_1fr] gap-3 sm:grid-cols-[88px_1fr_auto] sm:gap-4'>
        {item.image ? <img src={item.image} alt={item.name} className='h-[72px] w-[72px] rounded-xl object-cover sm:h-20 sm:w-20' loading='lazy'/> : <div className='grid h-[72px] w-[72px] place-items-center rounded-xl bg-white/5 text-xs text-lazule-mist/50'>LAZ</div>}
        <div className='min-w-0'><p className='truncate font-semibold text-white'>{item.name}</p><p className='text-xs text-lazule-gold/80'>{item.brand}</p><p className='mt-1 line-clamp-2 text-sm leading-5 text-lazule-mist/70'>{item.editorialPhrase}</p><p className='mt-2 font-semibold text-lazule-gold'>{formatBRL((item.price || 0) * (item.quantity || 1))}</p></div>
        <div className='col-span-2 flex items-center justify-between gap-3 border-t border-white/10 pt-3 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0'><label className='text-xs uppercase tracking-[0.16em] text-lazule-mist/55'>Qtd. <input aria-label={`Quantidade de ${item.name}`} min='1' type='number' value={item.quantity} onChange={(e)=>upsertLuxuryQuantity(item.id, e.target.value)} className='ml-2 h-10 w-14 rounded-full border border-white/15 bg-black/20 px-2 text-center text-white'/></label><button onClick={()=>removeFromLuxurySelection(item.id)} className='min-h-10 rounded-full px-3 text-sm font-semibold text-lazule-gold'>Remover</button></div>
      </div>
    </article>)}</div> : <div className='mt-8 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center'><p className='text-white'>Sua seleção está vazia.</p><a href='/catalogo' className='mt-4 inline-flex min-h-11 items-center rounded-full bg-lazule-gold px-5 font-semibold text-lazule-night'>Ver perfumes</a></div>}

    <div className='fixed inset-x-0 bottom-0 z-40 border-t border-lazule-gold/20 bg-slate-950/90 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur-xl sm:static sm:mt-8 sm:rounded-3xl sm:border sm:bg-slate-950/55 sm:p-5'>
      <div className='mx-auto flex max-w-5xl items-center justify-between gap-4 sm:mx-0'>
        <div><p className='text-xs uppercase tracking-[0.2em] text-lazule-mist/55'>Total</p><p className='text-2xl text-white'>{formatBRL(total)}</p></div>
        <a href={hasItems ? '/checkout' : '/catalogo'} className='inline-flex min-h-12 items-center justify-center rounded-full bg-lazule-gold px-6 text-sm font-bold text-lazule-night shadow-aureate'>{hasItems ? 'Finalizar compra' : 'Ver catálogo'}</a>
      </div>
    </div>
  </section>;
}
