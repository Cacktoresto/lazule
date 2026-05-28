import { useEffect, useMemo, useState } from 'react';
import { formatBRL } from '../../utils/currency';
import { buildOrderTimeline } from '../../commerce/orders/orderTimelineEngine';
import { resolveOrderStatusView } from '../../commerce/orders/orderStatusMachine';
import { PixPaymentInstructions } from '../../components/commerce/PixPaymentInstructions';
import { trackCommerceEvent } from '../../commerce/analytics/commerceAnalytics';

export function OrderDetailPage({ orderId: initialOrderId }) {
  const orderId = initialOrderId || window.location.pathname.split('/').filter(Boolean).at(-1);
  const [state, setState] = useState({ loading: true, order: null, view: null, timeline: [] });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/payments/status/${encodeURIComponent(orderId)}`);
        if (!response.ok) throw new Error('order_not_found');
        const data = await response.json();
        if (cancelled) return;
        const order = data.order;
        const view = data.view || resolveOrderStatusView(order);
        setState({ loading: false, order, view, timeline: data.timeline || buildOrderTimeline({ ...order, statusView: view }) });
        trackCommerceEvent('order_status_viewed', { productIds: order.items?.map((item) => item.id) || [], total: order.total, metadata: { orderId } });
      } catch {
        if (!cancelled) setState({ loading: false, order: null, view: null, timeline: [] });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orderId]);

  const pix = useMemo(() => state.order?.pix || state.order?.payment?.pix || null, [state.order]);

  if (state.loading) return <section className="mx-auto max-w-5xl px-6 py-20 text-lazule-mist">Carregando sua seleção…</section>;
  if (!state.order) return <section className="mx-auto max-w-5xl px-6 py-20 text-lazule-mist"><h1 className="text-3xl text-white">Ainda estamos localizando essa seleção.</h1><p className="mt-3 text-lazule-mist/70">Confira o código do pedido ou fale com o suporte.</p></section>;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 text-lazule-mist sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.28em] text-lazule-gold/75">Minha seleção</p>
      <h1 className="mt-3 text-4xl text-white">{state.view.description}</h1>
      <p className="mt-3 max-w-2xl text-lazule-mist/70">{state.view.nextStep}</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-white/10 bg-slate-950/65 p-6">
          <h2 className="text-lg text-white">Timeline</h2>
          <ol className="mt-5 space-y-4">
            {state.timeline.map((step) => <li key={step.key} className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-full border ${step.complete ? 'border-lazule-gold/60 bg-lazule-gold/15 text-lazule-gold' : 'border-white/15 text-lazule-mist/45'}`}>{step.index}</span><span className={step.complete ? 'text-white' : 'text-lazule-mist/55'}>{step.label}</span></li>)}
          </ol>
          <h2 className="mt-8 text-lg text-white">Itens</h2>
          <ul className="mt-4 space-y-3">
            {state.order.items?.map((item) => <li key={item.id} className="flex justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-sm"><span>{item.title || item.name}</span><span>{item.quantity}x · {formatBRL(item.unit_price || item.price)}</span></li>)}
          </ul>
        </article>
        <aside className="space-y-5">
          <article className="rounded-[2rem] border border-lazule-gold/20 bg-slate-950/75 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-lazule-gold/70">Pagamento</p>
            <p className="mt-3 text-3xl text-white">{formatBRL(state.order.total)}</p>
            <p className="mt-3 text-sm text-lazule-mist/70">{state.view.label}</p>
            <p className="mt-1 text-xs text-lazule-mist/50">Pedido {state.order.id}</p>
          </article>
          <PixPaymentInstructions pix={pix} />
          <a href="https://wa.me/5500000000000" className="block rounded-full border border-white/15 px-5 py-3 text-center text-lazule-mist">Falar com suporte</a>
        </aside>
      </div>
    </section>
  );
}
