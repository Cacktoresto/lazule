const STORAGE_KEY = 'lazule_luxury_selection_v1';

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
}

export function getLuxurySelection() {
  return readSelection();
}

export function addToLuxurySelection(product) {
  const current = readSelection();
  const existing = current.find((item) => item.id === product.id);

  const next = existing
    ? current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    : [...current, { id: product.id, name: product.name, image: product.image, price: product.salePrice, quantity: 1 }];

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
