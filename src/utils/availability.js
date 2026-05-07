const AVAILABILITY_STYLES = {
  pronta: {
    label: 'Pronta entrega',
    className: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200',
    availableOnly: true,
  },
  encomenda: {
    label: 'Sob encomenda',
    className: 'border-sky-300/35 bg-sky-400/10 text-sky-200',
    availableOnly: false,
  },
  ultimas: {
    label: 'Últimas unidades',
    className: 'border-lazule-gold/45 bg-lazule-gold/10 text-lazule-gold',
    availableOnly: true,
  },
  indisponivel: {
    label: 'Indisponível',
    className: 'border-rose-300/35 bg-rose-400/10 text-rose-200',
    availableOnly: false,
  },
};

function normalizeAvailabilityText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getAvailabilityStatus(product) {
  const badges = Array.isArray(product?.badges) ? product.badges : [];
  const declaredStatus = normalizeAvailabilityText(product?.availability ?? product?.availabilityStatus ?? product?.stockStatus);
  const searchableStatus = normalizeAvailabilityText([declaredStatus, ...badges].filter(Boolean).join(' '));

  if (searchableStatus.includes('ultima')) {
    return { key: 'ultimas', ...AVAILABILITY_STYLES.ultimas };
  }

  if (searchableStatus.includes('indisponivel') || searchableStatus.includes('esgotado') || searchableStatus.includes('fora de estoque')) {
    return { key: 'indisponivel', ...AVAILABILITY_STYLES.indisponivel };
  }

  if (searchableStatus.includes('encomenda')) {
    return { key: 'encomenda', ...AVAILABILITY_STYLES.encomenda };
  }

  if (product?.available === false) {
    return { key: 'indisponivel', ...AVAILABILITY_STYLES.indisponivel };
  }

  return { key: 'pronta', ...AVAILABILITY_STYLES.pronta };
}

export function isAvailableForImmediateFilter(product) {
  return getAvailabilityStatus(product).availableOnly;
}
