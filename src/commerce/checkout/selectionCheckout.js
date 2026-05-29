import { formatBRL } from '../../utils/currency.js';

function safeQuantity(quantity) {
  return Math.max(1, Number(quantity) || 1);
}

export function buildSelectionWhatsAppMessage(items = [], total = 0) {
  const selectedItems = Array.isArray(items) ? items.filter((item) => item?.id) : [];

  if (!selectedItems.length) {
    return 'Olá! Quero atendimento premium da LAZULE FRAGRANCES para montar minha seleção olfativa.';
  }

  const productLines = selectedItems.map((item, index) => {
    const quantity = safeQuantity(item.quantity);
    const unitPrice = Number(item.price) || 0;
    const subtotal = unitPrice * quantity;
    const brand = item.brand ? ` — ${item.brand}` : '';
    return `${index + 1}. ${item.name || 'Fragrância LAZULE'}${brand} · ${quantity}x · ${formatBRL(subtotal)}`;
  });

  return [
    'Olá, LAZULE! Quero falar com a curadoria sobre esta seleção:',
    ...productLines,
    `Total estimado: ${formatBRL(total)}`,
    'Pode me ajudar com disponibilidade, dúvidas e orientação pelo concierge?',
  ].join('\n');
}
