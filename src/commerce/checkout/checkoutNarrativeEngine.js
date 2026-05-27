export function buildCheckoutNarrative({ items = [], profile = {} }) {
  const count = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const trajectory = profile.trajectory || 'sofisticada e contínua';

  return {
    eyebrow: 'Sua curadoria',
    title: count > 1 ? 'Sua seleção está pronta para continuar.' : 'Sua presença está pronta para continuar.',
    description: `Uma etapa final, silenciosa e segura para manter sua trajetória ${trajectory}.`,
  };
}
