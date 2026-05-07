export function SearchBar({ value, onChange }) {
  return (
    <label className="block w-full" htmlFor="catalog-search">
      <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">
        Pesquisar catálogo
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lazule-gold" aria-hidden="true">
          ⌕
        </span>
        <input
          id="catalog-search"
          className="min-h-12 w-full rounded-full border border-lazule-gold/20 bg-white/[0.075] py-3.5 pl-11 pr-5 text-base text-lazule-mist outline-none ring-0 placeholder:text-slate-400 transition duration-200 hover:border-lazule-gold/40 focus-visible:border-lazule-gold/75 focus-visible:bg-white/[0.10] focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Buscar por Sauvage, Invictus, Dior, árabe..."
          autoComplete="off"
          inputMode="search"
        />
      </span>
    </label>
  );
}
