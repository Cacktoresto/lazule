import {
  ALL_FILTER_VALUE,
  AVAILABILITY_FILTER_OPTIONS,
  CATALOG_TYPE_OPTIONS,
  GENDER_OPTIONS,
  PRICE_RANGES,
  SORT_OPTIONS,
} from '../utils/catalogFilters';

const ALL_VALUE = ALL_FILTER_VALUE;

function getOrderedCatalogTypeOptions(availableCategories) {
  const preferredOptions = CATALOG_TYPE_OPTIONS.filter((category) => availableCategories.includes(category));
  const extraOptions = availableCategories.filter((category) => !CATALOG_TYPE_OPTIONS.includes(category));

  return [ALL_VALUE, ...preferredOptions, ...extraOptions];
}

const IMAGE_OPTIONS = [
  { label: 'Todas', value: 'all' },
  { label: 'Com imagem', value: 'with' },
  { label: 'Sem imagem', value: 'without' },
];

function SelectField({ id, label, value, onChange, options, helper }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-lazule-gold">{label}</span>
      <select
        id={id}
        className="min-h-12 w-full rounded-2xl border border-lazule-gold/15 bg-lazule-night/85 px-4 py-3 text-sm text-lazule-mist outline-none shadow-inner shadow-lazule-blue/10 transition duration-200 hover:border-lazule-gold/35 focus-visible:border-lazule-gold/75 focus-visible:bg-lazule-night focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
      {helper && <span className="mt-2 block text-xs leading-5 text-slate-400">{helper}</span>}
    </label>
  );
}

function FilterContent({ filters, options, onFilterChange, onReset }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <SelectField
          id="category-filter"
          label="Tipo de perfume"
          value={filters.category}
          onChange={(value) => onFilterChange('category', value)}
          options={getOrderedCatalogTypeOptions(options.categories)}
          helper="Organização por curadoria: importados, árabes, nicho e designers."
        />
        <SelectField
          id="gender-filter"
          label="Gênero"
          value={filters.gender}
          onChange={(value) => onFilterChange('gender', value)}
          options={[ALL_VALUE, ...GENDER_OPTIONS.filter((gender) => options.genders.includes(gender))]}
        />
        <SelectField
          id="brand-filter"
          label="Marca"
          value={filters.brand}
          onChange={(value) => onFilterChange('brand', value)}
          options={[ALL_VALUE, ...options.brands]}
        />
        <SelectField
          id="availability-filter"
          label="Disponibilidade"
          value={filters.availabilityStatus}
          onChange={(value) => onFilterChange('availabilityStatus', value)}
          options={AVAILABILITY_FILTER_OPTIONS}
        />
        <SelectField
          id="price-filter"
          label="Faixa de preço"
          value={filters.priceRange}
          onChange={(value) => onFilterChange('priceRange', value)}
          options={PRICE_RANGES}
        />
        <SelectField
          id="sort-filter"
          label="Ordenar por"
          value={filters.sortBy}
          onChange={(value) => onFilterChange('sortBy', value)}
          options={SORT_OPTIONS}
        />
        <SelectField
          id="image-filter"
          label="Imagem"
          value={filters.imageMode}
          onChange={(value) => onFilterChange('imageMode', value)}
          options={IMAGE_OPTIONS}
        />
      </div>

      <button
        className="lazule-premium-button min-h-12 rounded-full border border-lazule-gold/40 bg-lazule-gold/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-lazule-gold transition hover:bg-lazule-gold hover:text-lazule-night focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night sm:tracking-[0.18em]"
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
    <aside className="rounded-[2rem] border border-lazule-gold/15 bg-gradient-to-br from-white/[0.075] via-white/[0.045] to-lazule-blue/10 p-5 shadow-mineral backdrop-blur lg:sticky lg:top-28 lg:p-6">
      <div className="mb-5 hidden lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-lazule-gold">Filtros</p>
        <h3 className="mt-3 font-display text-3xl text-lazule-mist">Curadoria assistida</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Ajuste perfil, disponibilidade e investimento com a calma de uma consultoria de boutique.
        </p>
      </div>

      <details className="lazule-product-accordion group lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-2xl border border-lazule-gold/20 bg-lazule-night/70 px-4 py-3 text-sm font-semibold text-lazule-mist shadow-inner shadow-lazule-blue/10 transition duration-200 hover:border-lazule-gold/45 hover:text-lazule-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lazule-gold focus-visible:ring-offset-2 focus-visible:ring-offset-lazule-night">
          Filtros avançados
          <span className="text-lazule-gold transition group-open:rotate-45">+</span>
        </summary>
        <div className="lazule-product-accordion-panel mt-5">
          <FilterContent filters={filters} options={options} onFilterChange={onFilterChange} onReset={onReset} />
        </div>
      </details>

      <div className="hidden lg:block">
        <FilterContent filters={filters} options={options} onFilterChange={onFilterChange} onReset={onReset} />
      </div>
    </aside>
  );
}
