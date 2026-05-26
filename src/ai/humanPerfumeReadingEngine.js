import { normalizeSearchText } from '../utils/search.js';

function norm(value) {
  return normalizeSearchText(String(value || ''));
}

function collectPool(product = {}) {
  return norm([
    product.name,
    product.description,
    product.olfactoryReference,
    product.signature,
    product.personality,
    product.usageContext,
    ...(product.accords || []),
    ...(product.notes || []),
    ...(product.vibe || []),
    ...(product.vibes || []),
  ].flat().filter(Boolean).join(' '));
}

function has(pool, terms = []) {
  return terms.some((term) => pool.includes(norm(term)));
}

export function resolveSocialImpression(product = {}) {
  const pool = collectPool(product);
  if (has(pool, ['oud', 'amber', 'smok', 'leather', 'resin'])) return 'presença firme, de quem entra e não precisa levantar a voz.';
  if (has(pool, ['citr', 'marine', 'aquatic', 'fresh', 'clean'])) return 'energia de pessoa organizada, limpa e segura do que está fazendo.';
  if (has(pool, ['floral', 'rose', 'jasmine'])) return 'impressão de cuidado pessoal alto, com atenção aos detalhes.';
  return 'presença madura, estável e fácil de lembrar depois do encontro.';
}

export function createHumanPerfumeReading(product = {}) {
  const pool = collectPool(product);
  const quente = has(pool, ['amber', 'sweet', 'gourmand', 'oud', 'resin', 'spicy']);
  const fresco = has(pool, ['fresh', 'citr', 'marine', 'aquatic', 'clean', 'mint']);
  const noturno = has(pool, ['night', 'noite', 'dark', 'smok', 'leather']);

  const firstImpression = fresco
    ? 'Abre limpo e direto, sem cara de produto de banheiro.'
    : quente
      ? 'Começa mais encorpado, com calor de pele e presença desde o início.'
      : 'Abre redondo, sem susto, e já mostra personalidade.';

  const behavior = noturno
    ? 'Não grita no primeiro minuto. Cresce perto da pele e fica mais interessante com o tempo.'
    : 'Não invade o ambiente. Vai aparecendo melhor quando a pessoa se aproxima.';

  const context = quente
    ? 'Rende melhor em clima ameno/frio e em ambiente interno.'
    : 'Funciona fácil em calor urbano e rotina com ar-condicionado.';

  const personality = quente
    ? 'Cheiro de presença calma, mas com peso.'
    : 'Cheiro de presença limpa, prática e confiante.';

  const humanOccasion = noturno
    ? 'Camisa escura. Relógio pesado. Depois das 20h.'
    : 'Camisa bem cortada. Agenda cheia. Final de tarde pra noite.';

  const socialImpression = resolveSocialImpression(product);

  const commentary = [
    'Muita gente espera potência bruta, mas ele convence mais no controle.',
    quente ? 'No frio ele abre camadas melhores e ganha textura.' : 'No calor ele segura bem sem ficar enjoativo.',
    'Tem cara de perfume de uso real — não de vitrine.',
  ];

  const discoveryTags = [
    quente ? 'luxo árabe intenso' : 'social de verão',
    fresco ? 'clean expensive' : 'date noturno',
    'cheiro de homem organizado',
    noturno ? 'perfume de conversa baixa' : 'presença executiva',
    'lobby de hotel',
  ];

  return {
    firstImpression,
    behavior,
    context,
    socialImpression,
    personality,
    humanOccasion,
    commentary,
    discoveryTags: [...new Set(discoveryTags)],
    atmosphericContext: {
      climate: quente ? 'ameno_frio' : 'quente_urbano',
      period: noturno ? 'noite' : 'tarde_noite',
      environment: quente ? 'interno_climatizado' : 'urbano_climatizado',
      vibe: noturno ? 'maduro_noturno' : 'executivo_clean',
    },
  };
}
