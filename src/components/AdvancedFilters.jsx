const ALL_VALUE = 'Todos';

const PRICE_RANGES = [
  { label: 'Todos os preços', value: 'all', min: 0, max: Infinity },
  { label: 'Até R$ 200', value: 'until-200', min: 0, max: 200 },
  { label: 'R$ 200 a R$ 300', value: '200-300', min: 200, max: 300 },
  { label: 'R$ 300 a R$ 500', value: '300-500', min: 300, max: 500 },
  { label: 'Acima de R$ 500', value: 'above-500', min: 500, max: Infinity },
];

const SORT_OPTIONS = [
  { label: 'Relevância premium', value: 'featured' },
  { label: 'Menor preço', value: 'price-asc' },
  { label: 'Maior preço', value: 'price-desc' },
  { label: 'A-Z', value: 'name-asc' },
  { label: 'Marca', value: 'brand-asc' },
];

const IMAGE_OPTIONS = [
  { label: 'Todos', value: 'all' },
  { label: 'Com imagem', value: 'with' },
  { label: 'Sem imagem', value: 'without' },
];

function SelectField({ id, label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-lazule-gold">{label}</span>
      <select
        id={id}
        className="w-full rounded-2xl border border-white/10 bg-lazule-night/80 px-4 py-3 text-sm text-lazule-mist outline-none transition focus:border-lazule-gold/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterContent({ filters, options, onFilterChange, onReset }) {
  return (
    <div className="grid gap-5">
      <SelectField
        id="category-filter"
        label="Categoria"
        value={filters.category}
        onChange={(value) => onFilterChange('category', value)}
        options={[ALL_VALUE, ...options.categories]}
      />
      <SelectField
        id="gender-filter"
        label="Gênero"
        value={filters.gender}
        onChange={(value) => onFilterChange('gender', value)}
        options={[ALL_VALUE, ...options.genders]}
      />
      <SelectField
        id="brand-filter"
        label="Marca"
        value={filters.brand}
        onChange={(value) => onFilterChange('brand', value)}
        options={[ALL_VALUE, ...options.brands]}
      />
      <SelectField
        id="price-filter"
        label="Faixa de preço"
        value={filters.priceRange}
        onChange={(value) => onFilterChange('priceRange', value)}
        options={PRICE_RANGES}
      />
      <SelectField
        id="image-filter"
        label="Imagem"
        value={filters.imageMode}
        onChange={(value) => onFilterChange('imageMode', value)}
        options={IMAGE_OPTIONS}
      />
      <SelectField
        id="sort-filter"
        label="Ordenar por"
        value={filters.sortBy}
        onChange={(value) => onFilterChange('sortBy', value)}
        options={SORT_OPTIONS}
      />

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
        <input
          className="h-4 w-4 accent-lazule-gold"
          type="checkbox"
          checked={filters.availableOnly}
          onChange={(event) => onFilterChange('availableOnly', event.target.checked)}
        />
        Apenas pronta entrega
      </label>

      <button
        className="rounded-full border border-lazule-gold/40 px-5 py-3 text-sm font-semibold text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night"
        type="button"
        onClick={onReset}
      >
        Limpar filtros
      </button>
    </div>
  );
}

export { ALL_VALUE, PRICE_RANGES };

export function AdvancedFilters({ filters, options, onFilterChange, onReset }) {
  return (
    <aside className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-mineral backdrop-blur lg:sticky lg:top-28 lg:p-6">
      <div className="mb-5 hidden lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-lazule-gold">Filtros</p>
        <h3 className="mt-3 font-display text-3xl text-lazule-mist">Curadoria inteligente</h3>
      </div>

      <details className="group lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-white/10 bg-lazule-night/60 px-4 py-3 text-sm font-semibold text-lazule-mist">
          Filtros avançados
          <span className="text-lazule-gold transition group-open:rotate-45">+</span>
        </summary>
        <div className="mt-5">
          <FilterContent filters={filters} options={options} onFilterChange={onFilterChange} onReset={onReset} />
        </div>
      </details>

      <div className="hidden lg:block">
        <FilterContent filters={filters} options={options} onFilterChange={onFilterChange} onReset={onReset} />
      </div>
    </aside>
  );
}
