import { useEffect, useMemo, useState } from 'react';
import { getAllProducts } from '../data/catalogRepository';
import { buildComparePath, createPerfumeComparison, getComparisonSuggestions } from '../ai/perfumeComparisonEngine.js';
import { createProductPath, createProductSlug } from '../utils/productRouting';
import { applyPageSeo, createCanonicalUrl } from '../utils/seo';
import { ProductImageFallback } from './ProductCard';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getDisplayName(product = {}) {
  return String(product.name || '').split('|').pop().trim() || product.name || 'Perfume';
}

function resolveCompareProducts(compareSlug, catalogProducts) {
  const parts = String(compareSlug || '').split('-vs-').map(normalize).filter(Boolean).slice(0, 4);
  return parts.map((part) => {
    const exact = catalogProducts.find((product) => product.productSlug === part || createProductSlug(product.name) === part);
    if (exact) return exact;
    const partTokens = part.split('-').filter((token) => token.length > 2);
    return catalogProducts.find((product) => {
      const haystack = normalize([product.productSlug, product.name, product.brand, product.olfactoryReference].filter(Boolean).join(' '));
      return partTokens.length && partTokens.every((token) => haystack.includes(token));
    });
  }).filter(Boolean).filter((product, index, list) => list.findIndex((item) => item.productSlug === product.productSlug) === index);
}

function ProductMini({ product, children }) {
  return (
    <article className="min-w-[14rem] flex-1 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 shadow-mineral backdrop-blur">
      <div className="flex gap-3">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-2xl bg-lazule-depth/80">
          {product.image ? <img className="h-full w-full object-contain p-1.5" src={product.image} alt={getDisplayName(product)} loading="lazy" /> : <ProductImageFallback />}
        </div>
        <div>
          <p className="text-[0.62rem] uppercase tracking-[0.25em] text-lazule-gold/85">{product.brand}</p>
          <h3 className="mt-1 font-display text-xl leading-tight text-white">{getDisplayName(product)}</h3>
          {product.salePrice ? <p className="mt-1 text-xs text-slate-300">R$ {Number(product.salePrice).toLocaleString('pt-BR')}</p> : null}
        </div>
      </div>
      {children}
    </article>
  );
}

