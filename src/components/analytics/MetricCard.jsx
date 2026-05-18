export function MetricCard({ label, value, helper, tone = 'default' }) {
  const toneClasses = tone === 'gold'
    ? 'border-lazule-gold/35 bg-lazule-gold/10 text-lazule-gold'
    : 'border-white/10 bg-white/[0.055] text-lazule-mist';

  return (
    <article className={`lazule-dashboard-card rounded-[1.5rem] border p-5 shadow-mineral backdrop-blur ${toneClasses}`}>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold/85">{label}</p>
      <strong className="mt-3 block font-display text-3xl font-semibold text-inherit">{value}</strong>
      {helper ? <span className="mt-2 block text-xs leading-5 text-lazule-mist/62">{helper}</span> : null}
    </article>
  );
}
