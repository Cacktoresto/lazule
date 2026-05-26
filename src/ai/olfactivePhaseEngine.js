import { normalizeSearchText } from '../utils/search.js';

const PHASES = Object.freeze({
  mineral_clean: { terms: ['mineral', 'clean', 'fresh', 'marine', 'aquatic', 'airy'], density: 'airy', period: 'day' },
  amber_sophisticated: { terms: ['amber', 'ambar', 'resin', 'oriental', 'warm'], density: 'dense', period: 'evening' },
  smoky_nocturnal: { terms: ['smoky', 'smoke', 'incense', 'night', 'nocturnal', 'oud'], density: 'dense', period: 'night' },
  executive_fresh: { terms: ['executive', 'office', 'formal', 'clean', 'shirt', 'vetiver'], density: 'balanced', period: 'day' },
  experimental: { terms: ['experimental', 'contrast', 'unexpected', 'layering', 'bold'], density: 'balanced', period: 'any' },
  introspective: { terms: ['introspective', 'quiet', 'soft', 'intimate', 'skin scent'], density: 'airy', period: 'night' },
  signature_intense: { terms: ['signature', 'intense', 'long lasting', 'projection', 'powerful'], density: 'dense', period: 'any' },
});

function hourBucket(ts) {
  const h = new Date(ts || Date.now()).getHours();
  if (h >= 5 && h <= 11) return 'morning';
  if (h >= 12 && h <= 17) return 'afternoon';
  if (h >= 18 && h <= 21) return 'evening';
  return 'night';
}

function scorePhase(phaseKey, signal = {}, index = 0, total = 1) {
  const phase = PHASES[phaseKey];
  const blob = normalizeSearchText([
    signal.query,
    signal.olfactoryFamily,
    signal.period,
    signal.mood,
    signal.atmosphere,
    ...(signal.tags || []),
    ...(signal.vibes || []),
  ].flat().join(' '));

  const recurrence = phase.terms.reduce((acc, term) => acc + (blob.includes(normalizeSearchText(term)) ? 1 : 0), 0);
  const recency = 0.6 + (index / Math.max(1, total - 1)) * 0.8;
  const revisit = signal.revisit ? 0.85 : 0;
  const persistence = Number(signal.moodPersistence || 0) * 0.7;
  const affinity = Number(signal.recommendationAffinity || 0) * 0.6;
  const atmospheric = normalizeSearchText(signal.atmosphericCluster || '').includes(phaseKey.split('_')[0]) ? 0.8 : 0;
  const period = hourBucket(signal.ts);
  const temporalFit = (phase.period === 'any') || (phase.period === 'day' && (period === 'morning' || period === 'afternoon')) || (phase.period === 'evening' && period === 'evening') || (phase.period === 'night' && period === 'night') ? 0.5 : 0;

  const value = recurrence * 1.2 + recency + revisit + persistence + affinity + atmospheric + temporalFit;
  return Number(value.toFixed(4));
}

export function resolveOlfactivePhase(signals = []) {
  if (!Array.isArray(signals) || !signals.length) {
    return { phase: 'editorial_balanced', confidence: 0, density: 'balanced', narrative: 'Presença em equilíbrio, aberta para novos ciclos.' };
  }

  const keys = Object.keys(PHASES);
  const scores = new Map(keys.map((key) => [key, 0]));
  signals.forEach((signal, index) => {
    keys.forEach((key) => {
      scores.set(key, scores.get(key) + scorePhase(key, signal, index, signals.length));
    });
  });

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [phase, topScore] = ranked[0];
  const second = ranked[1]?.[1] || 0;
  const confidence = Number(Math.max(0, Math.min(1, (topScore - second + 0.9) / (topScore + 1))).toFixed(3));
  const density = PHASES[phase]?.density || 'balanced';

  return {
    phase,
    confidence,
    density,
    rankedPhases: ranked.slice(0, 4).map(([key, score]) => ({ phase: key, score: Number(score.toFixed(2)) })),
    narrative: `Seu ciclo recente orbita ${phase.replaceAll('_', ' ')}, com continuidade ${density === 'dense' ? 'mais profunda' : 'mais arejada'}.`,
  };
}

export function buildSeasonalSensoryMemory(signals = []) {
  const periods = { morning: [], afternoon: [], evening: [], night: [] };
  signals.forEach((signal) => {
    periods[hourBucket(signal.ts)].push(signal);
  });
  return Object.fromEntries(Object.entries(periods).map(([period, entries]) => {
    const phase = resolveOlfactivePhase(entries);
    return [period, { dominantPhase: phase.phase, density: phase.density, confidence: phase.confidence }];
  }));
}

export function buildMemoryConstellations(signals = []) {
  const phase = resolveOlfactivePhase(signals);
  const clusters = phase.rankedPhases.map((entry) => ({
    key: `${entry.phase}_cluster`,
    label: entry.phase.replaceAll('_', ' '),
    pull: Number((entry.score / Math.max(1, phase.rankedPhases[0]?.score || 1)).toFixed(2)),
  }));
  return {
    dominantConstellation: clusters[0]?.label || 'editorial balanced',
    clusters,
    editorialFragments: clusters.slice(0, 2).map((cluster) => `Atmosferas que retornam: ${cluster.label}.`),
  };
}
