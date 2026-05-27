import { useEffect, useMemo, useRef, useState } from 'react';
import { formatBRL } from '../../utils/currency';
import { checkoutCopy } from '../../commerce/checkout/checkoutCopy';
import { useLuxuryCart } from '../../commerce/checkout/useLuxuryCart';

export function CheckoutPage() {
  const { items, total } = useLuxuryCart();
  const [preferenceId, setPreferenceId] = useState('');
  const [status, setStatus] = useState('idle');
  const brickRef = useRef(null);
  const payload = useMemo(() => ({ items }), [items]);

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    async function createPreference() {
      setStatus('loading');
      try {
        const response = await fetch('/api/payments/create-preference', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (!cancelled) {
          setPreferenceId(data.preferenceId || '');
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    createPreference();
    return () => { cancelled = true; };
  }, [payload, items.length]);

  useEffect(() => {
    if (!preferenceId || !window.MercadoPago || !brickRef.current) return;
    const mp = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'pt-BR' });
    const bricksBuilder = mp.bricks();
    bricksBuilder.create('wallet', 'mp-wallet-brick', { initialization: { preferenceId } });
  }, [preferenceId]);

  return <section className='mx-auto max-w-6xl px-4 py-10 text-lazule-mist sm:px-6'>
    <div className='grid gap-8 lg:grid-cols-[1.1fr_1fr]'>
      <article>
        <p className='text-xs uppercase tracking-[0.28em] text-lazule-gold/75'>{checkoutCopy.finalizing}</p>
        <h1 className='mt-3 text-4xl text-white'>{checkoutCopy.headline}</h1>
        <p className='mt-4 text-lazule-mist/75'>{checkoutCopy.reinforcement}</p>
        <p className='mt-2 text-sm text-lazule-mist/65'>{checkoutCopy.cadence}</p>
      </article>
      <article className='rounded-3xl border border-white/10 bg-slate-950/65 p-6'>
        <ul className='space-y-3'>{items.map((item)=><li key={item.id} className='flex justify-between text-sm'><span>{item.quantity}x {item.name}</span><span>{formatBRL(item.price*item.quantity)}</span></li>)}</ul>
        <p className='mt-5 border-t border-white/10 pt-4 text-2xl text-white'>{formatBRL(total)}</p>
        {status === 'loading' && <p className='mt-4 text-sm text-lazule-mist/70'>Preparando ambiente de pagamento…</p>}
        {status === 'error' && <p className='mt-4 text-sm text-red-300'>Não foi possível iniciar agora. Tente novamente em instantes.</p>}
        <div id='mp-wallet-brick' ref={brickRef} className='mt-5 min-h-12'/>
      </article>
    </div>
  </section>;
}
