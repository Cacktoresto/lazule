import { buildPersonalOlfactiveProfile, normalizeMemorySignal, updateTasteMemoryStore } from '../ai/tasteMemoryEngine.js';
import { addAtmospherePresence, createSensoryWishlistEngine } from '../ai/sensoryWishlistEngine.js';
import { safeGetStorageItem, safeSetStorageItem } from './safeStorage.js';

export const TASTE_MEMORY_STORAGE_KEY = 'lazule_taste_memory_v2';
const LEGACY_TASTE_MEMORY_STORAGE_KEY = 'lazule_taste_memory_v1';
const MAX_EVENTS = 48;
export const SENSORY_WISHLIST_STORAGE_KEY = 'lazule_sensory_wishlist_v1';

function parse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function readStorage(storage, key) {
  return safeGetStorageItem(storage, key, null);
}

function writeStorage(storage, key, value) {
  return safeSetStorageItem(storage, key, JSON.stringify(value), { maxBytes: 32 * 1024 });
}

function normalizeEvents(events = []) {
  return events
    .map(normalizeMemorySignal)
    .filter((event) => event.tags.length || event.moods.length || event.intents.length)
    .slice(-MAX_EVENTS);
}

export function loadTasteMemoryStore(storage = globalThis?.localStorage) {
  if (!storage) return { version: 2, events: [], profile: null };
  const current = parse(readStorage(storage, TASTE_MEMORY_STORAGE_KEY));
  const legacy = parse(readStorage(storage, LEGACY_TASTE_MEMORY_STORAGE_KEY));
  const sourceEvents = Array.isArray(current?.events) ? current.events : Array.isArray(legacy?.events) ? legacy.events : [];
  const events = normalizeEvents(sourceEvents);
  return { version: 2, events, profile: events.length ? buildPersonalOlfactiveProfile(events) : null };
}

export function persistTasteMemoryStore(store, storage = globalThis?.localStorage) {
  if (!storage) return;
  writeStorage(storage, TASTE_MEMORY_STORAGE_KEY, store);
}

export function appendTasteMemorySignal(previousStore = {}, signal = {}, storage = globalThis?.localStorage) {
  const next = updateTasteMemoryStore(previousStore, signal);
  persistTasteMemoryStore(next, storage);
  return next;
}

export function loadSensoryWishlist(storage = globalThis?.localStorage) {
  if (!storage) return createSensoryWishlistEngine();
  const raw = parse(readStorage(storage, SENSORY_WISHLIST_STORAGE_KEY));
  return createSensoryWishlistEngine(raw || {});
}

export function appendSensoryWishlistPresence(previousStore = {}, payload = {}, storage = globalThis?.localStorage) {
  const next = addAtmospherePresence(previousStore, payload);
  if (storage) writeStorage(storage, SENSORY_WISHLIST_STORAGE_KEY, next);
  return next;
}
