import { shouldExposeInMainCatalog } from '../utils/commercialStatus.js';

let referencePerfumesPromise;

export async function loadReferencePerfumes() {
  if (!referencePerfumesPromise) {
    referencePerfumesPromise = import('./enrichedReferencePerfumes.js').then((module) => module.enrichedReferencePerfumes ?? module.default ?? []);
  }

  return referencePerfumesPromise;
}

export async function loadRecommendationKnowledgeBase(catalogProducts = []) {
  const referencePerfumes = await loadReferencePerfumes();
  const seen = new Set();
  return [...catalogProducts, ...referencePerfumes]
    .filter(Boolean)
    .filter((product) => {
      const key = product.productSlug ?? product.id ?? `${product.brand}-${product.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function filterMainCatalogExposure(products = []) {
  return products.filter((product) => shouldExposeInMainCatalog(product));
}
