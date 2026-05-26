const PRESENCE_STORAGE_KEY = 'lazule.presence.session.v1';
const MEMORY_STORAGE_KEY = 'lazule.sensory.memory.weight.v1';

function safeNow() { return Date.now(); }

function readJson(key, fallback) {
  try { return JSON.parse(globalThis?.localStorage?.getItem(key) || 'null') || fallback; } catch { return fallback; }
}

function writeJson(key, value) {
  try { globalThis?.localStorage?.setItem(key, JSON.stringify(value)); } catch {}
}

function normalizeArray(value) { return Array.isArray(value) ? value : []; }

export function trackPresenceEvent(event = {}) {
  const current = readJson(PRESENCE_STORAGE_KEY, { startedAt: safeNow(), events: [], productViews: [] });
  const nextEvent = { ...event, ts: safeNow() };
  const productViews = event.productSlug
    ? [...normalizeArray(current.productViews), { slug: event.productSlug, ts: nextEvent.ts, revisit: Boolean(event.revisit) }].slice(-80)
    : normalizeArray(current.productViews);
  const next = {
    ...current,
    lastInteractionAt: nextEvent.ts,
    events: [...normalizeArray(current.events), nextEvent].slice(-120),
    productViews,
  };
  writeJson(PRESENCE_STORAGE_KEY, next);
  return next;
}

export function resolvePresenceProfile(session = readJson(PRESENCE_STORAGE_KEY, {})) {
  const events = normalizeArray(session.events);
  const productViews = normalizeArray(session.productViews);
  const startedAt = Number(session.startedAt) || safeNow();
  const durationMs = Math.max(1, safeNow() - startedAt);
  const velocity = events.length / (durationMs / 60000);
  const revisits = productViews.filter((item) => item.revisit).length;
  const contemplative = velocity < 5 || revisits >= 2;
  return {
    mode: contemplative ? 'contemplative' : 'exploratory',
    velocity,
    dwellMs: durationMs,
    revisits,
    depth: Math.min(1, (productViews.length + events.length) / 40),
    cadenceShift: contemplative ? -0.18 : 0.12,
    glowShift: contemplative ? -0.1 : 0.08,
  };
}

export function updateMemoryWeights(interaction = {}) {
  const store = readJson(MEMORY_STORAGE_KEY, { entries: {} });
  const slug = interaction.productSlug;
  if (!slug) return store;
  const previous = store.entries[slug] || { visits: 0, weight: 0, nocturnal: 0, silentObsession: 0, lastTs: 0 };
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour <= 5;
  const visits = previous.visits + 1;
  const savedNoPurchase = Boolean(interaction.saved) && !interaction.purchased;
  const nextEntry = {
    ...previous,
    visits,
    lastTs: safeNow(),
    nocturnal: previous.nocturnal + (isNight ? 1 : 0),
    silentObsession: previous.silentObsession + (savedNoPurchase ? 1 : 0),
    recurrence: Math.min(1, visits / 8),
    persistence: Math.min(1, (safeNow() - (previous.lastTs || safeNow())) < 1000 * 60 * 60 * 36 ? 1 : 0.4),
  };
  nextEntry.weight = Number((visits * 0.4 + nextEntry.nocturnal * 0.24 + nextEntry.silentObsession * 0.32).toFixed(2));
  const next = { ...store, entries: { ...store.entries, [slug]: nextEntry } };
  writeJson(MEMORY_STORAGE_KEY, next);
  return next;
}

export function resolveSessionAtmosphere({ product = {}, presence = {}, memory = {} } = {}) {
  const pool = [product.signature, product.olfactoryReference, product.name, ...(product.vibes || product.vibe || [])].join(' ').toLowerCase();
  const dense = /amber|oud|smok|night|orient/.test(pool) || (presence.mode === 'contemplative' && presence.dwellMs > 1000 * 60 * 4);
  const fresh = /clean|mineral|marine|aquatic|fresh|blue/.test(pool);
  const profile = dense ? 'amber-nocturne' : fresh ? 'mineral-clean-contemplative' : 'editorial-signature';
  const memoryWeight = Object.values(memory.entries || {}).reduce((acc, item) => acc + (item.weight || 0), 0);
  return { profile, memoryWeight, intent: dense ? 'profundidade silenciosa' : fresh ? 'clareza mineral' : 'assinatura em evolução' };
}

export function createStoryFragments({ product = {}, presence = {}, atmosphere = {}, memoryEntry = {} } = {}) {
  const fragments = [];
  if (memoryEntry.visits >= 3) fragments.push('Essa assinatura já se tornou uma presença recorrente na sua curadoria.');
  if (memoryEntry.nocturnal >= 2) fragments.push('Ela aparece em horários mais noturnos, com uma leitura mais densa e íntima.');
  if (presence.mode === 'contemplative') fragments.push('Seu ritmo recente privilegia permanência, e essa construção responde com elegância silenciosa.');
  if (presence.mode === 'exploratory') fragments.push('Sua navegação está mais expansiva, e essa assinatura conversa com movimentos de descoberta.');
  fragments.push(`Atmosfera atual: ${atmosphere.intent || 'presença refinada'}.`);
  return fragments.slice(0, 3);
}
