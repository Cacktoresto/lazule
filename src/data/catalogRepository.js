import { getLocalCatalogProducts } from './localCatalogAdapter.js';
import { fetchSupabaseCatalogProducts } from './supabaseCatalogAdapter.js';
import { getSupabaseConfig } from './supabaseClient.js';

const LOCAL_SOURCE = 'local';
const SUPABASE_SOURCE = 'supabase';

function getEnvValue(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return import.meta.env[key];
  }

  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }

  return '';
}

export function getCatalogSource(env = {}) {
  const source = String(env.VITE_CATALOG_SOURCE ?? getEnvValue('VITE_CATALOG_SOURCE') ?? LOCAL_SOURCE)
    .trim()
    .toLowerCase();

  return source === SUPABASE_SOURCE ? SUPABASE_SOURCE : LOCAL_SOURCE;
}

export function shouldUseSupabaseCatalog(env = {}) {
  return getCatalogSource(env) === SUPABASE_SOURCE && getSupabaseConfig(env).isConfigured;
}

export async function getCatalogProductsFromRepository({ env = {}, supabaseClient, onError } = {}) {
  if (!shouldUseSupabaseCatalog(env)) {
    return getLocalCatalogProducts();
  }

  try {
    const products = await fetchSupabaseCatalogProducts({ client: supabaseClient });
    return products.length ? products : getLocalCatalogProducts();
  } catch (error) {
    if (typeof onError === 'function') {
      onError(error);
    }

    return getLocalCatalogProducts();
  }
}

export async function getAllProducts(options = {}) {
  return getCatalogProductsFromRepository(options);
}

export { getLocalCatalogProducts };

const catalogRepository = Object.assign(getAllProducts, {
  getAllProducts,
  getCatalogProducts: getAllProducts,
  getCatalogProductsFromRepository,
  getCatalogSource,
  getLocalCatalogProducts,
  shouldUseSupabaseCatalog,
});

export default catalogRepository;
