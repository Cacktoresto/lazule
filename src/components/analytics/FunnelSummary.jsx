function formatPercent(rate) {
  return `${Math.round((rate || 0) * 100)}%`;
}

export function FunnelSummary({ steps = [] }) {
  return (
    <div className="space-y-4">
      {steps.map((step) => (
        <div key={step.key} className="rounded-[1.35rem] border border-white/10 bg-lazule-night/45 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-lazule-mist">{step.label}</p>
              <p className="mt-1 text-xs text-lazule-mist/55">Avanço da etapa: {formatPercent(step.progressRate)}</p>
            </div>
            <strong className="font-display text-2xl text-lazule-gold">{step.value.toLocaleString('pt-BR')}</strong>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-lazule-blue to-lazule-gold" style={{ width: `${Math.max(4, Math.round((step.relativeWidth || 0) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