function ComparisonBars({ comparison }) {
  return (
    <section className="rounded-[2rem] border border-lazule-gold/15 bg-lazule-night/62 p-5 shadow-mineral backdrop-blur sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-lazule-gold">Perfil sensorial</p>
          <h2 className="mt-2 font-display text-3xl text-white">Onde cada perfume vence</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-300">Barras comparativas geradas a partir de acordes, notas, vibe, ocasião, temperatura, performance e perfil semântico já existentes na curadoria.</p>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {comparison.metrics.map((metric) => (
          <div key={metric.key} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-lazule-mist">{metric.label}</h3>
              <span className="text-[0.65rem] uppercase tracking-[0.22em] text-lazule-gold/75">{metric.values.find((value) => value.slug === metric.leaderSlug)?.name}</span>
            </div>
            <div className="space-y-3">
              {metric.values.map((value) => (
                <div key={`${metric.key}-${value.slug}`}>
                  <div className="mb-1 flex justify-between text-xs text-slate-300"><span>{value.name}</span><strong className="text-white">{value.score.toFixed(1)} · {value.label}</strong></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-lazule-blue via-lazule-gold to-white" style={{ width: `${Math.max(12, value.score * 10)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExecutiveSummary({ comparison }) {
  return (
    <section className="rounded-[2.2rem] border border-lazule-gold/20 bg-gradient-to-br from-lazule-night/88 via-lazule-depth/70 to-lazule-blue/20 p-5 shadow-mineral sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.34em] text-lazule-gold">Decisão em 15 segundos</p>
      <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">Se você procura...</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {comparison.summaries.map((summary) => (
          <div key={summary.slug} className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5">
            <p className="text-sm text-slate-300">Escolha</p>
            <h3 className="font-display text-3xl text-lazule-gold">{summary.name}</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-100">
              {summary.reasons.map((reason) => <li key={reason}>✓ {reason}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function SeoForComparison({ products, comparison }) {
  useEffect(() => {
    if (products.length < 2) return;
    const names = products.map(getDisplayName);
    const canonicalPath = buildComparePath(products);
    applyPageSeo({
      title: `${names.join(' vs ')} — comparação LAZULE`,
      description: `Compare ${names.join(' vs ')} em frescor, elegância, versatilidade, uso no calor, projeção e decisão final pela curadoria LAZULE.`,
      canonicalPath,
      type: 'article',
      image: products[0]?.image,
      jsonLd: [{
        id: 'lazule-comparison-jsonld',
        payload: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: `${names.join(' vs ')} — comparação de perfumes`,
          description: comparison.verdict,
          mainEntityOfPage: createCanonicalUrl(canonicalPath),
          about: products.map((product) => ({ '@type': 'Product', name: getDisplayName(product), brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined })),
        },
      }],
    });
  }, [products, comparison]);
  return null;
}

export function PerfumeComparisonPage({ compareSlug }) {
  const catalogProducts = useMemo(() => getAllProducts().filter((product) => product.catalogVisibility !== 'internal'), []);
  const products = useMemo(() => resolveCompareProducts(compareSlug, catalogProducts), [catalogProducts, compareSlug]);
  const comparison = useMemo(() => createPerfumeComparison(products), [products]);

  if (products.length < 2) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-lazule-gold/20 bg-white/[0.04] p-8 text-center shadow-mineral">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-lazule-gold">Comparação LAZULE</p>
          <h1 className="mt-4 font-display text-4xl text-white">Escolha pelo menos dois perfumes</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">Volte para uma página de produto e use “Comparar lado a lado” para montar uma decisão olfativa com perfumes semelhantes.</p>
          <a className="mt-7 inline-flex rounded-full bg-lazule-gold px-6 py-3 text-sm font-semibold text-lazule-night" href="/catalogo">Explorar catálogo</a>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-3 py-10 pb-24 sm:px-6 lg:px-8">
      <SeoForComparison products={products} comparison={comparison} />
      <a className="text-sm font-semibold text-lazule-gold transition hover:text-[#dfbd68]" href="/catalogo">← Voltar ao catálogo</a>
      <header className="mt-6 rounded-[2.4rem] border border-lazule-gold/20 bg-white/[0.04] p-5 shadow-mineral backdrop-blur sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-lazule-gold">Intelligent Comparison Engine</p>
        <h1 className="mt-4 font-display text-4xl text-white sm:text-6xl">{products.map(getDisplayName).join(' vs ')}</h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">{comparison.narrative}</p>
        <div className="mt-7 flex snap-x gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {comparison.products.map((insight) => (
            <ProductMini key={insight.slug} product={insight.product}>
              <div className="mt-4 flex flex-wrap gap-2">
                {[...insight.accords, ...insight.vibe].slice(0, 4).map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.68rem] text-slate-200">{item}</span>)}
              </div>
            </ProductMini>
          ))}
        </div>
      </header>
      <div className="mt-5 space-y-5">
        <ExecutiveSummary comparison={comparison} />
        <ComparisonBars comparison={comparison} />
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-mineral sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-lazule-gold">Explicação IA LAZULE</p>
            <h2 className="mt-2 font-display text-3xl text-white">Leitura interpretativa</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">{comparison.narrative}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {comparison.products.map((insight) => (
                <div key={insight.slug} className="rounded-2xl border border-white/10 bg-lazule-night/45 p-4">
                  <h3 className="font-display text-2xl text-lazule-gold">{insight.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Notas e sinais: {[...insight.notes, ...insight.accords, ...insight.semanticReasons].slice(0, 7).join(', ') || 'perfil olfativo em curadoria'}.</p>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-[2rem] border border-lazule-gold/20 bg-lazule-gold/10 p-5 shadow-mineral sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-lazule-gold">Veredito LAZULE</p>
            <h2 className="mt-2 font-display text-3xl text-white">Qual comprar primeiro?</h2>
            <p className="mt-4 text-sm leading-7 text-slate-100">{comparison.verdict}</p>
          </aside>
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-mineral sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-lazule-gold">Perfil de usuário</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {comparison.summaries.map((summary) => (
              <div key={summary.slug} className="rounded-2xl border border-white/10 bg-lazule-night/45 p-4">
                <h3 className="font-display text-2xl text-white">Escolha {summary.name} se você...</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  {summary.userProfile.map((item) => <li key={item}>✓ {item}</li>)}
                </ul>
                <a className="mt-4 inline-flex text-sm font-semibold text-lazule-gold" href={createProductPath(summary.slug)}>Ver produto →</a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export function ProductCompareEntry({ product, catalogProducts }) {
  const suggestions = useMemo(() => getComparisonSuggestions(product, catalogProducts, 4), [catalogProducts, product]);
  const [selected, setSelected] = useState(() => suggestions.slice(0, 1).map((item) => item.productSlug));

  useEffect(() => {
    setSelected(suggestions.slice(0, 1).map((item) => item.productSlug));
  }, [suggestions]);

  if (!product || !suggestions.length) return null;

  const selectedProducts = [product, ...suggestions.filter((item) => selected.includes(item.productSlug))].slice(0, 4);
  const comparePath = buildComparePath(selectedProducts);

  return (
    <section className="lazule-reveal rounded-[2rem] border border-lazule-gold/18 bg-gradient-to-br from-white/[0.065] via-lazule-night/70 to-lazule-blue/15 p-5 shadow-mineral backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-lazule-gold">Não sabe qual escolher?</p>
          <h2 className="mt-2 font-display text-3xl text-white">Compare lado a lado</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Selecionamos perfumes semelhantes pelo motor de similaridade da LAZULE para transformar dúvida em decisão.</p>
        </div>
        <a className="inline-flex items-center justify-center rounded-full bg-lazule-gold px-5 py-3 text-sm font-semibold text-lazule-night shadow-lg shadow-lazule-gold/15 transition hover:-translate-y-0.5 hover:bg-[#dfbd68]" href={comparePath}>Comparar agora</a>
      </div>
      <div className="mt-5 flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {suggestions.map((item) => {
          const checked = selected.includes(item.productSlug);
          const disabled = !checked && selected.length >= 3;
          return (
            <label key={item.productSlug} className={`min-w-[14rem] cursor-pointer rounded-2xl border p-3 transition ${checked ? 'border-lazule-gold/55 bg-lazule-gold/10' : 'border-white/10 bg-white/[0.04] hover:border-lazule-gold/30'} ${disabled ? 'opacity-55' : ''}`}>
              <input
                className="sr-only"
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => setSelected((current) => (current.includes(item.productSlug) ? current.filter((slug) => slug !== item.productSlug) : [...current, item.productSlug]).slice(0, 3))}
              />
              <div className="flex gap-3">
                <div className="h-16 w-14 overflow-hidden rounded-xl bg-lazule-depth/80">
                  {item.image ? <img className="h-full w-full object-contain p-1" src={item.image} alt={getDisplayName(item)} loading="lazy" /> : <ProductImageFallback />}
                </div>
                <div>
                  <p className="text-[0.62rem] uppercase tracking-[0.22em] text-lazule-gold/80">{item.brand}</p>
                  <h3 className="line-clamp-2 font-display text-xl leading-tight text-white">{getDisplayName(item)}</h3>
                </div>
              </div>
              <span className="mt-3 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[0.68rem] text-slate-200">{checked ? 'Selecionado' : 'Adicionar à comparação'}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
