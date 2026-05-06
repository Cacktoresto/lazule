const WHATSAPP_NUMBER = '5599999999999';

export function createWhatsAppLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function createProductWhatsAppMessage(productName) {
  return `Olá! Tenho interesse no perfume ${productName} da LAZULE. Está disponível?`;
}
