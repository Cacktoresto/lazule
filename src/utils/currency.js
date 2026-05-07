const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatBRL(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 'Consulte';
  }

  return brlFormatter.format(numericValue);
}
