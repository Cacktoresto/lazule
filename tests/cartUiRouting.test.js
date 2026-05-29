import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveCartUiRendering } from '../src/commerce/checkout/cartUiRouting.js';

test('checkout route renders only the checkout summary cart tree', () => {
  const rendering = resolveCartUiRendering('/checkout');

  assert.equal(rendering.renderCheckoutSummary, true);
  assert.equal(rendering.renderCartDrawer, false);
  assert.equal(rendering.renderFloatingSelectionPanel, false);
  assert.equal(rendering.renderSelectionSidebar, false);
  assert.equal(rendering.renderSelectionPanel, false);
});

test('checkout route with trailing slash still suppresses duplicate cart UI trees', () => {
  const rendering = resolveCartUiRendering('/checkout/');

  assert.equal(rendering.routePath, '/checkout');
  assert.equal(rendering.renderCheckoutSummary, true);
  assert.equal(rendering.renderCartDrawer, false);
  assert.equal(rendering.renderFloatingSelectionPanel, false);
  assert.equal(rendering.renderSelectionSidebar, false);
  assert.equal(rendering.renderSelectionPanel, false);
});

test('non-checkout routes keep the drawer or selection entry point available', () => {
  const rendering = resolveCartUiRendering('/catalogo');

  assert.equal(rendering.renderCheckoutSummary, false);
  assert.equal(rendering.renderCartDrawer, true);
  assert.equal(rendering.renderFloatingSelectionPanel, true);
  assert.equal(rendering.renderSelectionSidebar, true);
  assert.equal(rendering.renderSelectionPanel, true);
});
