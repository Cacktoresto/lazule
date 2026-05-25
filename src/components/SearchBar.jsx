import { trackEvent } from '../utils/analytics';

export function SearchBar({ value, onChange, onSubmit, onClear, hasSearch = false }) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <form className="w-full" role="search" aria-label="Refinar fragrâncias no catálogo" onSubmit={handleSubmit}>
      <label className="block w-full" htmlFor="catalog-search">
        <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#a9bbe0] sm:tracking-[0.24em]">
          Busca
        </span>
        <input
          id="catalog-search"
          className="laz-breathe min-h-12 w-full rounded-2xl border-glass surface-lazule-glass px-4 py-3 text-[16px] text-[var(--laz-text-main)] outline-none ring-0 placeholder:text-[var(--laz-text-muted)] transition duration-300 hover:border-[#95b4ec66] focus-visible:border-[#8fb3ffcc] focus-visible:bg-[#122445d6] focus-visible:ring-2 focus-visible:ring-[#5a8eff8a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d1d] sm:rounded-full sm:py-3.5 sm:text-base"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => trackEvent('search_focus', { source_page: 'catalog_search' })}
          placeholder="Descreva sua atmosfera: noite mineral, assinatura limpa, presença marcante…"
          autoComplete="off"
          inputMode="search"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:flex sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-400">Ex.: Sauvage, Hacivat, presente elegante, noite intensa…</p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          {hasSearch && (
            <button
              className="min-h-11 rounded-full border-glass surface-lazule-soft px-4 text-sm font-semibold text-[#d3def4] transition duration-200 hover:border-[var(--laz-border-premium)] hover:text-[#efe1c1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5a8eff94] focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
              type="button"
              onClick={onClear}
            >
              Limpar
            </button>
          )}
          <button
            className="lazule-premium-button lazule-cta-shimmer min-h-11 rounded-full border-mineral surface-lazule-card laz-hover-lift px-5 text-sm font-semibold text-[#ecf2ff] shadow-mineral hover:border-[#b79249aa] hover:text-[#f8f2e4]"
            type="submit"
          >
            <span className="relative z-10">Refinar</span>
          </button>
        </div>
      </div>
    </form>
  );
}
