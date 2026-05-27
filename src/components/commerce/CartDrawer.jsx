import { formatBRL } from '../../utils/currency';
import { removeFromLuxurySelection, upsertLuxuryQuantity } from '../../commerce/cart/luxuryCartState';

export function CartDrawer({ open, onClose, items, total }) {
  return (
    <div className={`fixed inset-0 z-50 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/50 transition ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-slate-950/95 p-6 text-lazule-mist backdrop-blur-xl transition ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <h2 className='text-xl text-white'>Sua seleção</h2>
        <div className='mt-6 space-y-4 overflow-y-auto pr-1'>
          {items.map((item) => <article key={item.id} className='rounded-2xl border border-white/10 p-3'>
            <div className='flex gap-3'>
              <img src={item.image} alt={item.name} className='h-16 w-16 rounded-xl object-cover'/>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm text-white'>{item.name}</p>
                <p className='text-xs text-lazule-gold/80'>{item.brand}</p>
                <p className='mt-1 text-xs text-lazule-mist/65'>{item.editorialPhrase}</p>
                <div className='mt-2 flex items-center justify-between'>
                  <input type='number' min='1' value={item.quantity} onChange={(e)=>upsertLuxuryQuantity(item.id, e.target.value)} className='w-14 rounded border border-white/20 bg-black/20 px-2 py-1 text-sm'/>
                  <button onClick={()=>removeFromLuxurySelection(item.id)} className='text-xs text-lazule-gold'>Remover</button>
                </div>
              </div>
            </div>
          </article>)}
        </div>
        <div className='mt-6 border-t border-white/10 pt-4'>
          <p className='text-sm text-lazule-mist/75'>Total</p><p className='text-2xl text-white'>{formatBRL(total)}</p>
          <a href='/checkout' className='mt-4 block rounded-full border border-lazule-gold/40 px-4 py-3 text-center text-lazule-gold'>Continuar presença</a>
        </div>
      </aside>
    </div>
  );
}
