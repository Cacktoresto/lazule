const STEPS = [
  { key: 'created', label: 'Seleção criada', statuses: ['draft', 'awaiting_payment', 'pending_payment', 'processing_payment', 'paid', 'preparing', 'shipped', 'delivered'] },
  { key: 'payment', label: 'Pagamento', statuses: ['paid', 'preparing', 'shipped', 'delivered'] },
  { key: 'preparing', label: 'Preparação', statuses: ['preparing', 'shipped', 'delivered'] },
  { key: 'shipping', label: 'Envio', statuses: ['shipped', 'delivered'] },
  { key: 'delivered', label: 'Entrega', statuses: ['delivered'] },
];

export function buildOrderTimeline(order = {}) {
  const status = order.status || 'awaiting_payment';
  return STEPS.map((step, index) => ({
    ...step,
    index: index + 1,
    complete: step.statuses.includes(status),
    current: index + 1 === Number(order.statusView?.progressStep || 0),
  }));
}
