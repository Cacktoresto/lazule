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

export function createEditorialContrastEngine(product = {}) {
  const pool = collectPool(product);
  const quente = has(pool, ['amber', 'sweet', 'gourmand', 'oud', 'resin', 'spicy']);
  const fresco = has(pool, ['fresh', 'citr', 'marine', 'aquatic', 'clean', 'mint']);
  const noturno = has(pool, ['night', 'noite', 'dark', 'smok', 'leather']);
  const floral = has(pool, ['floral', 'rose', 'jasmine', 'iris', 'violet']);

  return {
    strengths: [
      quente ? 'presença encorpada com assinatura memorável.' : 'abertura limpa e prática para uso recorrente.',
      noturno ? 'cresce com elegância em ambiente fechado.' : 'mantém leitura social controlada e fácil.',
    ],
    limitations: [
      quente ? 'no calor intenso pode adoçar além do ideal.' : 'em noite fria pode parecer discreto demais.',
      floral ? 'pode soar sério em pele muito jovem.' : 'não entrega impacto imediato para quem busca explosão.',
    ],
    contextualWarnings: [
      quente ? 'em escritório pequeno, duas borrifadas já resolvem.' : 'em ambiente aberto pode perder parte da presença.',
      noturno ? 'brilha muito mais depois do fim da tarde.' : 'em evento noturno formal pode pedir reforço.',
    ],
    idealEnvironments: [quente ? 'frio moderado e ambientes internos' : 'calor urbano e rotina climatizada'],
    heatColdBehavior: quente ? 'abre melhor no frio e pode saturar no calor.' : 'segura bem no calor e fica mais linear no frio.',
    socialCompatibility: noturno ? 'menos democrático, mais autoral.' : 'socialmente versátil sem perder assinatura.',
    agePerception: quente ? 'tende a leitura madura.' : 'tende a leitura contemporânea.',
    projectionFatigue: quente ? 'se exagerar, pode cansar após horas.' : 'projeção mais contida, baixo risco de fadiga.',
    saturationRisk: quente ? 'médio-alto' : 'baixo-médio',
  };
}

export function createFragrancePersonalityEngine(product = {}) {
  const pool = collectPool(product);
  const quente = has(pool, ['amber', 'sweet', 'gourmand', 'oud', 'resin', 'spicy']);
  const fresco = has(pool, ['fresh', 'citr', 'marine', 'aquatic', 'clean', 'mint']);
  const noturno = has(pool, ['night', 'noite', 'dark', 'smok', 'leather']);

  return {
    energy: fresco ? 'clean e focada' : 'densa e controlada',
    posture: noturno ? 'dominante sem pressa' : 'segura e socialmente inteligente',
    behavior: noturno ? 'cresce no contato próximo' : 'aparece por camadas',
    socialIntensity: quente ? 'alta em ambientes fechados' : 'média com boa adaptação',
    maturity: quente ? 'madura' : 'moderna',
    vibe: noturno ? 'presença noturna de conversa baixa' : 'assinatura internacional organizada',
    presence: quente ? 'marcante' : 'limpa',
  };
}

export function createDivisiveFragranceResolver(product = {}) {
  const pool = collectPool(product);
  const intense = has(pool, ['oud', 'gourmand', 'sweet', 'smok', 'leather', 'resin']);

  return {
    divisive: intense,
    summary: intense
      ? 'ou você ama a personalidade intensa, ou acha excesso rápido demais.'
      : 'perfil mais democrático, com baixa chance de rejeição imediata.',
    caution: intense
      ? 'quem não gosta de perfumes densos pode cansar com facilidade.'
      : 'difícil incomodar, mas também menos dramático para quem busca impacto.',
  };
}

