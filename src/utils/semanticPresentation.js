import { normalizeSearchText } from './search.js';

const EDITORIAL_DICTIONARY = Object.freeze({
  modern_fresh: 'Frescor moderno',
  clean_luxury: 'Luxo clean',
  seductive_night: 'Noite sedutora',
  executive_fresh: 'Frescor executivo',
  tropical_energy: 'Energia tropical',
  dark_smoky: 'Defumado intenso',
  warm_spicy: 'Quente especiado',
  deep_dark_amber: 'Âmbar escuro intenso',
  loud_clubbing: 'Noite intensa',
  intimate_skin_scent: 'Pele intimista',
  creamy_winter: 'Cremoso invernal',
  dark_amber: 'Âmbar intenso',
  fresh_clean: 'Fresco limpo',
  creamy_sweet: 'Doce cremoso',
  metallic_aquatic: 'Aquático metálico',
  seductive_dense: 'Sedução densa',
  woody_executive: 'Madeira executiva',
  beast_mode: 'Presença extrema',
});

function toLookupKey(value = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.includes('_') ? raw.toLowerCase() : normalizeSearchText(raw).replace(/\s+/g, '_');
}

function toNaturalWords(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/[A-Z]{2,}(?=\b)/g, (match) => match.toLowerCase())
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function editorialTitleCase(value = '') {
  return value
    .split(' ')
    .map((word, index) => {
      if (!word) return '';
      const lower = word.toLowerCase();
      if (index > 0 && ['de', 'da', 'do', 'dos', 'das', 'e'].includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function formatSemanticLabel(value = '') {
  const key = toLookupKey(value);
  if (key && EDITORIAL_DICTIONARY[key]) return EDITORIAL_DICTIONARY[key];
  const clean = toNaturalWords(value);
  if (!clean) return '';
  return editorialTitleCase(clean);
}

export const humanizeFacet = formatSemanticLabel;
export const humanizeCluster = formatSemanticLabel;
export const humanizeSignature = formatSemanticLabel;
export const humanizeSemanticTag = formatSemanticLabel;

export function formatSemanticLabels(values = [], { limit } = {}) {
  const normalized = [...new Set((values || []).map((value) => formatSemanticLabel(value)).filter(Boolean))];
  return typeof limit === 'number' ? normalized.slice(0, limit) : normalized;
}
