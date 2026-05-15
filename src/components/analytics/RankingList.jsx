export function RankingList({ items = [], title, getPrimary, getSecondary, getValue, emptyLabel = 'Sem dados suficientes.' }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-lazule-night/40 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-lazule-gold/85">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-lazule-mist/58">{emptyLabel}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={`${getPrimary(item)}-${index}`} className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-lazule-mist">{getPrimary(item)}</p>
                {getSecondary ? <p className="mt-1 truncate text-xs text-lazule-mist/55">{getSecondary(item)}</p> : null}
              </div>
              <strong className="shrink-0 rounded-full border border-lazule-gold/25 bg-lazule-gold/10 px-3 py-1 text-xs text-lazule-gold">{getValue(item)}</strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
