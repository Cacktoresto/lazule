import { applyEditorialAntiRepetition } from './editorialIntelligenceSystem.js';

export function createHumanObservationFragments({ profile = {}, context = 'home' } = {}) {
  const lines = [
    profile?.density === 'dense' ? 'Perfumes densos crescem muito no frio.' : 'Seu ciclo recente ficou mais limpo e respirável.',
    profile?.motionCadence === 'dynamic' ? 'Seu gosto alternou mais entre dia e noite nos últimos acessos.' : 'Seu ritmo está consistente, com escolhas mais objetivas.',
    context === 'pdp' ? 'Em ambiente fechado ele projeta mais do que parece.' : 'Hoje vale priorizar presença controlada em vez de volume.',
    'Duas borrifadas já resolvem na maioria dos cenários.',
  ];
  return applyEditorialAntiRepetition(lines).slice(0, 3);
}
