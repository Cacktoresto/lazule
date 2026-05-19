import { COLLECTION_STATES } from '../ai/collectionIntelligenceEngine.js';

export const WARDROBE_STORAGE_KEY = 'lazule_wardrobe_memory_v1';

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

export function loadWardrobeMemory(storage = globalThis?.localStorage) {
  if (!storage?.getItem) return { entries: [], favorites: [], inspirations: [] };
  const parsed = safeParse(storage.getItem(WARDROBE_STORAGE_KEY));
  return {
    entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
    favorites: Array.isArray(parsed?.favorites) ? parsed.favorites : [],
    inspirations: Array.isArray(parsed?.inspirations) ? parsed.inspirations : [],
  };
}

export function saveWardrobeMemory(nextState, storage = globalThis?.localStorage) {
  if (!storage?.setItem) return;
  storage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(nextState));
}

export function saveWardrobeEntry(memory = {}, product = {}, state = COLLECTION_STATES.owned) {
  const slug = product?.productSlug ?? product?.id ?? product?.name;
  if (!slug) return memory;
  const entries = (memory.entries || []).filter((entry) => entry?.product?.productSlug !== slug);
  return { ...memory, entries: [...entries, { product, state, ts: Date.now() }].slice(-120) };
}
