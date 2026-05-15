const WHATSAPP_NUMBER = '5521975110562';
const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export function createWhatsAppLink(message) {
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
}

export function createProductWhatsAppMessage(productName, price, productUrl) {
  const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(price || 0));

  return `Olá! Quero o perfume ${productName}.\nValor: ${formattedPrice}.\nLink: ${productUrl}.`;
}
