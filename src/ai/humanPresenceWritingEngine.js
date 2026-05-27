import { applyEditorialAntiRepetition, sanitizeEditorialLanguage } from './editorialIntelligenceSystem.js';

function normalize(value) {
  return String(value || '').toLowerCase();
}

export function buildHumanPresenceReading(product = {}) {
  const pool = normalize([
    product.name,
    product.category,
    product.signature,
    product.olfactoryReference,
    ...(product.vibes || product.vibe || []),
    ...(product.notes || []),
  ].join(' '));

  const coldFavored = /(oud|amber|intense|sweet|doce|vanilla|resin)/.test(pool);
  const office = /(fresh|clean|vetiver|citr|blue|marine)/.test(pool);
  const bold = /(leather|smok|night|black|dark)/.test(pool);

  const whenItWorksBest = applyEditorialAntiRepetition([
    coldFavored ? 'Frio ajuda esse perfume a abrir com mais controle.' : 'Funciona fácil em clima ameno e ambiente interno.',
    office ? 'Ar-condicionado deixa a saída mais limpa e profissional.' : 'Noite com roupa escura costuma encaixar melhor.',
    bold ? 'Evento noturno e presença próxima valorizam a assinatura.' : 'Uso social sem excesso de sprays resolve bem.',
  ]);

  const whenItCanFail = applyEditorialAntiRepetition([
    coldFavored ? 'No calor pesado pode ficar doce demais.' : 'Overspray em espaço fechado vira exagero rápido.',
    bold ? 'Durante o dia casual pode parecer sério demais.' : 'Se você quer passar despercebido, talvez pese.',
    'Quatro sprays ou mais raramente ajudam aqui.',
  ]);

  return {
    whenItWorksBest,
    whenItCanFail,
    socialReading: sanitizeEditorialLanguage(bold ? 'Presença de autoridade calma, fala curta e postura firme.' : 'Imagem de alguém organizado, limpo e difícil de cansar.'),
    whoUsuallyWearsThis: applyEditorialAntiRepetition([
      bold ? 'Perfil noturno' : 'Perfil escritório',
      coldFavored ? 'Colecionador de inverno' : 'Rotina urbana',
      office ? 'Pessoa detalhista' : 'Quem gosta de rastro mais visível',
    ]),
    temperaturePerception: coldFavored ? 'Âmbar quente com fundo seco.' : office ? 'Fresco seco com textura fria.' : 'Madeira seca com calor controlado.',
    presenceDistance: bold ? 'Rastro percebido na sala.' : 'Bolha pessoal com presença constante.',
    fatigueSaturation: coldFavored ? 'Pode cansar no calor e em reaplicação alta.' : 'Uso diário simples, mas overspray incomoda.',
  };
}
