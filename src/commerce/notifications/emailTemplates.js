const SUBJECTS = {
  order_created: 'Sua seleção LAZULE foi criada',
  payment_approved: 'Sua seleção LAZULE foi confirmada',
  payment_pending: 'Sua seleção está aguardando confirmação',
  payment_failed: 'Não conseguimos concluir sua seleção',
  order_preparing: 'Sua curadoria entrou em preparação',
  order_shipped: 'Sua presença está a caminho',
  order_delivered: 'Sua presença foi entregue',
};

const BODIES = {
  order_created: 'Sua seleção foi registrada e aguarda a próxima etapa.',
  payment_approved: 'Recebemos a confirmação do pagamento. Sua curadoria agora entra em preparação.',
  payment_pending: 'Sua seleção está aguardando confirmação. Assim que o pagamento for confirmado, seguimos automaticamente.',
  payment_failed: 'Não conseguimos concluir sua seleção. Você pode tentar novamente com tranquilidade.',
  order_preparing: 'Sua curadoria entrou em preparação com o cuidado LAZULE.',
  order_shipped: 'Sua presença está a caminho.',
  order_delivered: 'Sua presença foi entregue.',
};

function summarizeItems(items = []) {
  return items.map((item) => `${item.quantity || 1}x ${item.title || item.name || item.id}`).join('\n');
}

export function buildEmailTemplate(eventName, { order = {}, statusUrl = '' } = {}) {
  const subject = SUBJECTS[eventName] || 'Atualização da sua seleção LAZULE';
  const intro = BODIES[eventName] || 'Temos uma atualização sobre sua seleção.';
  const items = summarizeItems(order.items || []);
  return {
    subject,
    text: [
      intro,
      order.id ? `\nSeleção: ${order.id}` : '',
      items ? `\nResumo:\n${items}` : '',
      Number.isFinite(Number(order.total)) ? `\nTotal: R$ ${Number(order.total).toFixed(2).replace('.', ',')}` : '',
      statusUrl ? `\nAcompanhar: ${statusUrl}` : '',
    ].filter(Boolean).join('\n'),
    html: `<p>${intro}</p>${order.id ? `<p><strong>Seleção:</strong> ${order.id}</p>` : ''}${items ? `<pre>${items}</pre>` : ''}${statusUrl ? `<p><a href="${statusUrl}">Acompanhar seleção</a></p>` : ''}`,
  };
}
