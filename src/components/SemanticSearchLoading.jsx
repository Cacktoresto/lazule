import { useEffect, useMemo, useState } from 'react';

const MICROCOPY_STEPS = [
  'LAZ está lendo sua intenção olfativa…',
  'Mapeando notas, clima e presença…',
  'Transformando sinais em curadoria semântica…',
];

const DEFAULT_CHIPS = ['Marinho', 'Frescor', 'Clima quente'];
const MIN_VISIBLE_MS = 2800;
const SAFETY_TIMEOUT_MS = 5000;

export function SemanticSearchLoading({ isActive, interpretedChips = [], className = '' }) {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [chipRevealCount, setChipRevealCount] = useState(0);

  const chips = useMemo(() => {
    const shortlist = interpretedChips.slice(0, 3);
    return shortlist.length ? shortlist : DEFAULT_CHIPS;
  }, [interpretedChips]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    setIsRendered(true);
    setIsVisible(true);
    setStepIndex(0);
    setChipRevealCount(0);

    const chipSequenceId = window.setInterval(() => {
      setChipRevealCount((current) => (current < chips.length ? current + 1 : current));
    }, 460);

    const stepSequenceId = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % MICROCOPY_STEPS.length);
    }, 1500);

    const safetyStopId = window.setTimeout(() => {
      setIsVisible(false);
    }, SAFETY_TIMEOUT_MS);

    return () => {
      window.clearInterval(chipSequenceId);
      window.clearInterval(stepSequenceId);
      window.clearTimeout(safetyStopId);
    };
  }, [isActive, chips.length]);

  useEffect(() => {
    if (isActive) {
      return undefined;
    }

    if (!isRendered) {
      return undefined;
    }

    const hideId = window.setTimeout(() => setIsVisible(false), MIN_VISIBLE_MS);
    const unmountId = window.setTimeout(() => setIsRendered(false), MIN_VISIBLE_MS + 560);

    return () => {
      window.clearTimeout(hideId);
      window.clearTimeout(unmountId);
    };
  }, [isActive, isRendered]);

  if (!isRendered) return null;

  const visibleChips = chips.slice(0, chipRevealCount);
  const step = MICROCOPY_STEPS[stepIndex];

  return (
    <div className={`overflow-hidden transition-all duration-500 motion-reduce:transition-opacity ${isVisible ? 'max-h-[36rem] opacity-100' : 'max-h-0 opacity-0'} ${className}`}>
      <div className="lazule-laz-card relative min-h-[220px] rounded-[1.7rem] border px-4 py-5 shadow-mineral sm:min-h-[250px] sm:px-6 sm:py-6" data-testid="laz-mineral-loading">
        <div className="lazule-laz-ambient pointer-events-none absolute inset-0 rounded-[inherit]" />

        <div className="relative grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="lazule-thinking-core relative mx-auto h-[72px] w-[72px] shrink-0 sm:h-24 sm:w-24" aria-hidden="true">
            <div className="lazule-mineral-halo absolute inset-[-16%]" />
            <div className="lazule-mineral-orbit lazule-mineral-orbit-outer" data-testid="laz-orbit" />
            <div className="lazule-mineral-orbit lazule-mineral-orbit-inner" data-testid="laz-orbit" />
            <div className="lazule-mineral-core absolute inset-0" data-testid="laz-mineral-core" />
            <div className="lazule-mineral-vein lazule-mineral-vein-a" />
            <div className="lazule-mineral-vein lazule-mineral-vein-b" />
            <div className="lazule-mineral-vein lazule-mineral-vein-c" />
            <span className="lazule-orbit-chip lazule-orbit-chip-a" />
            <span className="lazule-orbit-chip lazule-orbit-chip-b" />
            <span className="lazule-orbit-chip lazule-orbit-chip-c" />
            <span className="lazule-laz-mark absolute inset-0 flex items-center justify-center text-xl font-semibold uppercase text-[#eef6ff]">LAZ</span>
          </div>

          <div className="space-y-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[#b9cfff]">Curadoria semântica em processamento</p>
            <p className="text-sm text-[#edf4ff]" role="status" aria-live="polite">{step}</p>

            <div className="flex min-h-[2.3rem] flex-wrap gap-2" aria-label="Sinais interpretados">
              {visibleChips.map((chip, index) => (
                <span
                  key={`${chip}-${index}`}
                  className="lazule-semantic-chip rounded-full border border-[#6f91da]/55 bg-[#0e2b63]/68 px-3 py-1 text-[0.68rem] font-medium text-[#e4efff]"
                  style={{ animationDelay: `${index * 140}ms` }}
                >
                  {chip}
                </span>
              ))}
            </div>

            <p className="text-xs text-[#a7bee8] motion-reduce:block motion-safe:hidden">LAZ analisando contexto olfativo para entregar sua curadoria.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
