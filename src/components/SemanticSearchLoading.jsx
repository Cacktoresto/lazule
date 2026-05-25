import { useEffect, useMemo, useState } from 'react';

const MICROCOPY_STEPS = [
  'Interpretando atmosfera…',
  'Mapeando presença e textura…',
  'Refinando assinatura olfativa…',
  'Curadoria quase pronta…',
];

const DEFAULT_CHIPS = ['Marinho', 'Frescor', 'Clima quente'];
export function SemanticSearchLoading({
  isActive,
  interpretedChips = [],
  className = '',
  phase = 'processing',
  isVisible = true,
  fadeDurationMs = 420,
  query = '',
}) {
  const [isRendered, setIsRendered] = useState(false);
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
    setStepIndex(0);
    setChipRevealCount(0);

    const chipSequenceId = window.setInterval(() => {
      setChipRevealCount((current) => (current < chips.length ? current + 1 : current));
    }, 460);

    const stepSequenceId = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % MICROCOPY_STEPS.length);
    }, 1500);

    return () => {
      window.clearInterval(chipSequenceId);
      window.clearInterval(stepSequenceId);
    };
  }, [isActive, chips.length]);

  useEffect(() => {
    if (isActive) {
      return undefined;
    }

    if (!isRendered) {
      return undefined;
    }

    const unmountId = window.setTimeout(() => setIsRendered(false), Math.max(260, fadeDurationMs + 60));

    return () => {
      window.clearTimeout(unmountId);
    };
  }, [fadeDurationMs, isActive, isRendered]);

  if (!isRendered) return null;

  const visibleChips = phase === 'finalizing' ? chips : chips.slice(0, chipRevealCount);
  const step = MICROCOPY_STEPS[stepIndex];
  const coreIntensityClass = phase === 'finalizing' ? 'lazule-core-finalizing' : phase === 'converging' ? 'lazule-core-converging' : '';

  return (
    <div className={`overflow-hidden transition-all motion-reduce:transition-opacity ${isVisible ? 'max-h-[36rem] opacity-100' : 'max-h-0 opacity-0'} ${className}`} style={{ transitionDuration: `${fadeDurationMs}ms` }}>
      <div className="lazule-laz-card relative min-h-[220px] rounded-[1.7rem] border px-4 py-5 shadow-mineral sm:min-h-[250px] sm:px-6 sm:py-6" data-testid="laz-mineral-loading">
        <div className="lazule-laz-ambient pointer-events-none absolute inset-0 rounded-[inherit]" />

        <div className="relative grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className={`lazule-thinking-core ${coreIntensityClass} relative mx-auto h-[72px] w-[72px] shrink-0 sm:h-24 sm:w-24`} aria-hidden="true">
            <div className="lazule-mineral-halo absolute inset-[-16%]" />
            <div className="lazule-mineral-orbit lazule-mineral-orbit-outer" data-testid="laz-orbit" />
            <div className="lazule-mineral-orbit lazule-mineral-orbit-inner" data-testid="laz-orbit" />
            <div className="lazule-mineral-refraction" />
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

            <div className="lazule-semantic-orbit-grid min-h-[2.5rem]" aria-label="Sinais interpretados">
              {visibleChips.map((chip, index) => (
                <span
                  key={`${chip}-${index}`}
                  className={`lazule-semantic-chip lazule-semantic-orbit lazule-semantic-orbit-${(index % 4) + 1} rounded-full border border-[#6f91da]/55 bg-[#0e2b63]/68 px-3 py-1 text-[0.68rem] font-medium text-[#e4efff]`}
                  style={{ animationDelay: `${index * 180}ms` }}
                >
                  {chip}
                </span>
              ))}
            </div>

            <p className="text-xs text-[#a7bee8] motion-reduce:block motion-safe:hidden">LAZ analisando contexto olfativo para entregar sua curadoria.</p>
            {query ? <p className="text-[0.68rem] text-[#9cb8ea]">Intenção ativa: <span className="text-[#dce9ff]">{query}</span></p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
