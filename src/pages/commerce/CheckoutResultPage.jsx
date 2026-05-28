import { useMemo } from 'react';
import { useOrderConsistency } from '../../commerce/orders/useOrderConsistency';
import { restoreCheckoutSession } from '../../commerce/checkout/checkoutSessionEngine';

const content = {
  success: ['Sua seleção foi confirmada.', 'Agora essa atmosfera passa a fazer parte da sua presença.'],
  pending: ['Aguardando confirmação da atmosfera.', 'Assim que o processamento finalizar, sua direção estará ativa.'],
  failure: ['Não conseguimos concluir essa direção agora.', 'Você pode revisar o método e tentar novamente com tranquilidade.'],
  syncing: ['Sincronizando seu pedido.', 'Estamos consultando a fonte de verdade da LAZULE antes de atualizar a tela.'],
  awaiting_confirmation: ['Aguardando confirmação do Mercado Pago.', 'Pix e cartões podem levar alguns instantes. Você pode fechar e voltar: sua sessão será restaurada.'],
  reconciling: ['Reconciliando pagamento.', 'Estamos comparando o estado interno com o Mercado Pago para evitar divergências.'],
  finalizing: ['Pagamento confirmado.', 'Estamos finalizando sua seleção a partir do estado persistido do pedido.'],
};

export function CheckoutResultPage({ mode = 'pending' }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const restoredSession = useMemo(() => restoreCheckoutSession({ orderId: params.get('order_id') || '' }), [params]);
  const orderId = params.get('order_id') || restoredSession?.orderId || '';
  const { status, uiState, reconcile } = useOrderConsistency(orderId, { enabled: Boolean(orderId) });

  const fallbackMode = mode === 'success' ? 'pending' : (mode === 'failure' ? 'failure' : 'pending');
  const pageMode = status === 'paid' ? 'finalizing' : (uiState || fallbackMode);
  const [title, body] = content[pageMode] || content[fallbackMode] || content.pending;
  const showPendingPix = ['awaiting_confirmation', 'syncing', 'reconciling'].includes(pageMode);

  return <section className='mx-auto flex min-h-[60vh] max-w-4xl items-center px-6 py-20'>
    <article className='w-full rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center'>
      <p className='text-xs uppercase tracking-[0.25em] text-lazule-gold/70'>Finalização consistente</p>
      <h1 className='mt-4 text-4xl text-white'>{title}</h1>
      <p className='mx-auto mt-4 max-w-2xl text-lazule-mist/75'>{body}</p>
      {orderId && <p className='mt-4 text-xs uppercase tracking-[0.18em] text-lazule-mist/45'>Pedido {orderId}</p>}
      {showPendingPix && <div className='mx-auto mt-6 max-w-2xl rounded-2xl border border-lazule-gold/20 bg-lazule-gold/10 p-4 text-left text-sm text-lazule-mist/75'>
        <p className='text-lazule-gold'>Experiência Pix long-lived</p>
        <p className='mt-2'>Manteremos a consulta automática, revalidaremos ao voltar para esta aba e restauraremos este pedido após refresh ou retorno ao site.</p>
      </div>}
      <div className='mt-8 flex flex-col justify-center gap-3 sm:flex-row'>
        {orderId && <button type='button' onClick={reconcile} className='rounded-full border border-white/15 px-6 py-3 text-lazule-mist'>Reconsultar pagamento</button>}
        <a href='/catalogo' className='inline-block rounded-full border border-lazule-gold/40 px-6 py-3 text-lazule-gold'>Voltar ao catálogo</a>
      </div>
    </article>
  </section>;
}
