import { formatBRL } from '../../utils/currency';
import { removeFromLuxurySelection, upsertLuxuryQuantity } from '../../commerce/cart/luxuryCartState';
import { useLuxuryCart } from '../../commerce/checkout/useLuxuryCart';

export function CartPage() {
  const { items, total } = useLuxuryCart();
  return <section className='mx-auto max-w-5xl px-4 py-10 sm:px-6'>
    <h1 className='text-4xl text-white'>Seleção olfativa</h1>
    <div className='mt-8 space-y-4'>{items.map((item)=><article key={item.id} className='rounded-2xl border border-white/10 bg-slate-950/55 p-4'>
      <div className='flex gap-4'>
        <img src={item.image} alt={item.name} className='h-20 w-20 rounded-xl object-cover'/>
        <div className='flex-1'><p className='text-white'>{item.name}</p><p className='text-xs text-lazule-gold/80'>{item.brand}</p><p className='mt-2 text-sm text-lazule-mist/70'>{item.editorialPhrase}</p></div>
        <div><input min='1' type='number' value={item.quantity} onChange={(e)=>upsertLuxuryQuantity(item.id, e.target.value)} className='w-16 rounded border border-white/20 bg-black/20 px-2 py-1'/><button onClick={()=>removeFromLuxurySelection(item.id)} className='mt-2 block text-xs text-lazule-gold'>Remover</button></div>
      </div>
    </article>)}</div>
    <div className='mt-8 border-t border-white/10 pt-4'><p className='text-2xl text-white'>{formatBRL(total)}</p><a href='/checkout' className='mt-4 inline-block rounded-full border border-lazule-gold/40 px-6 py-3 text-lazule-gold'>Ir para checkout</a></div>
  </section>;
}
