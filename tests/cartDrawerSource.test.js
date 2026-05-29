import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const headerSource = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
const drawerSource = readFileSync(new URL('../src/components/commerce/CartDrawer.jsx', import.meta.url), 'utf8');

test('cart open buttons exist with accessible labels and count rendering', () => {
  assert.match(headerSource, /Sua seleção/);
  assert.match(headerSource, /aria-label=\{hasItems \?/);
  assert.match(headerSource, /aria-haspopup='dialog'/);
  assert.match(headerSource, /\{quantity\}/);
  assert.match(headerSource, /fixed bottom-4 right-4/);
  assert.doesNotMatch(headerSource, /hidden lg:block/);
});

test('cart drawer dialog supports open and close interactions', () => {
  assert.match(drawerSource, /role="dialog"/);
  assert.match(drawerSource, /aria-modal="true"/);
  assert.match(drawerSource, /aria-labelledby="cart-drawer-title"/);
  assert.match(drawerSource, /inert=\{open \? undefined : ''\}/);
  assert.match(drawerSource, /data-testid="cart-backdrop"/);
  assert.match(drawerSource, /event\.key === 'Escape'/);
  assert.match(drawerSource, /document\.body\.style\.overflow = 'hidden'/);
});

test('cart drawer CTAs are explicit and empty checkout is disabled', () => {
  assert.match(drawerSource, /Finalizar atendimento/);
  assert.match(drawerSource, /Continuar explorando/);
  assert.match(drawerSource, /Limpar seleção/);
  assert.match(drawerSource, /disabled className='mt-4/);
  assert.match(drawerSource, /createWhatsAppLink\(buildSelectionWhatsAppMessage\(items, total\)\)/);
});

test('cart drawer uses opaque premium surface with iPhone-style blurred backdrop', () => {
  assert.match(drawerSource, /backdrop-blur-\[14px\]/);
  assert.match(drawerSource, /backdrop-saturate-\[120%\]/);
  assert.match(drawerSource, /bg-\[linear-gradient\(155deg,#030713/);
  assert.match(drawerSource, /sticky top-0/);
  assert.match(drawerSource, /min-h-0 flex-1 .*overflow-y-auto/);
});
