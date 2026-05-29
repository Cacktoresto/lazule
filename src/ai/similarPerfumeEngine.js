import { normalizeSearchText } from '../utils/search.js';
import { getLocalCatalogProducts } from '../data/localCatalogAdapter.js';
import { excludeInternalTestProducts } from '../domain/internalTestProduct.js';
import { products as rawProducts } from '../data/products.js';

const GROUP_LIMIT = 8;
const MIN_META_SIGNALS = 2;

function arr(value) { return Array.isArray(value) ? value.filter(Boolean) : []; }
function set(value) { return new Set(arr(value).map((x) => normalizeSearchText(x))); }
function overlapScore(a, b) {
  if (!a.size || !b.size) return 0;
  const common = [...a].filter((x) => b.has(x)).length;
  return common / Math.max(a.size, b.size);
}

function hasEnoughMetadata(product = {}) {
  const signals = [arr(product.accords).length, arr(product.vibeTags).length, arr(product.occasionTags).length, arr(product.weatherTags).length, String(product.family || '').trim() ? 1 : 0]
    .filter((n) => n > 0).length;
  return signals >= MIN_META_SIGNALS;
}

function getPriceBand(price) {
  if (!price) return 'unknown';
  if (price < 250) return 'entry';
  if (price < 450) return 'core';
  return 'premium';
}

function computeSimilarity(base, candidate) {
  const accords = overlapScore(set(base.accords), set(candidate.accords));
  const vibe = overlapScore(set(base.vibeTags), set(candidate.vibeTags));
  const occasion = overlapScore(set(base.occasionTags), set(candidate.occasionTags));
  const weather = overlapScore(set(base.weatherTags), set(candidate.weatherTags));
  const sameFamily = normalizeSearchText(base.family) && normalizeSearchText(base.family) === normalizeSearchText(candidate.family) ? 1 : 0;
  const sameRef = normalizeSearchText(base.olfactoryReference) && normalizeSearchText(base.olfactoryReference) === normalizeSearchText(candidate.olfactoryReference) ? 1 : 0;
  const sameCat = base.normalizedCatalogType === candidate.normalizedCatalogType ? 1 : 0;
  const perfMatch = normalizeSearchText(base.performanceLabel) && normalizeSearchText(base.performanceLabel) === normalizeSearchText(candidate.performanceLabel) ? 1 : 0;
  const confidencePenalty = (candidate.status === 'reference_only' || candidate.catalogVisibility === 'reference') ? 0.15 : 0;

  const high = accords * 0.33 + sameFamily * 0.2 + sameRef * 0.17 + vibe * 0.12 + perfMatch * 0.08 + sameCat * 0.1;
  const comp = vibe * 0.24 + occasion * 0.2 + weather * 0.12 + sameCat * 0.2 + accords * 0.14 + (1 - sameFamily) * 0.1;
  const adv = accords * 0.18 + vibe * 0.14 + occasion * 0.12 + (candidate.normalizedCatalogType === 'nicho' ? 0.28 : 0.08) + (candidate.salePrice > base.salePrice ? 0.14 : 0.05) + (1 - sameRef) * 0.14;

  return {
    high: Math.max(0, high - confidencePenalty),
    comp: Math.max(0, comp - confidencePenalty),
    adv: Math.max(0, adv - confidencePenalty),
    signals: { accords, vibe, occasion, weather, sameFamily, sameRef },
  };
}

function explain(type, signals) {
  if (type === 'highlySimilar') {
    if (signals.sameRef) return 'Compartilha o mesmo DNA fresco ambarado com assinatura muito próxima.';
    if (signals.accords > 0.4) return 'Mantém a mesma espinha olfativa com acordes muito parecidos.';
    return 'Mesma direção olfativa com presença familiar e confortável.';
  }
  if (type === 'complementary') {
    if (signals.vibe > 0.3) return 'Mesma vibe sofisticada com assinatura diferente.';
    if (signals.occasion > 0.25) return 'Funciona nos mesmos momentos, com outra leitura de estilo.';
    return 'Conversa com o mesmo mood, mas entrega personalidade própria.';
  }
  if (signals.sameFamily) return 'Alternativa mais ousada e artística dentro da mesma família olfativa.';
  return 'Direção mais niche e autoral para explorar um território novo.';
}

function pickByDiversity(items, base, limit = 4) {
  const selected = [];
  const brands = new Set();
  const bands = new Set();
  for (const item of items) {
    if (selected.length >= limit) break;
    const brand = item.brand;
    const band = getPriceBand(item.salePrice);
    const shouldPrefer = !brands.has(brand) || !bands.has(band);
    if (shouldPrefer || selected.length < Math.max(2, Math.floor(limit / 2))) {
      selected.push(item);
      brands.add(brand);
      bands.add(band);
    }
  }
  return selected;
}

export function buildSimilarPerfumesArtifact(catalog = getLocalCatalogProducts(rawProducts)) {
  const publicCatalog = excludeInternalTestProducts(catalog).filter((p) => p && p.available !== false && p.catalogVisibility !== 'reference' && p.image);
  const artifact = {};

  for (const base of publicCatalog) {
    const candidates = publicCatalog
      .filter((candidate) => candidate.productSlug !== base.productSlug && hasEnoughMetadata(candidate))
      .map((candidate) => ({ candidate, sim: computeSimilarity(base, candidate) }));

    const toGroup = (key, type) => pickByDiversity(
      candidates
        .filter(({ sim }) => sim[key] > 0.15)
        .sort((a, b) => b.sim[key] - a.sim[key] || a.candidate.name.localeCompare(b.candidate.name, 'pt-BR'))
        .map(({ candidate, sim }) => ({
          slug: candidate.productSlug,
          name: candidate.name,
          brand: candidate.brand,
          image: candidate.image,
          price: candidate.price ?? candidate.salePrice,
          salePrice: candidate.salePrice,
          category: candidate.category,
          catalogType: candidate.catalogType,
          similarityScore: Number(sim[key].toFixed(4)),
          score: Number(sim[key].toFixed(4)),
          explanation: explain(type, sim.signals),
          relationshipType: type,
        })), base, GROUP_LIMIT,
    );

    const highlySimilar = toGroup('high', 'highlySimilar');
    const complementary = toGroup('comp', 'complementary');
    const adventurousAlternatives = toGroup('adv', 'adventurousAlternatives');

    artifact[base.productSlug] = {
      highlySimilar,
      complementary,
      adventurousAlternatives,
    };
  }

  return artifact;
}

export function getSimilarPerfumesForProduct(product, artifact) {
  const entry = artifact?.[product?.productSlug] ?? {};
  return {
    highlySimilar: entry.highlySimilar ?? [],
    complementary: entry.complementary ?? [],
    adventurousAlternatives: entry.adventurousAlternatives ?? [],
  };
}
