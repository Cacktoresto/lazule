const WHATSAPP_NUMBER = '5521975110562';
const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export function createWhatsAppLink(message) {
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
}

export function createProductWhatsAppMessage(productName) {
  return `Olá! Tenho interesse no perfume ${productName} da LAZULE. Está disponível?`;
}
