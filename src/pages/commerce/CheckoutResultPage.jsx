const content = {
  success: ['Sua seleção foi confirmada.', 'Agora essa atmosfera passa a fazer parte da sua presença.'],
  pending: ['Aguardando confirmação da atmosfera.', 'Assim que o processamento finalizar, sua direção estará ativa.'],
  failure: ['Não conseguimos concluir essa direção agora.', 'Você pode revisar o método e tentar novamente com tranquilidade.'],
};

export function CheckoutResultPage({ mode = 'pending' }) {
  const [title, body] = content[mode] || content.pending;
  return <section className='mx-auto flex min-h-[60vh] max-w-4xl items-center px-6 py-20'>
    <article className='w-full rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center'>
      <p className='text-xs uppercase tracking-[0.25em] text-lazule-gold/70'>Finalização</p>
      <h1 className='mt-4 text-4xl text-white'>{title}</h1>
      <p className='mx-auto mt-4 max-w-2xl text-lazule-mist/75'>{body}</p>
      <a href='/catalogo' className='mt-8 inline-block rounded-full border border-lazule-gold/40 px-6 py-3 text-lazule-gold'>Voltar ao catálogo</a>
    </article>
  </section>;
}
