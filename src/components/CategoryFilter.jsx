export function CategoryFilter({ categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Filtros por categoria">
      {categories.map((category) => {
        const isActive = selectedCategory === category;

        return (
          <button
            className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
              isActive
                ? 'border-lazule-gold bg-lazule-gold text-lazule-night shadow-aureate'
                : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-lazule-gold/60 hover:text-lazule-gold'
            }`}
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
