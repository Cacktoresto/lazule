export const SEMANTIC_VOCABULARY = {
  oceano: { accords: ['marine', 'aquatic', 'ozonic', 'salty', 'blue fresh'], vibes: ['clean', 'airy', 'expansive'], weather: ['hot'], families: ['blue fragrances'], moods: ['freedom', 'freshness'], occasions: ['daytime', 'beach'], negatives: ['heavy leather', 'dense tobacco', 'syrupy gourmand'], intensity: { soft: ['airy marine'], medium: ['salty aquatic'], intense: ['ozonic marine burst'] } },
  marinho: { accords: ['marine', 'aquatic', 'salty'], vibes: ['fresh', 'windy'], weather: ['hot'], families: ['aquatic marine'], moods: ['vacation'], occasions: ['daytime'] },
  banho: { accords: ['soapy', 'white musk', 'fresh clean'], vibes: ['post bath', 'clean skin'], weather: ['hot', 'mild'], families: ['musky fresh'], moods: ['comfort'], occasions: ['daytime', 'office'], negatives: ['beast mode', 'intense smoke', 'dark syrupy amber'] },
  limpo: { accords: ['soapy', 'musky', 'fresh'], vibes: ['minimal', 'airy'], weather: ['hot', 'mild'], families: ['clean fresh'], moods: ['clarity'], occasions: ['office'] },
  doce: { accords: ['vanilla', 'gourmand', 'sweet'], vibes: ['creamy', 'cozy'], weather: ['cold', 'mild'], families: ['gourmand amber'], moods: ['comfort', 'attraction'], occasions: ['night', 'date'], intensity: { soft: ['soft sweet skin scent'], medium: ['creamy vanilla'], intense: ['syrupy gourmand'] } },
  especiado: { accords: ['warm spicy', 'spicy', 'cardamom'], vibes: ['intense', 'warm'], weather: ['cold'], families: ['spicy amber'], moods: ['energy'], occasions: ['night'] },
  couro: { accords: ['leather', 'dark woods', 'smoky'], vibes: ['mysterious', 'dark'], weather: ['cold'], families: ['leathery dark'], moods: ['power'], occasions: ['night'] },
  balada: { accords: ['amber', 'woody spicy'], vibes: ['loud', 'clubbing', 'high projection'], weather: ['mild', 'cold'], families: ['nightlife signature'], moods: ['impact'], occasions: ['night', 'party'], negatives: ['skin scent intimista', 'office clean minimal'] },
  presenca: { accords: ['woody amber', 'spicy'], vibes: ['assertive', 'projecting'], weather: ['mild', 'cold'], families: ['signature loud'], moods: ['confidence'], occasions: ['formal', 'night'] },
  rico: { accords: ['woody', 'amber', 'musk'], vibes: ['clean luxury', 'executive', 'refined'], weather: ['mild', 'cold'], families: ['woody executive'], moods: ['status'], occasions: ['office', 'upscale social'] },
  elegante: { accords: ['woody', 'iris', 'amber'], vibes: ['refined', 'discreet'], weather: ['mild', 'cold'], families: ['executive floral woody'], moods: ['poise'], occasions: ['office', 'formal'] },
  trabalho: { accords: ['woody aromatic', 'citrus', 'musk'], vibes: ['professional', 'clean'], weather: ['hot', 'mild'], families: ['office fresh woody'], moods: ['focus'], occasions: ['office'] },
  confortavel: { accords: ['musk', 'soft woods', 'vanilla'], vibes: ['cozy', 'skin scent'], weather: ['mild', 'cold'], families: ['comfort musk'], moods: ['hug'], occasions: ['casual', 'date'] },
  praia: { accords: ['marine', 'aquatic', 'citrus', 'salty'], vibes: ['sunlit', 'tropical'], weather: ['hot'], families: ['beach aquatic'], moods: ['vacation'], occasions: ['daytime', 'resort'] },
  tropical: { accords: ['fruity', 'coconut', 'mango', 'solar'], vibes: ['juicy', 'beachy'], weather: ['hot'], families: ['tropical fruity'], moods: ['young energy'], occasions: ['daytime', 'resort'] },
  azul: { accords: ['blue fresh', 'aquatic fresh', 'citrus fresh'], vibes: ['moderno', 'limpo'], weather: ['hot', 'mild'], families: ['blue fragrances', 'clean luxury'], moods: ['confiança'], occasions: ['office', 'social'] },
  sensual: { accords: ['amber', 'musky skin', 'warm sweet'], vibes: ['intimate', 'night'], weather: ['mild', 'cold'], families: ['sensual amber musk'], moods: ['attraction'], occasions: ['date', 'night'] },
  minimalista: { accords: ['clean musk', 'soft citrus'], vibes: ['quiet luxury', 'discreet'], weather: ['mild', 'hot'], families: ['minimal clean'], moods: ['calm'], occasions: ['office', 'daytime'] },
};

