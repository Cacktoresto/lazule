import { formatBRL } from '../../utils/currency';
import { removeFromLuxurySelection, upsertLuxuryQuantity } from '../../commerce/cart/luxuryCartState';

const drawerRootClass = 'fixed inset-0 z-[100] isolate transition';
const drawerSurfaceClass = [
  'absolute right-0 top-0 h-full w-full max-w-md overflow-hidden border-l border-lazule-gold/20 sm:rounded-l-[2rem]',
  'bg-[var(--surface-elevated)] p-5 text-lazule-mist shadow-[0_32px_120px_rgba(0,0,0,0.62)]',
  'backdrop-blur-xl transition duration-300 sm:p-6',
].join(' ');
const solidCardClass = 'relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(8,16,35,0.98)] p-3 shadow-[inset_0_1px_0_rgba(248,250,252,0.05),0_14px_36px_rgba(0,0,0,0.24)]';
const solidTotalClass = 'mt-6 overflow-hidden rounded-3xl border border-lazule-gold/20 bg-[rgba(7,13,29,0.98)] p-4 shadow-[inset_0_1px_0_rgba(248,250,252,0.06)]';

export function CartDrawer({ open, onClose, items, total }) {
  return (
    <div className={`${drawerRootClass} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/60 transition ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside className={`${drawerSurfaceClass} ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-label="Sua seleção">
        <div className="pointer-events-none absolute inset-0 rounded-l-[2rem] bg-[radial-gradient(circle_at_18%_0%,rgba(200,162,77,0.13),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(37,99,235,0.16),transparent_36%)]" />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-lazule-gold/75">Curadoria LAZULE</p>
              <h2 className='mt-2 text-xl text-white'>Sua seleção</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-lazule-mist/80 transition hover:border-lazule-gold/40 hover:text-lazule-gold">
              Fechar
            </button>
          </div>

          <div className='mt-6 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1'>
            {items.length ? items.map((item) => <article key={item.id} className={solidCardClass}>
              <div className='relative z-10 flex gap-3'>
                {item.image ? (
                  <img src={item.image} alt={item.name} className='h-16 w-16 shrink-0 rounded-xl bg-slate-950 object-cover shadow-[0_8px_24px_rgba(0,0,0,0.32)]'/>
                ) : (
                  <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs text-lazule-mist/45'>LAZ</div>
                )}
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm text-white'>{item.name}</p>
                  <p className='text-xs text-lazule-gold/80'>{item.brand}</p>
                  <p className='mt-1 text-xs leading-5 text-lazule-mist/72'>{item.editorialPhrase}</p>
                  <div className='mt-3 flex items-center justify-between gap-3'>
                    <input type='number' min='1' value={item.quantity} onChange={(e)=>upsertLuxuryQuantity(item.id, e.target.value)} className='w-14 rounded-lg border border-white/20 bg-slate-950 px-2 py-1 text-sm text-white shadow-inner'/>
                    <button onClick={()=>removeFromLuxurySelection(item.id)} className='text-xs font-medium text-lazule-gold transition hover:text-lazule-gold/80'>Remover</button>
                  </div>
                </div>
              </div>
            </article>) : (
              <div className={`${solidCardClass} text-sm leading-6 text-lazule-mist/72`}>
                Sua seleção ainda está vazia. Explore o catálogo para montar sua assinatura olfativa.
              </div>
            )}
          </div>

          <div className={solidTotalClass}>
            <p className='text-sm text-lazule-mist/75'>Total</p>
            <p className='mt-1 text-2xl text-white'>{formatBRL(total)}</p>
            <a href='/checkout' className='lazule-premium-button lazule-cta-shimmer mt-4 block rounded-full border border-lazule-gold/45 bg-lazule-gold px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.16em] text-lazule-night shadow-aureate'>Continuar presença</a>
          </div>
        </div>
      </aside>
    </div>
  );
}
