import { useMemo, useState } from 'react';
import { formatBRL } from '../../utils/currency';
import { getLuxurySelection, removeFromLuxurySelection } from '../../commerce/cart/luxuryCartState';
import { buildCheckoutNarrative } from '../../commerce/checkout/checkoutNarrativeEngine';
import { getIdentityMemory, updateIdentityFromPurchase } from '../../commerce/identity/commerceIdentityBridge';
import { resolvePaymentStatus } from '../../commerce/payment/paymentStatusResolver';

export function CheckoutExperiencePage() {
  const [items, setItems] = useState(getLuxurySelection);
  const [paymentState, setPaymentState] = useState('awaiting_payment');

  const identity = useMemo(() => getIdentityMemory(), []);
  const narrative = useMemo(() => buildCheckoutNarrative({ items, profile: identity }), [identity, items]);
  const status = resolvePaymentStatus(paymentState);
  const total = items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 1), 0);

  function handleConfirmMock() {
    updateIdentityFromPurchase(items);
    setPaymentState('confirmed');
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 text-lazule-mist sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.28em] text-lazule-gold/80">{narrative.eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold text-white">{narrative.title}</h1>
      <p className="mt-3 max-w-2xl text-lazule-mist/75">{narrative.description}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <article className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 backdrop-blur">
          <h2 className="text-lg text-white">Sua seleção</h2>
          <ul className="mt-4 space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm">
                <div>
                  <p className="text-white">{item.name}</p>
                  <p className="text-lazule-mist/70">{item.quantity}x · {formatBRL(item.price || 0)}</p>
                </div>
                <button className="text-lazule-gold/80" onClick={() => setItems(removeFromLuxurySelection(item.id))}>Remover</button>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-lazule-gold/25 bg-lazule-night/80 p-6">
          <p className="text-xs uppercase tracking-[0.26em] text-lazule-gold/80">Pagamento</p>
          <p className="mt-3 text-2xl text-white">{formatBRL(total)}</p>
          <p className="mt-4 text-sm text-lazule-mist/80">{status.title}</p>
          <p className="mt-1 text-xs text-lazule-mist/60">{status.description}</p>
          <button onClick={handleConfirmMock} className="mt-6 w-full rounded-full border border-lazule-gold/45 bg-lazule-gold/15 px-4 py-3 text-sm text-lazule-gold">
            Confirmar presença
          </button>
        </article>
      </div>
    </section>
  );
}
