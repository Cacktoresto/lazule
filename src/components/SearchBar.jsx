import { trackEvent } from '../utils/analytics';

export function SearchBar({ value, onChange, onSubmit, onClear, hasSearch = false }) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <form className="w-full" role="search" aria-label="Refinar fragrâncias no catálogo" onSubmit={handleSubmit}>
      <label className="block w-full" htmlFor="catalog-search">
        <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-lazule-gold sm:tracking-[0.24em]">
          Busca
        </span>
        <input
          id="catalog-search"
          className="min-h-12 w-full rounded-2xl border border-lazule-gold/20 bg-white/[0.075] px-4 py-3 text-[16px] text-lazule-mist outline-none ring-0 placeholder:text-slate-400 transition duration-200 hover:border-lazule-gold/40 focus-visible:border-lazule-gold/75 focus-visible:bg-white/[0.10] focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night sm:rounded-full sm:py-3.5 sm:text-base"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => trackEvent('search_focus', { source_page: 'catalog_search' })}
          placeholder="Busque por perfume, marca ou referência olfativa"
          autoComplete="off"
          inputMode="search"
        />
      </label>

      <div className="mt-3 grid gap-3 sm:flex sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-400">Ex.: Sauvage, Hacivat, presente elegante, noite intensa…</p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          {hasSearch && (
            <button
              className="min-h-11 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition duration-200 hover:border-lazule-gold/50 hover:text-lazule-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
              type="button"
              onClick={onClear}
            >
              Limpar
            </button>
          )}
          <button
            className="lazule-premium-button lazule-cta-shimmer min-h-11 rounded-full bg-lazule-gold px-5 text-sm font-semibold text-lazule-night shadow-aureate"
            type="submit"
          >
            <span className="relative z-10">Refinar</span>
          </button>
        </div>
      </div>
    </form>
  );
}
