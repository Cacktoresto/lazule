import { useEffect, useMemo, useState } from 'react';

const MICROCOPY_STEPS = [
  'Interpretando sua intenção olfativa…',
  'Mapeando notas, clima e presença…',
  'Buscando assinaturas compatíveis…',
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

    const entryDelay = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(entryDelay);
  }, [isActive]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % MICROCOPY_STEPS.length);
    }, 1300);

    return () => window.clearInterval(intervalId);
  }, [visible]);

  const step = MICROCOPY_STEPS[stepIndex];
  const chips = useMemo(() => interpretedChips.slice(0, 4), [interpretedChips]);

  return (
    <div
      className={`overflow-hidden transition-all duration-400 ${visible ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'} ${className}`}
      aria-hidden={!visible}
    >
      <div className="relative rounded-[1.5rem] border border-lazule-gold/20 bg-gradient-to-br from-lazule-night via-lazule-depth to-[#0a1d3e] px-4 py-4 sm:px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(248,250,252,0.11),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(200,162,77,0.14),transparent_30%)]" />
        <div className="relative space-y-3">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">Curadoria semântica</p>
          <p className="text-sm text-lazule-mist" role="status" aria-live="polite">{step}</p>

          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="Sinais interpretados">
              {chips.map((chip) => (
                <span key={chip} className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[0.68rem] font-medium text-slate-200">
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.06] motion-safe:animate-pulse"
                style={{ animationDelay: `${index * 120}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
