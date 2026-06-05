import { memo, useEffect, useMemo, useState } from 'react';
import { formatBRL } from '../../utils/currency';
import { checkoutCopy } from '../../commerce/checkout/checkoutCopy';
import { useLuxuryCart } from '../../commerce/checkout/useLuxuryCart';
import { createCheckoutPreference } from '../../commerce/payment/mercadoPagoCheckoutClient';
import { trackCommerceEvent } from '../../commerce/analytics/commerceAnalytics';
import { markCheckoutStarted, markPreferenceCreated, recoverAbandonedCheckout } from '../../commerce/checkout/checkoutAbandonmentEngine';
import { restoreLuxurySelection } from '../../commerce/cart/luxuryCartState';

const DEV = import.meta.env.DEV;

export function CheckoutPage() {
  const { items, total } = useLuxuryCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const hasItems = items.length > 0;

  useEffect(() => {
    const recoverId = new URLSearchParams(window.location.search).get('recover');
    if (recoverId) {
      const recovered = recoverAbandonedCheckout(recoverId);
      if (recovered?.items?.length) restoreLuxurySelection(recovered.items);
    }
  }, []);

  useEffect(() => {
    if (!hasItems) return undefined;
    const session = markCheckoutStarted({ items, total, source: 'checkout_page' });
    return () => {
      window.setTimeout(() => {}, 0);
    };
  }, [hasItems, items, total]);

  const renderState = useMemo(() => {
    if (!hasItems) return { title: 'Sua seleção ainda está vazia', description: 'Retorne ao catálogo e adicione peças para concluir com segurança.' };
    if (isSubmitting) return { title: 'Preparando sua seleção...', description: 'Estamos iniciando seu checkout protegido com Mercado Pago.' };
    if (submitError) return { title: 'Não conseguimos iniciar agora', description: submitError };
    return { title: 'Seu pedido está quase completo', description: 'Essa seleção mantém a direção construída na sua curadoria.' };
  }, [hasItems, isSubmitting, submitError]);

  async function handleFinalizeSelection() {
    if (!hasItems || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      if (DEV) console.info('[Checkout] creating preference');
      const response = await createCheckoutPreference({ items, source: 'lazule_checkout' });
      if (DEV) console.info('[Checkout] preference created', { orderId: response.orderId, preferenceId: response.preferenceId });
      const activeSession = markPreferenceCreated({ preferenceId: response.preferenceId, orderId: response.orderId, items, total });
      const isTestToken = import.meta.env.VITE_MP_PUBLIC_KEY?.startsWith('TEST-');
      const paymentUrl = isTestToken
        ? (response.sandboxInitPoint || response.initPoint)
        : (response.initPoint || response.sandboxInitPoint);
      if (DEV) console.info('[Checkout] payment URL received', { paymentUrl, isTestToken });
      if (!paymentUrl) {
        if (DEV) console.error('[Checkout] missing payment URL', response);
        setSubmitError('Não conseguimos iniciar o pagamento agora. Tente novamente em instantes.');
        return;
      }
      trackCommerceEvent('checkout_redirected', { sessionId: activeSession.sessionId, productIds: items.map((item) => item.id), total, metadata: { orderId: response.orderId } });
      if (DEV) console.info('[Checkout] redirecting to Mercado Pago', { paymentUrl });
      window.location.assign(paymentUrl);
    } catch (error) {
      if (DEV) console.error('[Checkout] create preference failed', { error, response: error?.data });
      setSubmitError('Não conseguimos iniciar o pagamento agora. Tente novamente em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return <section className='mx-auto w-full max-w-[1180px] px-4 py-6 pb-24 text-lazule-mist sm:px-6 sm:py-10 lg:px-8'>
    <div className='grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10'>
      <article className='min-w-0 space-y-4'>
        <p className='text-xs uppercase tracking-[0.24em] text-lazule-gold/75'>{checkoutCopy.finalizing}</p>
        <h1 className='text-3xl font-semibold leading-tight text-white sm:text-4xl'>Revise seu pedido</h1>
        <p className='max-w-2xl text-sm leading-6 text-lazule-mist/75 sm:text-base'>{checkoutCopy.reinforcement}</p>
        <div className='rounded-3xl border border-white/10 bg-slate-950/45 p-4 sm:p-5'>
          <p className='text-base text-white'>{renderState.title}</p>
          <p className='mt-2 text-sm text-lazule-mist/70'>{renderState.description}</p>
        </div>
      </article>

      <article className='lg:sticky lg:top-[120px] lg:self-start' aria-label='Resumo do pedido' data-testid='checkout-summary'>
        <div className='rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 backdrop-blur-md sm:p-6'>
          <p className='text-xs uppercase tracking-[0.24em] text-lazule-gold/80'>Resumo do pedido</p>
          {hasItems ? <ul className='mt-5 space-y-3'>{items.map((item)=><CheckoutCartItem key={item.id} item={item} />)}</ul> : <div className='mt-5 rounded-2xl border border-dashed border-white/15 p-4 text-sm text-lazule-mist/70'>Seu carrinho está vazio no momento.</div>}
          <div className='mt-5 border-t border-white/10 pt-4'>
            <div className='flex items-center justify-between gap-4'><p className='text-sm text-lazule-mist/70'>Subtotal</p><p className='text-sm text-white'>{formatBRL(total)}</p></div>
            <div className='mt-2 flex items-center justify-between gap-4'><p className='text-sm text-lazule-mist/70'>Entrega</p><p className='text-sm text-lazule-mist/70'>Calculada no Mercado Pago</p></div>
            <div className='mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-4'><p className='text-sm text-lazule-mist/70'>Total</p><p className='text-2xl text-white'>{formatBRL(total)}</p></div>
          </div>
          <button onClick={handleFinalizeSelection} disabled={!hasItems || isSubmitting} className='mt-5 w-full rounded-full border border-lazule-gold/40 bg-lazule-gold px-5 py-3.5 text-sm font-bold text-lazule-night shadow-aureate disabled:cursor-not-allowed disabled:opacity-55'>{isSubmitting ? 'Preparando pagamento...' : 'Pagar com Mercado Pago'}</button>
          <p className='mt-2 text-center text-xs text-lazule-mist/60'>Você será direcionado ao Mercado Pago para pagar com segurança.</p>
          {new URLSearchParams(window.location.search).get('recover') && <p className='mt-4 rounded-2xl border border-lazule-gold/20 bg-lazule-gold/10 p-3 text-sm text-lazule-gold'>Sua seleção ainda está aqui. Você pode continuar de onde parou.</p>}
          {submitError && <p className='mt-4 rounded-2xl border border-red-300/20 bg-red-950/25 p-3 text-sm text-red-200'>Não conseguimos iniciar agora. Tente novamente em instantes.</p>}
        </div>
      </article>
    </div>
  </section>;
}

const CheckoutCartItem = memo(function CheckoutCartItem({ item }) {
  const shortLine = item.description || item.category || 'Seleção exclusiva';

  return <li className='grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3' data-testid='checkout-product-card'>
    <div className='h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-slate-900/80'>
      {item.image ? <img src={item.image} alt={item.name} className='h-full w-full object-cover' loading='lazy' /> : <div className='flex h-full w-full items-center justify-center text-xs text-lazule-mist/40'>LAZ</div>}
    </div>
    <div className='min-w-0'>
      <p className='truncate text-sm text-white'>{item.name}</p>
      <p className='truncate text-xs text-lazule-mist/60'>{shortLine}</p>
      <p className='mt-1 text-xs text-lazule-mist/65'>Qtd. {item.quantity}</p>
    </div>
    <p className='text-sm text-white'>{formatBRL(item.price * item.quantity)}</p>
  </li>;
});
