const STORAGE_KEY = 'lazule_luxury_selection_v2';
const listeners = new Set();

function editorialLine(product = {}) {
  const context = String(product.olfactoryReference || product.category || '').toLowerCase();
  if (context.includes('bleu') || context.includes('fresh')) return 'Funciona com presença limpa em rotinas dinâmicas e encontros sociais.';
  if (context.includes('arabe') || context.includes('oud')) return 'Entrega profundidade elegante para noites longas e ambientes de assinatura.';
  if (context.includes('feminino')) return 'Direção luminosa para presença delicada, sofisticada e contínua.';
  return 'Mantém a assinatura construída na sua curadoria pessoal.';
}

function readSelection() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSelection(items) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((listener) => listener(items));
}

export function subscribeLuxurySelection(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLuxurySelection() {
  return readSelection();
}

export function upsertLuxuryQuantity(productId, quantity) {
  const safeQty = Math.max(0, Math.floor(Number(quantity) || 0));
  const current = readSelection();
  const next = safeQty === 0
    ? current.filter((item) => item.id !== productId)
    : current.map((item) => (item.id === productId ? { ...item, quantity: safeQty } : item));
  writeSelection(next);
  return next;
}

export function addToLuxurySelection(product) {
  const current = readSelection();
  const existing = current.find((item) => item.id === product.id);
  const next = existing
    ? current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    : [...current, {
      id: product.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      price: product.salePrice,
      quantity: 1,
      editorialPhrase: editorialLine(product),
    }];
  writeSelection(next);
  return next;
}

export function removeFromLuxurySelection(productId) {
  const next = readSelection().filter((item) => item.id !== productId);
  writeSelection(next);
  return next;
}

export function clearLuxurySelection() {
  writeSelection([]);
}
