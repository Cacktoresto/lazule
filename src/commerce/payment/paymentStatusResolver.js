const STATUS_MAP = {
  awaiting_payment: {
    title: 'Reservando sua seleção.',
    description: 'Aguardando confirmação da sua presença.',
  },
  confirmed: {
    title: 'Sua seleção foi confirmada.',
    description: 'Essa presença agora faz parte da sua rotação.',
  },
  processing: {
    title: 'Preparando sua próxima assinatura.',
    description: 'Sua curadoria já está em preparação.',
  },
  expired: {
    title: 'A reserva expirou.',
    description: 'Podemos reabrir sua seleção com a mesma direção.',
  },
  failed: {
    title: 'Não conseguimos confirmar essa etapa.',
    description: 'Sua curadoria segue pronta para uma nova confirmação.',
  },
  refunded: {
    title: 'Reembolso confirmado.',
    description: 'Sua trajetória foi atualizada com essa revisão.',
  },
};

export function resolvePaymentStatus(status = 'awaiting_payment') {
  return STATUS_MAP[status] || STATUS_MAP.awaiting_payment;
}
