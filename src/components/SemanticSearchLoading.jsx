import { useEffect, useMemo, useState } from 'react';

const MICROCOPY_STEPS = [
  'LAZ está lendo sua intenção olfativa…',
  'Mapeando notas, clima e presença…',
  'Refinando sua curadoria…',
];

export function SemanticSearchLoading({ isActive, interpretedChips = [], className = '' }) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setVisible(false);
      setStepIndex(0);
      return undefined;
    }

    const entryDelay = window.setTimeout(() => setVisible(true), 140);
    return () => window.clearTimeout(entryDelay);
  }, [isActive]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % MICROCOPY_STEPS.length);
    }, 1850);

    return () => window.clearInterval(intervalId);
  }, [visible]);

  const step = MICROCOPY_STEPS[stepIndex];
  const chips = useMemo(() => interpretedChips.slice(0, 6), [interpretedChips]);

  return (
    <div
      className={`overflow-hidden transition-all duration-500 motion-reduce:transition-opacity ${visible ? 'max-h-[30rem] opacity-100' : 'max-h-0 opacity-0'} ${className}`}
      aria-hidden={!visible}
    >
      <div className="relative rounded-[1.7rem] border border-lazule-gold/30 bg-gradient-to-br from-[#081227] via-lazule-night to-[#0a1d3e] px-4 py-5 shadow-mineral sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_18%_22%,rgba(148,191,255,0.16),transparent_40%),radial-gradient(circle_at_82%_8%,rgba(200,162,77,0.14),transparent_30%)]" />

        <div className="relative grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="relative mx-auto h-24 w-24 shrink-0 sm:h-28 sm:w-28" aria-hidden="true">
            <div className="lazule-mineral-core absolute inset-0" />
            <div className="lazule-mineral-vein lazule-mineral-vein-a" />
            <div className="lazule-mineral-vein lazule-mineral-vein-b" />
            <div className="lazule-mineral-vein lazule-mineral-vein-c" />
            <span className="lazule-laz-mark absolute inset-0 flex items-center justify-center text-lg font-semibold uppercase tracking-[0.34em] text-[#eef4ff]">LAZ</span>
          </div>

          <div className="space-y-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-lazule-gold">Agente de curadoria</p>
            <p className="text-sm text-lazule-mist" role="status" aria-live="polite">{step}</p>

            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-2" aria-label="Sinais interpretados">
                {chips.map((chip, index) => (
                  <span
                    key={chip}
                    className="lazule-semantic-chip rounded-full border border-lazule-gold/30 bg-white/[0.07] px-3 py-1 text-[0.68rem] font-medium text-slate-100"
                    style={{ animationDelay: `${index * 120}ms` }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <span
              key={index}
              className="h-9 rounded-xl border border-white/10 bg-white/[0.06] motion-safe:animate-pulse"
              style={{ animationDelay: `${index * 130}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
