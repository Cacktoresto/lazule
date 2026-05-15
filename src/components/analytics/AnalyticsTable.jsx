export function AnalyticsTable({ columns = [], rows = [], emptyLabel = 'Sem dados suficientes.' }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-white/10 bg-lazule-night/40 p-4 text-sm text-lazule-mist/58">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-lazule-night/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/[0.035] text-[0.68rem] uppercase tracking-[0.24em] text-lazule-gold/80">
            <tr>
              {columns.map((column) => <th key={column.key} className="px-4 py-3 font-semibold">{column.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 text-lazule-mist/78">
            {rows.map((row, rowIndex) => (
              <tr key={row.key || rowIndex}>
                {columns.map((column) => <td key={column.key} className="px-4 py-3">{column.render ? column.render(row) : row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
