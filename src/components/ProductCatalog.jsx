import { useMemo, useState } from 'react';
import { products } from '../data/products';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { SearchBar } from './SearchBar';

const ALL_CATEGORIES = 'Todos';

export function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);

  const categories = useMemo(() => {
    const uniqueCategories = products.map((product) => product.category);
    return [ALL_CATEGORIES, ...new Set(uniqueCategories)];
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = selectedCategory === ALL_CATEGORIES || product.category === selectedCategory;
      const searchableText = [
        product.name,
        product.brand,
        product.category,
        product.gender,
        product.description,
        product.olfactoryReference,
        ...product.badges,
      ]
        .join(' ')
        .toLowerCase();

      return matchesCategory && searchableText.includes(normalizedSearch);
    });
  }, [searchTerm, selectedCategory]);

  return (
    <section id="catalogo" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
      <div className="mb-10 max-w-3xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.38em] text-lazule-gold">
          Catálogo premium
        </p>
        <h2 className="font-display text-4xl text-lazule-mist sm:text-5xl">Escolha sua próxima assinatura olfativa.</h2>
        <p className="mt-5 text-base leading-7 text-slate-300">
          Produtos selecionados para atendimento personalizado. Consulte disponibilidade pelo WhatsApp antes de finalizar seu pedido.
        </p>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-10 text-center">
          <h3 className="font-display text-3xl text-lazule-mist">Nenhuma fragrância encontrada.</h3>
          <p className="mt-3 text-slate-300">Tente buscar por outro perfume, marca ou categoria.</p>
        </div>
      )}
    </section>
  );
}
