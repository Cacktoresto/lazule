export function SearchBar({ value, onChange, onSubmit, onClear, hasSearch = false }) {
  return (
    <form className="w-full" role="search" aria-label="Pesquisar fragrâncias no catálogo" onSubmit={onSubmit}>
      <label className="block w-full" htmlFor="catalog-search">
        <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-lazule-gold sm:tracking-[0.24em]">
          Busca
        </span>
        <span className="relative block">
          <input
            id="catalog-search"
            className="min-h-12 w-full rounded-2xl border border-lazule-gold/20 bg-white/[0.075] px-4 py-3.5 text-base text-lazule-mist outline-none ring-0 placeholder:text-slate-400 transition duration-200 hover:border-lazule-gold/40 focus-visible:border-lazule-gold/75 focus-visible:bg-white/[0.10] focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night sm:rounded-full sm:pr-44"
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Busque por perfume, marca ou referência olfativa"
            autoComplete="off"
            inputMode="search"
          />
          <span className="mt-3 grid gap-2 sm:absolute sm:right-2 sm:top-1/2 sm:mt-0 sm:flex sm:-translate-y-1/2">
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
              <span className="relative z-10">Pesquisar</span>
            </button>
          </span>
        </span>
      </label>
      <p className="mt-3 text-xs leading-5 text-slate-400">Ex.: Sauvage, Invictus, Hacivat, Erba Pura...</p>
    </form>
  );
}
