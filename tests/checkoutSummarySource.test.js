import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const checkoutPageSource = readFileSync(new URL('../src/pages/commerce/CheckoutPage.jsx', import.meta.url), 'utf8');

test('checkout summary source renders one order summary container, total label and Mercado Pago CTA', () => {
  assert.equal((checkoutPageSource.match(/data-testid='checkout-summary'/g) || []).length, 1);
  assert.equal((checkoutPageSource.match(/>Resumo do pedido</g) || []).length, 1);
  assert.equal((checkoutPageSource.match(/>Total</g) || []).length, 1);
  assert.equal((checkoutPageSource.match(/Pagar com Mercado Pago/g) || []).length, 1);
});

test('checkout item source is a readonly summary without quantity controls or cart drawer CTA', () => {
  assert.equal((checkoutPageSource.match(/data-testid='checkout-product-card'/g) || []).length, 1);
  assert.equal(checkoutPageSource.includes("type='number'"), false);
  assert.equal(checkoutPageSource.includes('upsertLuxuryQuantity'), false);
  assert.equal(checkoutPageSource.includes('Continuar presença'), false);
  assert.equal(checkoutPageSource.includes('Ir para checkout'), false);
});
