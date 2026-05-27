import { TASTE_ARC } from './tasteArcResolver.js';

const ARC_NARRATIVE = {
  [TASTE_ARC.INITIAL]: 'Sua assinatura ainda está se formando. A LAZULE está começando a perceber seus primeiros caminhos.',
  [TASTE_ARC.IMPACT_SEEKER]: 'Você parece buscar perfumes que chegam antes de você.',
  [TASTE_ARC.REFINEMENT_SHIFT]: 'Sua curadoria recente começou a trocar barulho por presença.',
  [TASTE_ARC.CONTROLLED_SIGNATURE]: 'Seu gosto parece caminhar para assinaturas mais controladas e fáceis de usar.',
  [TASTE_ARC.DARK_MATURITY]: 'Você vem explorando atmosferas mais densas e adultas.',
  [TASTE_ARC.CLEAN_LUXURY_PHASE]: 'Sua assinatura recente se aproxima de uma limpeza mais cara e silenciosa.',
  [TASTE_ARC.EXPERIMENTAL_EXPANSION]: 'Seu repertório está se expandindo. Ainda não há uma assinatura única dominante.',
  [TASTE_ARC.SIGNATURE_CONSOLIDATION]: 'Algumas atmosferas começaram a se repetir o suficiente para formar uma assinatura.',
  [TASTE_ARC.FATIGUE_RESET]: 'Você parece estar se afastando de perfumes muito saturados e buscando mais respiro.',
};

export function resolveTasteEvolutionNarrative({ arc, expansionSignals = [], fatigueSignals = [] } = {}) {
  if (fatigueSignals.length && expansionSignals.length) return 'Sua curadoria recente alterna impacto com respiro, abrindo contraste sem perder identidade.';
  if (expansionSignals.includes('impact_to_controlled')) return 'Seu gosto recente está trocando explosão por controle.';
  return ARC_NARRATIVE[arc] || ARC_NARRATIVE[TASTE_ARC.INITIAL];
}
