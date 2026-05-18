export const COMMERCIAL_STATUS = Object.freeze({
  IN_STOCK: 'in_stock',
  ON_REQUEST: 'on_request',
  REFERENCE_ONLY: 'reference_only',
});

export const VALID_COMMERCIAL_STATUSES = Object.freeze(Object.values(COMMERCIAL_STATUS));

const STATUS_COPY = Object.freeze({
  [COMMERCIAL_STATUS.IN_STOCK]: {
    label: 'Pronta entrega',
    badge: 'Pronta entrega',
    ctaLabel: 'Comprar / WhatsApp',
    shortCtaLabel: 'WhatsApp',
    availabilityKey: 'pronta',
    canDirectBuy: true,
    appearsInCatalog: true,
  },
  [COMMERCIAL_STATUS.ON_REQUEST]: {
    label: 'Sob consulta',
    badge: 'Sob consulta',
    ctaLabel: 'Consultar disponibilidade',
    shortCtaLabel: 'Consultar',
    availabilityKey: 'sob_consulta',
    canDirectBuy: false,
    appearsInCatalog: true,
  },
  [COMMERCIAL_STATUS.REFERENCE_ONLY]: {
    label: 'Referência olfativa',
    badge: 'Curadoria sob consulta',
    ctaLabel: 'Solicitar curadoria',
    shortCtaLabel: 'Curadoria',
    availabilityKey: 'referencia',
    canDirectBuy: false,
    appearsInCatalog: false,
  },
});

function normalizeStatusText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

export function normalizeCommercialStatus(value, fallback = COMMERCIAL_STATUS.IN_STOCK) {
  const normalized = normalizeStatusText(value);
  if (VALID_COMMERCIAL_STATUSES.includes(normalized)) return normalized;
  if (['pronta', 'pronta_entrega', 'available', 'disponivel'].includes(normalized)) return COMMERCIAL_STATUS.IN_STOCK;
  if (['sob_consulta', 'consulta', 'onrequest', 'sob_encomenda', 'encomenda'].includes(normalized)) return COMMERCIAL_STATUS.ON_REQUEST;
  if (['referencia', 'reference', 'referenceonly', 'referencia_olfativa'].includes(normalized)) return COMMERCIAL_STATUS.REFERENCE_ONLY;
  return VALID_COMMERCIAL_STATUSES.includes(fallback) ? fallback : COMMERCIAL_STATUS.IN_STOCK;
}

export function getCommercialStatus(product = {}) {
  if (product?.status || product?.commercialStatus) {
    return normalizeCommercialStatus(product.status ?? product.commercialStatus);
  }

  if (product?.available === false) {
    return COMMERCIAL_STATUS.ON_REQUEST;
  }

  return COMMERCIAL_STATUS.IN_STOCK;
}

export function getCommercialStatusMeta(productOrStatus = {}) {
  const status = typeof productOrStatus === 'string' ? normalizeCommercialStatus(productOrStatus) : getCommercialStatus(productOrStatus);
  return { status, ...STATUS_COPY[status] };
}

export function canDirectBuy(product = {}) {
  return getCommercialStatus(product) === COMMERCIAL_STATUS.IN_STOCK;
}

export function shouldExposeInMainCatalog(product = {}) {
  return getCommercialStatus(product) !== COMMERCIAL_STATUS.REFERENCE_ONLY;
}
