export function AnalyticsSection({ title, eyebrow, children, className = '' }) {
  return (
    <section className={`rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-mineral backdrop-blur md:p-6 ${className}`}>
      <div className="mb-5">
        {eyebrow ? <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-lazule-gold/80">{eyebrow}</p> : null}
        <h2 className="mt-2 font-display text-2xl text-lazule-mist">{title}</h2>
      </div>
      {children}
    </section>
  );
}
