import { safeReadJson, safeWriteJson } from '../../utils/safeStorage.js';
import { recordMobileDiagnostic } from '../../utils/mobileCrashDiagnostics.js';

const STORAGE_KEY = 'lazule_luxury_selection_v2';
const MAX_CART_ITEMS = 40;
const MAX_ITEM_QUANTITY = 99;
const MAX_CART_STORAGE_BYTES = 48 * 1024;
const listeners = new Set();
let memorySelectionFallback = [];

function editorialLine(product = {}) {
  const context = String(product.olfactoryReference || product.category || '').toLowerCase();
  if (context.includes('bleu') || context.includes('fresh')) return 'Funciona com presença limpa em rotinas dinâmicas e encontros sociais.';
  if (context.includes('arabe') || context.includes('oud')) return 'Entrega profundidade elegante para noites longas e ambientes de assinatura.';
  if (context.includes('feminino')) return 'Direção luminosa para presença delicada, sofisticada e contínua.';
  return 'Mantém a assinatura construída na sua curadoria pessoal.';
}

function getStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

function sanitizeText(value = '', maxLength = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitizeQuantity(quantity) {
  return Math.min(MAX_ITEM_QUANTITY, Math.max(0, Math.floor(Number(quantity) || 0)));
}

function normalizeSelectionItem(item = {}) {
  const id = sanitizeText(item.id || item.slug, 96);
  if (!id) return null;

  return {
    id,
    slug: sanitizeText(item.slug || id, 96),
    name: sanitizeText(item.name || item.title, 160),
    brand: sanitizeText(item.brand, 96),
    image: sanitizeText(item.image, 360),
    price: Math.max(0, Number(item.price ?? item.unit_price ?? item.salePrice) || 0),
    quantity: Math.max(1, sanitizeQuantity(item.quantity || 1)),
    editorialPhrase: sanitizeText(item.editorialPhrase || item.description || 'Guardamos sua seleção por aqui. Se ainda fizer sentido, você pode continuar.', 220),
  };
}

function normalizeSelection(items = []) {
  const byId = new Map();

  for (const rawItem of Array.isArray(items) ? items : []) {
    const item = normalizeSelectionItem(rawItem);
    if (!item) continue;

    const existing = byId.get(item.id);
    byId.set(item.id, existing ? { ...existing, quantity: sanitizeQuantity(existing.quantity + item.quantity) || 1 } : item);
  }

  return [...byId.values()].slice(0, MAX_CART_ITEMS);
}

function readSelection() {
  if (typeof window === 'undefined') return memorySelectionFallback;

  const parsed = safeReadJson(getStorage(), STORAGE_KEY, null);
  if (!Array.isArray(parsed)) return memorySelectionFallback;

  memorySelectionFallback = normalizeSelection(parsed);
  return memorySelectionFallback;
}

function notifySelectionListeners(items) {
  listeners.forEach((listener) => listener(items));
}

function writeSelection(items) {
  const normalizedItems = normalizeSelection(items);
  memorySelectionFallback = normalizedItems;

  if (typeof window !== 'undefined') {
    safeWriteJson(getStorage(), STORAGE_KEY, normalizedItems, { maxBytes: MAX_CART_STORAGE_BYTES });
  }

  notifySelectionListeners(normalizedItems);
}

export function subscribeLuxurySelection(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLuxurySelection() {
  return readSelection();
}

export function upsertLuxuryQuantity(productId, quantity) {
  const safeQty = sanitizeQuantity(quantity);
  const current = readSelection();
  const next = safeQty === 0
    ? current.filter((item) => item.id !== productId)
    : current.map((item) => (item.id === productId ? { ...item, quantity: safeQty } : item));
  writeSelection(next);
  return next;
}

export function addToLuxurySelection(product) {
  const normalizedProduct = normalizeSelectionItem({
    id: product.id,
    slug: product.productSlug || product.slug,
    name: product.name,
    brand: product.brand,
    image: product.image,
    price: product.salePrice,
    quantity: 1,
    editorialPhrase: editorialLine(product),
  });

  if (!normalizedProduct) return readSelection();

  const current = readSelection();
  const existing = current.find((item) => item.id === normalizedProduct.id);
  const next = existing
    ? current.map((item) => (item.id === normalizedProduct.id ? { ...item, quantity: Math.max(1, sanitizeQuantity(item.quantity + 1)) } : item))
    : [...current, normalizedProduct];
  writeSelection(next);
  if (typeof window !== 'undefined') {
    recordMobileDiagnostic('cart_add', { productId: normalizedProduct.id, name: normalizedProduct.name, items: normalizeSelection(next).length });
    window.dispatchEvent(new CustomEvent('lazule:selection-added', { detail: { items: normalizeSelection(next), productId: normalizedProduct.id } }));
  }
  return normalizeSelection(next);
}

export function removeFromLuxurySelection(productId) {
  const next = readSelection().filter((item) => item.id !== productId);
  writeSelection(next);
  return next;
}

export function clearLuxurySelection() {
  writeSelection([]);
}

export function restoreLuxurySelection(items = []) {
  const normalized = normalizeSelection(items);
  writeSelection(normalized);
  return normalized;
}
