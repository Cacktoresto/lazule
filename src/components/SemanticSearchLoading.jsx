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

    const entryDelay = window.setTimeout(() => setVisible(true), 80);
    return () => window.clearTimeout(entryDelay);
  }, [isActive]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % MICROCOPY_STEPS.length);
    }, 1900);

    return () => window.clearInterval(intervalId);
  }, [visible]);

  const step = MICROCOPY_STEPS[stepIndex];
  const chips = useMemo(() => interpretedChips.slice(0, 6), [interpretedChips]);

  return (
    <div
      className={`overflow-hidden transition-all duration-500 motion-reduce:transition-opacity ${visible ? 'max-h-[34rem] opacity-100' : 'max-h-0 opacity-0'} ${className}`}
      aria-hidden={!visible}
    >
      <div className="lazule-laz-card relative rounded-[1.7rem] border px-4 py-5 shadow-mineral sm:px-6 sm:py-6">
        <div className="lazule-laz-ambient pointer-events-none absolute inset-0 rounded-[inherit]" />

        <div className="relative grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="relative mx-auto h-28 w-28 shrink-0 sm:h-32 sm:w-32" aria-hidden="true">
            <div className="lazule-mineral-halo absolute inset-[-14%]" />
            <div className="lazule-mineral-core absolute inset-0" />
            <div className="lazule-mineral-vein lazule-mineral-vein-a" />
            <div className="lazule-mineral-vein lazule-mineral-vein-b" />
            <div className="lazule-mineral-vein lazule-mineral-vein-c" />
            <span className="lazule-laz-mark absolute inset-0 flex items-center justify-center text-xl font-semibold uppercase text-[#eef6ff]">LAZ</span>
          </div>

          <div className="space-y-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[#b9cfff]">Agente de curadoria olfativa</p>
            <p className="text-sm text-[#edf4ff]" role="status" aria-live="polite">{step}</p>

            <div className="flex flex-wrap gap-2" aria-label="Sinais interpretados">
              {(chips.length ? chips : ['Intenção', 'Presença', 'Assinatura']).map((chip, index) => (
                <span
                  key={chip}
                  className="lazule-semantic-chip rounded-full border border-[#6f91da]/55 bg-[#0e2b63]/68 px-3 py-1 text-[0.68rem] font-medium text-[#e4efff]"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <span
              key={index}
              className="h-9 rounded-xl border border-[#7ca3f6]/28 bg-[#0f2b61]/52 motion-safe:animate-pulse"
              style={{ animationDelay: `${index * 130}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
