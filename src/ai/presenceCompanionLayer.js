const COMPANION_FRAGMENTS = {
  dense_nocturnal: 'Atmosferas mais densas continuam retornando às suas noites recentes.',
  mineral_silent: 'Sua presença recente permanece mineral e silenciosa.',
  sophisticated_continuity: 'A LAZULE percebe uma continuidade sofisticada nas suas explorações.',
  contemplative_cycle: 'Seu ciclo recente permanece contemplativo, com evolução lenta e precisa.',
};

export function resolvePresenceCompanionNarrative({ moment, rhythm, timeline } = {}) {
  if (timeline?.trend === 'densifying' || moment?.density === 'dense') return COMPANION_FRAGMENTS.dense_nocturnal;
  if (moment?.signature === 'mineral' || timeline?.dominantSignature === 'mineral') return COMPANION_FRAGMENTS.mineral_silent;
  if (rhythm?.key === 'contemplative') return COMPANION_FRAGMENTS.contemplative_cycle;
  return COMPANION_FRAGMENTS.sophisticated_continuity;
}

export function buildPresenceCompanionLayer(context = {}) {
  return {
    key: 'sensory_presence_companion',
    visibility: 'rare',
    tone: 'refined_silent_editorial',
    narrative: resolvePresenceCompanionNarrative(context),
  };
}