export function createSaturationAwarenessEngine(product = {}) {
  const pool = collectPool(product);
  const sweet = has(pool, ['sweet', 'gourmand', 'vanilla', 'amber']);
  const intense = has(pool, ['oud', 'resin', 'smok', 'leather', 'spicy']);

  return {
    sweetnessOverloadRisk: sweet,
    olfactiveSaturationRisk: sweet || intense,
    socialFatigueRisk: intense ? 'médio-alto' : 'baixo-médio',
    projectionExcessRisk: intense,
    dosageGuidance: intense ? 'funciona melhor em doses menores.' : 'aceita aplicação padrão sem perder elegância.',
    fatigueNarrative: sweet || intense
      ? 'depois de algumas horas pode ficar denso se aplicado em excesso.'
      : 'permanece confortável ao longo do dia na maior parte dos contextos.',
  };
}

export function createHumanComparativeReadingLayer(product = {}) {
  const pool = collectPool(product);
  const fresco = has(pool, ['fresh', 'citr', 'marine', 'aquatic', 'clean', 'mint']);
  const quente = has(pool, ['amber', 'sweet', 'gourmand', 'oud', 'resin', 'spicy']);

  return [
    fresco ? 'mesma energia de limpeza cara e presença controlada.' : 'vai na direção de luxo discreto com peso de assinatura.',
    quente ? 'mais elegante que explosivo quando bem dosado.' : 'menos agressivo do que muita gente imagina.',
    quente ? 'tem mais presença madura do que vibe jovem.' : 'puxa mais para assinatura internacional do que sedução doce.',
  ];
}

export function createHumanPerfumeReading(product = {}) {
  const pool = collectPool(product);
  const quente = has(pool, ['amber', 'sweet', 'gourmand', 'oud', 'resin', 'spicy']);
  const fresco = has(pool, ['fresh', 'citr', 'marine', 'aquatic', 'clean', 'mint']);
  const noturno = has(pool, ['night', 'noite', 'dark', 'smok', 'leather']);

  const contrast = createEditorialContrastEngine(product);
  const personalityEngine = createFragrancePersonalityEngine(product);
  const divisiveResolver = createDivisiveFragranceResolver(product);
  const saturationEngine = createSaturationAwarenessEngine(product);
  const comparativeReading = createHumanComparativeReadingLayer(product);

  const firstImpression = fresco
    ? 'Abre limpo e direto, sem cara de produto de banheiro.'
    : quente
      ? 'Começa mais encorpado, com calor de pele e presença desde o início.'
      : 'Abre redondo, sem susto, e já mostra personalidade.';

  const behavior = noturno
    ? 'Não grita no primeiro minuto. Cresce perto da pele e fica mais interessante com o tempo.'
    : 'Não invade o ambiente. Vai aparecendo melhor quando a pessoa se aproxima.';

  const context = contrast.heatColdBehavior;

  const personality = `Energia ${personalityEngine.energy}, postura ${personalityEngine.posture}.`;

  const humanOccasion = noturno
    ? 'Camisa escura. Relógio pesado. Depois das 20h.'
    : 'Camisa bem cortada. Agenda cheia. Final de tarde pra noite.';

  const socialImpression = resolveSocialImpression(product);

  const commentary = [
    comparativeReading[0],
    contrast.limitations[0],
    divisiveResolver.summary,
    saturationEngine.dosageGuidance,
  ];

  const discoveryTags = [
    quente ? 'luxo árabe pesado' : 'social de verão',
    fresco ? 'clean expensive' : 'date noturno perigoso',
    'cheiro de homem organizado',
    noturno ? 'perfume de conversa baixa' : 'energia de CEO silencioso',
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
    editorialContrast: contrast,
    fragrancePersonality: personalityEngine,
    divisiveProfile: divisiveResolver,
    saturationProfile: saturationEngine,
    comparativeReading,
    contextualWarnings: contrast.contextualWarnings,
    atmosphericContext: {
      climate: quente ? 'ameno_frio' : 'quente_urbano',
      period: noturno ? 'noite' : 'tarde_noite',
      environment: quente ? 'interno_climatizado' : 'urbano_climatizado',
      vibe: noturno ? 'maduro_noturno' : 'executivo_clean',
    },
  };
}
