export function inferSensoryMemory(items = []) {
  const names = items.map((item) => String(item.name || '').toLowerCase()).join(' ');

  return {
    cleanVsDark: /(bleu|prada|marine|acqua)/.test(names) ? 'clean' : 'balanced',
    socialSignature: /(oud|intense|elixir)/.test(names) ? 'marcante' : 'controlada',
    trajectory: /(fresh|clean|acqua)/.test(names) ? 'frescor sofisticado' : 'assinatura sofisticada',
  };
}
