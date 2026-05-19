import { normalizeSearchText } from '../utils/search.js';

const MEMORY_VERSION = 1;
const MAX_EVENTS = 48;

const TAG_RULES = Object.freeze({
  clean_luxury: ['limpo', 'clean', 'luxo', 'elegante', 'discreto', 'fresco refinado'],
  warm_amber: ['ambar', 'âmbar', 'oriental', 'resina', 'baunilha', 'quente'],
  fresh_executive: ['executivo', 'trabalho', 'office', 'fresco', 'camisa branca'],
  dark_seductive: ['sedutor', 'noturno', 'misteriosa', 'intenso', 'date'],
  intimate_signature: ['suave', 'intimo', 'íntimo', 'presenca silenciosa', 'discreto'],
  refined_woods: ['madeira', 'amadeirado', 'cedro', 'vetiver', 'santal'],
  arabic_signature: ['arabe', 'árabe', 'oud', 'lattafa', 'afnan'],
  cozy_comfort: ['aconcheg', 'cozy', 'conforto', 'macio'],
});

const MOOD_RULES = Object.freeze({
  confident_phase: ['executivo', 'marcante', 'presenca', 'poder'],
  softer_phase: ['suave', 'discreto', 'limpo', 'intimo'],
  night_phase: ['noite', 'noturno', 'jantar', 'date'],
  cozy_phase: ['frio', 'aconcheg', 'conforto', 'ambar'],
  minimal_phase: ['clean', 'minimal', 'fresco', 'leve'],
  seductive_phase: ['sedutor', 'sensual', 'misteriosa'],
});

const PROFILE_COPY = Object.freeze({
  clean_luxury: 'prefere luxo limpo e presença discreta',
  warm_amber: 'tende a assinaturas âmbar mais envolventes',
  fresh_executive: 'explora com frequência perfis executivos e frescos',
  dark_seductive: 'inclina para noites sofisticadas e mais densas',
  intimate_signature: 'valoriza projeção íntima e refinada',
  refined_woods: 'mantém afinidade com madeiras elegantes',
  arabic_signature: 'demonstra curiosidade por assinaturas árabes contemporâneas',
  cozy_comfort: 'busca conforto olfativo em fases mais aconchegantes',
});

function unique(values = []) { return [...new Set(values.filter(Boolean))]; }
function norm(value = '') { return normalizeSearchText(String(value || '')); }

export function normalizeMemorySignal(signal = {}) {
  const source = String(signal.source || 'unknown');
  const text = norm([signal.query, ...(signal.tags || []), ...(signal.intents || []), ...(signal.vibes || []), ...(signal.chips || []), signal.projection, signal.performance, signal.weather, signal.period].flat().join(' '));
  const tags = unique(Object.entries(TAG_RULES).filter(([, terms]) => terms.some((t) => text.includes(norm(t)))).map(([tag]) => tag));
  const moods = unique(Object.entries(MOOD_RULES).filter(([, terms]) => terms.some((t) => text.includes(norm(t)))).map(([mood]) => mood));
  return {
    source,
    ts: Number(signal.ts) || Date.now(),
    tags,
    moods,
    intents: unique((signal.intents || []).map(norm).filter(Boolean)),
    vibe: unique((signal.vibes || []).map(norm).filter(Boolean)),
    performance: norm(signal.performance),
    projection: norm(signal.projection),
  };
}

export function aggregateTasteMemory(signals = []) {
  const normalized = signals.map(normalizeMemorySignal).filter((s) => s.tags.length || s.intents.length || s.moods.length);
  const tagScores = new Map();
  const moodScores = new Map();
  normalized.forEach((signal, index) => {
    const recencyBoost = 1 + (index / Math.max(1, normalized.length - 1)) * 0.35;
    signal.tags.forEach((tag) => tagScores.set(tag, (tagScores.get(tag) || 0) + recencyBoost));
    signal.moods.forEach((mood) => moodScores.set(mood, (moodScores.get(mood) || 0) + 0.8));
  });

  const topTags = [...tagScores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([tag, score]) => ({ tag, score: Math.round(score * 100) / 100 }));
  const topMoods = [...moodScores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([mood, score]) => ({ mood, score: Math.round(score * 100) / 100 }));

  const profileNotes = topTags.map(({ tag }) => PROFILE_COPY[tag]).filter(Boolean).slice(0, 3);
  return { topTags, topMoods, profileNotes, count: normalized.length };
}

export function inferTasteEvolution(signals = []) {
  const normalized = signals.map(normalizeMemorySignal);
  if (normalized.length < 6) return { trend: 'stable', summary: 'Curadoria em consolidação.' };
  const midpoint = Math.floor(normalized.length / 2);
  const early = aggregateTasteMemory(normalized.slice(0, midpoint));
  const recent = aggregateTasteMemory(normalized.slice(midpoint));
  const earlyTags = new Set(early.topTags.map((t) => t.tag));
  const recentTags = recent.topTags.map((t) => t.tag);
  const earlyMood = early.topMoods[0]?.mood;
  const recentMood = recent.topMoods[0]?.mood;
  const newDirections = recentTags.filter((tag) => !earlyTags.has(tag));
  const shiftedLead = early.topTags[0]?.tag && recent.topTags[0]?.tag && early.topTags[0].tag !== recent.topTags[0].tag;
  if (!newDirections.length && !shiftedLead && (!earlyMood || !recentMood || earlyMood === recentMood)) return { trend: 'stable', summary: 'Direção olfativa consistente com abertura controlada.' };
  const directionText = (newDirections.length ? newDirections : [recent.topTags[0]?.tag]).filter(Boolean).slice(0,2).join(' e ').replaceAll('_', ' ');
  return { trend: 'evolving', summary: `Sua exploração recente caminha para ${directionText}.`, newDirections };
}

export function createMemoryAwareChips(memory = {}, baseChips = []) {
  const mapped = (memory.topTags || []).map(({ tag }) => tag.replaceAll('_', ' '));
  return unique([...mapped, ...baseChips]).slice(0, 8);
}

export function buildPersonalOlfactiveProfile(signals = []) {
  const memory = aggregateTasteMemory(signals);
  const evolution = inferTasteEvolution(signals);
  return {
    version: MEMORY_VERSION,
    memory,
    evolution,
    signatureTitle: 'Sua assinatura',
    directionTitle: 'Sua direção olfativa',
    journeyNarrative: evolution.summary,
  };
}

export function updateTasteMemoryStore(previous = {}, incomingSignal = {}) {
  const events = [...(Array.isArray(previous.events) ? previous.events : []), normalizeMemorySignal(incomingSignal)].slice(-MAX_EVENTS);
  return { version: MEMORY_VERSION, events, profile: buildPersonalOlfactiveProfile(events) };
}
