import { formatBRL } from '../../utils/currency';
import { removeFromLuxurySelection, upsertLuxuryQuantity } from '../../commerce/cart/luxuryCartState';

const drawerRootClass = 'fixed inset-0 z-[100] isolate transition';
const drawerSurfaceClass = [
  'absolute right-0 top-0 h-full w-full overflow-hidden border-l border-lazule-gold/[0.12]',
  'bg-[rgba(4,8,20,0.985)] text-lazule-mist shadow-[-30px_0_100px_rgba(0,0,0,0.56)]',
  'backdrop-blur-xl transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[31rem] sm:rounded-l-[2.35rem]',
].join(' ');
const productCardClass = [
  'group relative overflow-hidden rounded-[1.55rem] border border-white/[0.075]',
  'bg-[linear-gradient(145deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018)_44%,rgba(200,162,77,0.04))]',
  'p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_48px_rgba(0,0,0,0.24)] transition duration-300 hover:border-lazule-gold/25',
].join(' ');
const totalPanelClass = [
  'mt-5 border-t border-white/[0.08] pt-5',
  'bg-[linear-gradient(180deg,rgba(5,10,25,0),rgba(5,10,25,0.9)_22%,rgba(5,10,25,0.98))]',
].join(' ');

export function CartDrawer({ open, onClose, items, total }) {
  return (
    <div className={`${drawerRootClass} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/70 transition duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside
        className={`${drawerSurfaceClass} ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Sua seleção"
        style={{
          paddingTop: 'max(1.25rem, env(safe-area-inset-top))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(200,162,77,0.13),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(64,117,221,0.13),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-y-8 left-0 w-px bg-gradient-to-b from-transparent via-lazule-gold/35 to-transparent" />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-start justify-between gap-5 pb-5">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">Seleção LAZULE</p>
              <h2 className='mt-1.5 font-display text-3xl leading-tight text-white'>Sua seleção</h2>
              <p className='mt-2 max-w-[18rem] text-sm leading-6 text-lazule-mist/58'>Curadoria escolhida para continuar com atendimento dedicado.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.045] text-lg leading-none text-lazule-mist/60 transition hover:border-lazule-gold/35 hover:bg-lazule-gold/10 hover:text-lazule-gold"
              aria-label="Fechar seleção"
            >
              ×
            </button>
          </div>

          <div className='min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(200,162,77,0.35)_transparent]'>
            {items.length ? items.map((item) => <article key={item.id} className={productCardClass}>
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70" />
              <div className='relative z-10 flex gap-4'>
                {item.image ? (
                  <img src={item.image} alt={item.name} className='h-[78px] w-[78px] shrink-0 rounded-[1.2rem] bg-slate-950 object-cover shadow-[0_14px_34px_rgba(0,0,0,0.42)]'/>
                ) : (
                  <div className='flex h-[78px] w-[78px] shrink-0 items-center justify-center rounded-[1.2rem] border border-lazule-gold/18 bg-slate-950/80 text-[0.65rem] font-semibold tracking-[0.28em] text-lazule-gold/60'>LAZ</div>
                )}
                <div className='min-w-0 flex-1'>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className='truncate text-sm font-semibold leading-5 text-white'>{item.name}</p>
                      <p className='mt-0.5 truncate text-[0.72rem] font-medium uppercase tracking-[0.18em] text-lazule-gold/72'>{item.brand}</p>
                    </div>
                    <p className='shrink-0 text-sm font-semibold text-lazule-gold/88'>{formatBRL(item.price || 0)}</p>
                  </div>
                  <p className='mt-2 line-clamp-2 text-xs leading-5 text-lazule-mist/62'>{item.editorialPhrase}</p>
                  <div className='mt-3 flex items-center justify-between gap-3'>
                    <label className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-lazule-mist/45">
                      Qtd.
                      <input type='number' min='1' value={item.quantity} onChange={(e)=>upsertLuxuryQuantity(item.id, e.target.value)} className='w-10 bg-transparent text-center text-sm font-semibold text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'/>
                    </label>
                    <button onClick={()=>removeFromLuxurySelection(item.id)} className='text-xs font-medium text-lazule-mist/45 transition hover:text-lazule-gold'>Remover</button>
                  </div>
                </div>
              </div>
            </article>) : (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center rounded-[1.75rem] border border-white/[0.06] bg-white/[0.025] px-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-lazule-gold/25 bg-lazule-gold/10 text-xl text-lazule-gold shadow-[0_18px_40px_rgba(200,162,77,0.08)]">✦</div>
                <p className="mt-5 font-display text-xl text-white">Seleção em branco</p>
                <p className="mt-2 text-sm leading-6 text-lazule-mist/58">Explore a curadoria e guarde aqui as fragrâncias que merecem presença.</p>
              </div>
            )}
          </div>

          <div className={totalPanelClass}>
            <div className="flex items-end justify-between gap-4">
              <p className='text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-lazule-mist/48'>Curadoria escolhida</p>
              <p className='font-display text-3xl leading-none text-white'>{formatBRL(total)}</p>
            </div>
            <a href='/checkout' className='lazule-premium-button lazule-cta-shimmer mt-5 block w-full rounded-full border border-[#d8bb72]/55 bg-[linear-gradient(135deg,#f1d991_0%,#c8a24d_42%,#8f6b2f_100%)] px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-[#07101f] shadow-[0_18px_48px_rgba(200,162,77,0.20),inset_0_1px_0_rgba(255,255,255,0.38)] transition hover:shadow-[0_22px_58px_rgba(200,162,77,0.28),inset_0_1px_0_rgba(255,255,255,0.46)]'>Finalizar atendimento</a>
          </div>
        </div>
      </aside>
    </div>
  );
}
