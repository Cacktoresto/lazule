import { buildPersonalOlfactiveProfile, normalizeMemorySignal, updateTasteMemoryStore } from '../ai/tasteMemoryEngine.js';
import { addAtmospherePresence, createSensoryWishlistEngine } from '../ai/sensoryWishlistEngine.js';

export const TASTE_MEMORY_STORAGE_KEY = 'lazule_taste_memory_v2';
const LEGACY_TASTE_MEMORY_STORAGE_KEY = 'lazule_taste_memory_v1';
const MAX_EVENTS = 48;
export const SENSORY_WISHLIST_STORAGE_KEY = 'lazule_sensory_wishlist_v1';

function parse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function normalizeEvents(events = []) {
  return events
    .map(normalizeMemorySignal)
    .filter((event) => event.tags.length || event.moods.length || event.intents.length)
    .slice(-MAX_EVENTS);
}

export function loadTasteMemoryStore(storage = globalThis?.localStorage) {
  if (!storage) return { version: 2, events: [], profile: null };
  const current = parse(storage.getItem(TASTE_MEMORY_STORAGE_KEY));
  const legacy = parse(storage.getItem(LEGACY_TASTE_MEMORY_STORAGE_KEY));
  const sourceEvents = Array.isArray(current?.events) ? current.events : Array.isArray(legacy?.events) ? legacy.events : [];
  const events = normalizeEvents(sourceEvents);
  return { version: 2, events, profile: events.length ? buildPersonalOlfactiveProfile(events) : null };
}

export function persistTasteMemoryStore(store, storage = globalThis?.localStorage) {
  if (!storage) return;
  storage.setItem(TASTE_MEMORY_STORAGE_KEY, JSON.stringify(store));
}

export function appendTasteMemorySignal(previousStore = {}, signal = {}, storage = globalThis?.localStorage) {
  const next = updateTasteMemoryStore(previousStore, signal);
  persistTasteMemoryStore(next, storage);
  return next;
}

export function loadSensoryWishlist(storage = globalThis?.localStorage) {
  if (!storage) return createSensoryWishlistEngine();
  const raw = parse(storage.getItem(SENSORY_WISHLIST_STORAGE_KEY));
  return createSensoryWishlistEngine(raw || {});
}

export function appendSensoryWishlistPresence(previousStore = {}, payload = {}, storage = globalThis?.localStorage) {
  const next = addAtmospherePresence(previousStore, payload);
  if (storage) storage.setItem(SENSORY_WISHLIST_STORAGE_KEY, JSON.stringify(next));
  return next;
}
