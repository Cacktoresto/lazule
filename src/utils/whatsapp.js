import { formatBRL } from './currency.js';
import { createProductPath } from './productRouting.js';
import { createCanonicalUrl } from './seo.js';
import { formatReferralForWhatsapp } from './referral.js';

const WHATSAPP_NUMBER = '5521975110562';
const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
const DEFAULT_WHATSAPP_MESSAGE = 'Olá! Quero atendimento premium da LAZULE FRAGRANCES.';
const DEFAULT_PRODUCT_NAME = 'fragrância da curadoria LAZULE';
const DEFAULT_BRAND_NAME = 'LAZULE FRAGRANCES';
const DEFAULT_PRODUCT_URL = 'https://lazulefragrances.com.br/catalogo';

function cleanText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function getProductUrl(product, productUrl) {
  if (hasValue(productUrl)) {
    return cleanText(productUrl, DEFAULT_PRODUCT_URL);
  }

  return createCanonicalUrl(createProductPath(product));
}

export function createWhatsAppLink(message = DEFAULT_WHATSAPP_MESSAGE) {
  const safeMessage = cleanText(message, DEFAULT_WHATSAPP_MESSAGE);
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(safeMessage)}`;
}

export function createProductWhatsAppMessage(productOrName, price, productUrl, options = {}) {
  const product = typeof productOrName === 'object' && productOrName !== null ? productOrName : null;
  const productName = cleanText(product ? product.name : productOrName, DEFAULT_PRODUCT_NAME);
  const brandName = cleanText(product?.brand ?? options.brand, DEFAULT_BRAND_NAME);
  const formattedPrice = hasValue(product?.salePrice ?? price) ? formatBRL(product?.salePrice ?? price) : 'sob consulta';
  const variation = cleanText(product?.variation ?? product?.size ?? options.variation ?? options.size);
  const quantity = cleanText(options.quantity ?? product?.quantity);
  const canonicalUrl = getProductUrl(product ?? { name: productName }, productUrl ?? options.productUrl);
  const referralLines = formatReferralForWhatsapp(options.referralContext);

  const details = [
    `Produto: ${productName}`,
    `Marca: ${brandName}`,
    `Preço: ${formattedPrice}`,
  ];

  if (variation) {
    details.push(`Variação/tamanho: ${variation}`);
  }

  if (quantity) {
    details.push(`Quantidade: ${quantity}`);
  }

  details.push(`Link: ${canonicalUrl}`);

  if (referralLines) {
    details.push(referralLines);
  }

  return [
    'Olá, LAZULE! Gostaria de comprar esta fragrância.',
    ...details,
    'Pode confirmar disponibilidade e finalização, por favor?',
  ].join('\n');
}

export function createProductWhatsAppLink(product, options = {}) {
  return createWhatsAppLink(
    createProductWhatsAppMessage(product, product?.salePrice, options.productUrl, options),
  );
}

export const whatsappConfig = {
  number: WHATSAPP_NUMBER,
  baseUrl: WHATSAPP_BASE_URL,
};
