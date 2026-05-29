import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSelectionWhatsAppMessage } from '../src/commerce/checkout/selectionCheckout.js';
import {
  addToLuxurySelection,
  clearLuxurySelection,
  getLuxurySelection,
  removeFromLuxurySelection,
  upsertLuxuryQuantity,
} from '../src/commerce/cart/luxuryCartState.js';

function createStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  };
}

function setupBrowserLikeGlobals() {
  const previousWindow = global.window;
  const events = [];
  global.window = {
    localStorage: createStorage(),
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
  };
  return {
    events,
    restore() {
      if (previousWindow === undefined) delete global.window;
      else global.window = previousWindow;
    },
  };
}

const product = {
  id: 'amber-01',
  name: 'Amber Concierge',
  brand: 'LAZULE',
  image: '/amber.jpg',
  salePrice: 420,
  olfactiveFamily: 'Âmbar',
};

test('adding product updates selection count and dispatches drawer open event', () => {
  const env = setupBrowserLikeGlobals();
  try {
    addToLuxurySelection(product);
    addToLuxurySelection(product);

    const selection = getLuxurySelection();
    assert.equal(selection.length, 1);
    assert.equal(selection[0].quantity, 2);
    assert.equal(env.events.length, 2);
    assert.equal(env.events[0].type, 'lazule:selection-added');
    assert.equal(env.events[0].detail.productId, product.id);
  } finally {
    env.restore();
  }
});

test('quantity, remove, and clear behavior keep totals and empty state reliable', () => {
  const env = setupBrowserLikeGlobals();
  try {
    addToLuxurySelection(product);
    upsertLuxuryQuantity(product.id, 3);

    let selection = getLuxurySelection();
    assert.equal(selection[0].quantity, 3);
    assert.equal(selection.reduce((sum, item) => sum + item.price * item.quantity, 0), 1260);

    selection = removeFromLuxurySelection(product.id);
    assert.deepEqual(selection, []);

    addToLuxurySelection(product);
    clearLuxurySelection();
    assert.deepEqual(getLuxurySelection(), []);
  } finally {
    env.restore();
  }
});

test('selection checkout WhatsApp message includes selected products and empty fallback has no broken CTA payload', () => {
  const message = buildSelectionWhatsAppMessage([
    { id: 'amber-01', name: 'Amber Concierge', brand: 'LAZULE', quantity: 2, price: 420 },
  ], 840);

  assert.match(message, /curadoria|consultoria|dúvidas/);
  assert.match(message, /Amber Concierge/);
  assert.match(message, /2x/);
  assert.match(message, /R\$\s?840,00/);

  const emptyMessage = buildSelectionWhatsAppMessage([], 0);
  assert.match(emptyMessage, /montar minha seleção olfativa/);
  assert.doesNotMatch(emptyMessage, /undefined|null|NaN/);
});
