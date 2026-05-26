import { normalizeSearchText } from '../utils/search.js';

const BLOCKED_TERMS = ['sofisticado', 'refinado', 'premium', 'elegante', 'assinatura', 'mineral', 'silencioso', 'luxuoso'];

const HUMAN_ROTATION = {
  sofisticado: ['bem resolvido', 'de bom gosto', 'sem exagero'],
  refinado: ['bem lapidado', 'com acabamento limpo', 'redondo'],
  premium: ['de nível alto', 'de boutique', 'de curadoria séria'],
  elegante: ['seguro', 'com postura', 'sem ruído'],
  assinatura: ['marca pessoal', 'identidade', 'estilo próprio'],
  mineral: ['fresco seco', 'textura fria', 'limpeza com sal'],
  silencioso: ['discreto', 'de conversa curta', 'de presença próxima'],
  luxuoso: ['caro de verdade', 'com cara de hotel cinco estrelas', 'com peso de peça boa'],
};

const CONTEXT_SNIPPETS = [
  'Funciona muito bem em ambiente climatizado.',
  'Noite fria costuma valorizar essa construção.',
  'Perto da pele ele fica mais interessante do que no ar.',
  'Tem cara de roupa escura e rotina organizada.',
  'É perfume de presença calma, mas notada.',
  'Passa impressão de alguém que sabe exatamente onde está indo.',
];

function rotateBlockedTerms(text = '') {
  let rotated = String(text || '');
  Object.entries(HUMAN_ROTATION).forEach(([term, replacements]) => {
    const matcher = new RegExp(`\\b${term}\\b`, 'gi');
    let i = 0;
    rotated = rotated.replace(matcher, () => replacements[(i++) % replacements.length]);
  });
  return rotated;
}

export function sanitizeEditorialLanguage(text = '') {
  return rotateBlockedTerms(text)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function createHumanContextNarrative(product = {}, { seed = 0 } = {}) {
  const facets = [product.family, ...(product.semanticFacets || []), ...(product.vibeTags || [])]
    .map((item) => normalizeSearchText(item))
    .filter(Boolean)
    .join(' ');

  const core = [];
  if (/amber|doce|sweet|oriental/.test(facets)) core.push('Doçura com corpo e sensação de noite ativa.');
  if (/fresh|clean|aquatic|citr/.test(facets)) core.push('Limpeza nítida, daquelas que parecem camisa recém-passada.');
  if (/executive|woody|wood|vetiver/.test(facets)) core.push('Tem energia de reunião importante e fala baixa.');
  if (/dark|smoky|oud/.test(facets)) core.push('Entra sério no ambiente e não tenta agradar todo mundo.');

  const context = CONTEXT_SNIPPETS[seed % CONTEXT_SNIPPETS.length];
  const narrative = [...core.slice(0, 2), context].filter(Boolean).join(' ');
  return sanitizeEditorialLanguage(narrative || 'Presença clara e comportamento consistente no uso real.');
}

export function applyEditorialAntiRepetition(lines = []) {
  const seen = new Set();
  return lines
    .map((line) => sanitizeEditorialLanguage(line))
    .filter((line) => {
      const key = normalizeSearchText(line);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

export function blockedEditorialTerms() {
  return [...BLOCKED_TERMS];
}
