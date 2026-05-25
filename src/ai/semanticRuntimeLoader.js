const moduleCache = new Map();

function loadCached(key, importer) {
  if (!moduleCache.has(key)) {
    moduleCache.set(key, importer().catch((error) => {
      moduleCache.delete(key);
      throw error;
    }));
  }

  return moduleCache.get(key);
}

export function loadSearchRuntime() {
  return Promise.all([
    loadCached('semanticQueryUnderstanding', () => import('./semanticQueryUnderstanding.js')),
    loadCached('queryLockedFallback', () => import('./queryLockedFallback.js')),
    loadCached('olfactiveEmbeddingAdapter', () => import('./olfactiveEmbeddingAdapter.js')),
  ]).then(([queryUnderstanding, queryLockedFallback, olfactiveEmbeddingAdapter]) => ({
    queryUnderstanding,
    queryLockedFallback,
    olfactiveEmbeddingAdapter,
  }));
}

export function loadProductExperienceRuntime() {
  return Promise.all([
    loadCached('perfumeExperience', () => import('./perfumeExperience.js')),
    loadCached('olfactiveRelationships', () => import('./olfactiveRelationships.js')),
    loadCached('similarPerfumeEngine', () => import('./similarPerfumeEngine.js')),
  ]).then(([perfumeExperience, olfactiveRelationships, similarPerfumeEngine]) => ({
    perfumeExperience,
    olfactiveRelationships,
    similarPerfumeEngine,
  }));
}

export function loadRecommendationRuntime() {
  return loadCached('recommendationEngine', () => import('./recommendationEngine.js'));
}

export function getSemanticRuntime() {
  return Promise.all([loadSearchRuntime(), loadProductExperienceRuntime(), loadRecommendationRuntime()]).then(([search, product, recommendation]) => ({ search, product, recommendation }));
}

export function preloadSemanticRuntime() {
  if (typeof window === 'undefined') return;

  const preload = () => {
    void loadSearchRuntime();
    void loadProductExperienceRuntime();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preload, { timeout: 1800 });
    return;
  }

  window.setTimeout(preload, 600);
}