export const SEMANTIC_PHRASES = {
  'cheiro de oceano': ['oceano'],
  'cheiro de praia': ['praia', 'oceano', 'tropical'],
  'cheiro de verao': ['praia', 'tropical', 'limpo'],
  'cheiro de banho': ['banho', 'limpo'],
  'cheiro de roupa limpa': ['banho', 'limpo', 'minimalista'],
  'perfume de homem rico': ['rico', 'elegante', 'trabalho'],
  'perfume elegante': ['elegante', 'rico'],
  'perfume de escritorio': ['trabalho', 'limpo', 'elegante'],
  'perfume de balada': ['balada', 'presenca', 'sensual'],
  'perfume de presenca': ['presenca', 'balada'],
  'perfume confortavel': ['confortavel', 'limpo', 'sensual'],
  'perfume acolhedor': ['confortavel', 'doce'],
  'perfume sexy': ['sensual', 'presenca'],
  'perfume serio': ['trabalho', 'elegante', 'minimalista'],
  'perfume sofisticado': ['elegante', 'rico', 'minimalista'],
  'perfume para calor': ['praia', 'oceano', 'limpo'],
  'perfume para frio': ['doce', 'especiado', 'sensual'],
  'perfume de ferias': ['tropical', 'praia'],
  'perfume assinatura': ['presenca', 'elegante'],
  'perfume de luxo silencioso': ['minimalista', 'elegante', 'limpo'],
  'perfume azul': ['azul', 'oceano', 'limpo'],
};

export const SEMANTIC_ATMOSPHERE_GRAPH = {
  oceano: [{ to: 'mar', weight: 0.96, intensity: 0.9 }, { to: 'maresia', weight: 0.92, intensity: 0.88 }],
  mar: [{ to: 'sal', weight: 0.82, intensity: 0.72 }, { to: 'praia', weight: 0.76, intensity: 0.7 }],
  maresia: [{ to: 'vento fresco', weight: 0.81, intensity: 0.76 }, { to: 'pele limpa', weight: 0.72, intensity: 0.66 }],
  praia: [{ to: 'resort', weight: 0.83, intensity: 0.74 }, { to: 'verao', weight: 0.86, intensity: 0.85 }],
  verao: [{ to: 'blue fragrance', weight: 0.78, intensity: 0.68 }],
  'homem rico': [{ to: 'roupa social', weight: 0.88, intensity: 0.8 }, { to: 'hotel caro', weight: 0.86, intensity: 0.75 }],
  'roupa social': [{ to: 'executivo moderno', weight: 0.84, intensity: 0.8 }],
  'executivo moderno': [{ to: 'luxo limpo', weight: 0.9, intensity: 0.82 }, { to: 'madeira refinada', weight: 0.74, intensity: 0.7 }],
  'luxo limpo': [{ to: 'clean luxury', weight: 0.94, intensity: 0.86 }],
};

export const SEMANTIC_HUMAN_TERMS = [
  'aconchegante','elegante','sofisticado','refinado','limpo','explosivo','confortavel','serio','maduro','sexy','misterioso','luminoso','escuro','tropical','solar','frio','quente','metalico','cremoso','sedoso','intenso','suave','fresco','arejado','envolvente','minimalista','premium','discreto','luxuoso','moderno','classico','noturno','expansivo','intimista','energetico','provocativo','relaxante','vivido','urbano','silencioso','dominante','executivo'
];
