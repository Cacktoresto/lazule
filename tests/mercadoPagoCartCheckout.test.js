import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildMercadoPagoCheckoutPayload } from '../src/services/mercadoPagoCheckout.js';

const drawerSource = readFileSync(new URL('../src/components/commerce/CartDrawer.jsx', import.meta.url), 'utf8');
const serviceSource = readFileSync(new URL('../src/services/mercadoPagoCheckout.js', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../src/commerce/payment/mercadoPagoCheckoutClient.js', import.meta.url), 'utf8');

test('cart primary CTA starts Mercado Pago checkout instead of WhatsApp', () => {
  assert.match(drawerSource, /onClick=\{handleCheckoutClick\}/);
  assert.match(drawerSource, /startMercadoPagoCheckout\(items, \{ total, source: 'cart_drawer' \}\)/);
  assert.match(drawerSource, /Finalizar compra/);
  assert.doesNotMatch(drawerSource, /href=\{whatsappHref\}[^>]*>Finalizar compra/);
});

test('WhatsApp remains a secondary consultation action from the cart', () => {
  assert.match(drawerSource, /href=\{whatsappHref\}/);
  assert.match(drawerSource, /Falar com consultor/);
  assert.match(drawerSource, /whatsapp_consultation_from_cart/);
});

test('empty cart disables checkout and checkout errors show support fallback state', () => {
  assert.match(drawerSource, /disabled className='mt-4/);
  assert.match(drawerSource, /role="alert"/);
  assert.match(drawerSource, /CHECKOUT_ERROR_MESSAGE/);
  assert.match(serviceSource, /Não conseguimos iniciar o pagamento agora\. Tente novamente ou fale com a curadoria\./);
});

test('Mercado Pago cart payload includes item details and quantities', () => {
  const payload = buildMercadoPagoCheckoutPayload([
    { id: 'sku-1', slug: 'amadeirado-lazule', name: 'Amadeirado LAZULE', quantity: 2, price: 320, image: '/a.jpg' },
  ], { total: 640, externalReference: 'order-1' });

  assert.equal(payload.external_reference, 'order-1');
  assert.equal(payload.total, 640);
  assert.deepEqual(payload.items[0], {
    id: 'sku-1',
    slug: 'amadeirado-lazule',
    name: 'Amadeirado LAZULE',
    quantity: 2,
    unit_price: 320,
    total: 640,
    image: '/a.jpg',
  });
});

test('Mercado Pago checkout uses a backend endpoint and does not expose access token in frontend helper', () => {
  assert.match(clientSource, /\/api\/create-mercado-pago-preference/);
  assert.match(clientSource, /\/api\/payments\/create-preference/);
  assert.doesNotMatch(serviceSource, /ACCESS_TOKEN|Bearer|process\.env/);
});

