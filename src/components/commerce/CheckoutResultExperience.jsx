import { PixPaymentInstructions } from './PixPaymentInstructions';

const VARIANTS = {
  success: {
    eyebrow: 'Seleção confirmada',
    title: 'Sua seleção foi confirmada.',
    description: 'Recebemos a confirmação do pagamento. Sua curadoria agora entra em preparação.',
    action: 'Acompanhar pedido',
  },
  pending: {
    eyebrow: 'Confirmação em andamento',
    title: 'Sua seleção está aguardando confirmação.',
    description: 'Se você escolheu Pix, use as instruções abaixo. A atualização acontece automaticamente.',
    action: 'Ver status',
  },
  failure: {
    eyebrow: 'Pagamento não concluído',
    title: 'Não conseguimos concluir essa direção.',
    description: 'Você pode tentar novamente ou voltar à seleção com tranquilidade.',
    action: 'Tentar novamente',
  },
  loading: {
    eyebrow: 'Finalização',
    title: 'Confirmando sua seleção...',
    description: 'Estamos consultando o status real do pedido com segurança.',
    action: 'Aguarde',
  },
  unknown: {
    eyebrow: 'Status indisponível',
    title: 'Ainda estamos localizando essa seleção.',
    description: 'Você pode voltar ao catálogo ou falar com o suporte informando o código do pedido.',
    action: 'Voltar ao catálogo',
  },
};

export function CheckoutResultExperience({ variant = 'pending', order, view, pix, orderId }) {
  const content = VARIANTS[variant] || VARIANTS.unknown;
  const href = orderId ? `/pedido/${encodeURIComponent(orderId)}` : '/catalogo';
  const retryHref = '/checkout';
  return (
    <section className="mx-auto flex min-h-[70svh] max-w-5xl items-center px-3 py-8 sm:min-h-[60vh] sm:px-6 sm:py-20">
      <article className="w-full rounded-[1.5rem] border border-white/10 bg-slate-950/75 p-5 text-center shadow-2xl shadow-black/20 sm:rounded-[2rem] sm:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lazule-gold/70">{content.eyebrow}</p>
        <h1 className="mt-4 text-3xl text-white sm:text-4xl">{view?.description || content.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lazule-mist/75">{view?.nextStep || content.description}</p>
        {order?.id && <p className="mt-4 text-xs text-lazule-mist/50">Seleção {order.id}</p>}
        <div className="mx-auto mt-8 max-w-xl"><PixPaymentInstructions pix={pix} /></div>
        <div className="mt-6 grid gap-2 sm:mt-8 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
          <a href={variant === 'failure' ? retryHref : href} className="min-h-12 rounded-full border border-lazule-gold/40 bg-lazule-gold/15 px-6 py-3 text-lazule-gold">{content.action}</a>
          <a href="/catalogo" className="min-h-12 rounded-full border border-white/15 px-6 py-3 text-lazule-mist">Voltar ao catálogo</a>
        </div>
      </article>
    </section>
  );
}
