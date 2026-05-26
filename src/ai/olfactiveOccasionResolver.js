const OCCASION_PRESETS = {
  executivo: { occasion: 'executivo', presence: 'clean-precise', recommendationBias: ['fresh_executive', 'clean_luxury'], narrativeTone: 'presenca_executiva' },
  diaria: { occasion: 'assinatura_diaria', presence: 'silent-mineral', recommendationBias: ['mineral_aquatic', 'clean_luxury'], narrativeTone: 'presenca_diaria' },
  noite: { occasion: 'noite_sofisticada', presence: 'amber-signature', recommendationBias: ['warm_amber', 'refined_woods'], narrativeTone: 'sofisticacao_noturna' },
  introspeccao: { occasion: 'introspeccao', presence: 'resinous-dark', recommendationBias: ['dark_seductive', 'cozy_comfort'], narrativeTone: 'profundidade_introspectiva' },
  social: { occasion: 'social', presence: 'radiant-elegant', recommendationBias: ['intimate_signature', 'clean_luxury'], narrativeTone: 'sociabilidade_silenciosa' },
};

export function resolveOlfactiveOccasion({ context = 'daily', moment = 'balanced', season = 'verao', userIntent = 'silent-elegance' } = {}) {
  if (context === 'work' || userIntent.includes('executive')) return OCCASION_PRESETS.executivo;
  if (moment === 'madrugada' || userIntent.includes('introspective')) return OCCASION_PRESETS.introspeccao;
  if (context === 'social' || context === 'date') return OCCASION_PRESETS.social;
  if (moment === 'noite' || season === 'inverno') return OCCASION_PRESETS.noite;
  return OCCASION_PRESETS.diaria;
}
