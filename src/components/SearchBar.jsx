export function SearchBar({ value, onChange }) {
  return (
    <label className="block w-full">
      <span className="sr-only">Buscar fragrâncias</span>
      <input
        className="w-full rounded-full border border-white/10 bg-white/[0.06] px-5 py-3.5 text-lazule-mist outline-none ring-0 placeholder:text-slate-400 transition focus:border-lazule-gold/70 focus:bg-white/[0.09]"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Busque por perfume, marca ou referência olfativa (Sauvage, Hacivat, Erba Pura)..."
      />
    </label>
  );
}
