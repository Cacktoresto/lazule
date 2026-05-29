import { useEffect, useMemo, useRef } from 'react';
import { formatBRL } from '../../utils/currency';
import { createWhatsAppLink } from '../../utils/whatsapp';
import { clearLuxurySelection, removeFromLuxurySelection, upsertLuxuryQuantity } from '../../commerce/cart/luxuryCartState';
import { buildSelectionWhatsAppMessage } from '../../commerce/checkout/selectionCheckout';

const drawerRootClass = 'fixed inset-0 z-[100] isolate transition';
const backdropClass = [
  'absolute inset-0 bg-[rgba(2,6,18,0.66)] transition duration-300',
  'backdrop-blur-[14px] backdrop-saturate-[120%]',
].join(' ');
const drawerSurfaceClass = [
  'absolute right-0 top-0 h-full max-h-dvh w-full overflow-hidden border-l border-lazule-gold/[0.18]',
  'bg-[linear-gradient(155deg,#030713_0%,#07101f_43%,#0d1426_68%,#030713_100%)] text-lazule-mist',
  'shadow-[-32px_0_110px_rgba(0,0,0,0.72),inset_1px_0_0_rgba(216,187,114,0.12)]',
  'transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[31rem] sm:rounded-l-[2.35rem]',
].join(' ');
const productCardClass = [
  'group relative overflow-hidden rounded-[1.55rem] border border-white/[0.095]',
  'bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.026)_44%,rgba(200,162,77,0.055))]',
  'p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_18px_48px_rgba(0,0,0,0.30)] transition duration-300 hover:border-lazule-gold/30',
].join(' ');
const footerClass = [
  'shrink-0 border-t border-white/[0.1] pt-4',
  'bg-[linear-gradient(180deg,rgba(5,10,25,0),rgba(5,10,25,0.94)_18%,rgba(5,10,25,1))]',
].join(' ');

export function CartDrawer({ open, onClose, items, total }) {
  const hasItems = items.length > 0;
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const checkoutHref = useMemo(
    () => createWhatsAppLink(buildSelectionWhatsAppMessage(items, total)),
    [items, total],
  );

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [onClose, open]);

  return (
    <div className={`${drawerRootClass} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button
        type="button"
        className={`${backdropClass} ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-label="Fechar seleção"
        tabIndex={open ? 0 : -1}
        data-testid="cart-backdrop"
      />
      <aside
        className={`${drawerSurfaceClass} ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        inert={open ? undefined : ''}
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(200,162,77,0.16),transparent_30%),radial-gradient(circle_at_92%_8%,rgba(58,96,170,0.16),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.035),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-y-8 left-0 w-px bg-gradient-to-b from-transparent via-lazule-gold/45 to-transparent" />
        <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
          <div className="sticky top-0 z-20 shrink-0 border-b border-white/[0.075] bg-[linear-gradient(180deg,rgba(3,7,19,0.98),rgba(3,7,19,0.90))] pb-4 pt-1 backdrop-blur-md">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.36em] text-lazule-gold/85">Seleção LAZULE</p>
                <h2 id="cart-drawer-title" className='mt-1.5 font-display text-3xl leading-tight text-white'>Sua seleção</h2>
                <p className='mt-2 max-w-[20rem] text-sm leading-6 text-lazule-mist/68'>Curated checkout concierge para revisar fragrâncias, quantidades e finalizar com atendimento dedicado.</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.12] bg-white/[0.065] text-lg leading-none text-lazule-mist/75 transition hover:border-lazule-gold/45 hover:bg-lazule-gold/12 hover:text-lazule-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030713]"
                aria-label="Fechar seleção"
              >
                ×
              </button>
            </div>
          </div>

          <div className='min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(200,162,77,0.45)_transparent]'>
            {hasItems ? items.map((item) => <article key={item.id} className={productCardClass}>
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
                      <p className='mt-0.5 truncate text-[0.72rem] font-medium uppercase tracking-[0.18em] text-lazule-gold/78'>{item.brand}</p>
                    </div>
                    <p className='shrink-0 text-sm font-semibold text-lazule-gold/92'>{formatBRL((item.price || 0) * (item.quantity || 1))}</p>
                  </div>
                  <p className='mt-2 line-clamp-2 text-xs leading-5 text-lazule-mist/68'>{item.editorialPhrase}</p>
                  <div className='mt-3 flex items-center justify-between gap-3'>
                    <label className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-black/25 px-2.5 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-lazule-mist/55">
                      Qtd.
                      <input aria-label={`Quantidade de ${item.name}`} type='number' min='1' value={item.quantity} onChange={(e)=>upsertLuxuryQuantity(item.id, e.target.value)} className='w-10 bg-transparent text-center text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'/>
                    </label>
                    <button type="button" onClick={()=>removeFromLuxurySelection(item.id)} className='rounded-full px-2 py-1 text-xs font-medium text-lazule-mist/55 transition hover:text-lazule-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/60'>Remover</button>
                  </div>
                </div>
              </div>
            </article>) : (
              <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] px-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-lazule-gold/25 bg-lazule-gold/10 text-xl text-lazule-gold shadow-[0_18px_40px_rgba(200,162,77,0.08)]">✦</div>
                <p className="mt-5 font-display text-xl text-white">Seleção em branco</p>
                <p className="mt-2 text-sm leading-6 text-lazule-mist/68">Explore a curadoria e guarde aqui as fragrâncias que merecem presença.</p>
              </div>
            )}
          </div>

          <div className={footerClass}>
            <div className="flex items-end justify-between gap-4">
              <p className='text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-lazule-mist/58'>Curadoria escolhida</p>
              <p className='font-display text-3xl leading-none text-white'>{formatBRL(total)}</p>
            </div>
            {hasItems ? (
              <>
                <a href={checkoutHref} target="_blank" rel="noreferrer" className='lazule-premium-button lazule-cta-shimmer mt-4 block w-full rounded-full border border-[#d8bb72]/65 bg-[linear-gradient(135deg,#f1d991_0%,#c8a24d_42%,#8f6b2f_100%)] px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-[#07101f] shadow-[0_18px_48px_rgba(200,162,77,0.24),inset_0_1px_0_rgba(255,255,255,0.42)] transition hover:shadow-[0_22px_58px_rgba(200,162,77,0.32),inset_0_1px_0_rgba(255,255,255,0.50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030713]'>Finalizar atendimento</a>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={onClose} className="rounded-full border border-white/[0.14] bg-white/[0.055] px-4 py-3 text-sm font-semibold text-lazule-mist transition hover:border-lazule-gold/35 hover:text-lazule-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/65">Continuar explorando</button>
                  <button type="button" onClick={clearLuxurySelection} className="rounded-full border border-white/[0.1] px-4 py-3 text-sm font-semibold text-lazule-mist/60 transition hover:border-red-300/35 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/65">Limpar seleção</button>
                </div>
              </>
            ) : (
              <>
                <button type="button" disabled className='mt-4 block w-full cursor-not-allowed rounded-full border border-white/[0.12] bg-white/[0.055] px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.2em] text-lazule-mist/45'>Finalizar atendimento</button>
                <button type="button" onClick={onClose} className="mt-3 w-full rounded-full border border-lazule-gold/30 bg-lazule-gold/10 px-4 py-3 text-sm font-semibold text-lazule-gold transition hover:border-lazule-gold/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold/65">Continuar explorando</button>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
