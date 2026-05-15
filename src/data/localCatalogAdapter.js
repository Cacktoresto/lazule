import { products as localProducts } from './products.js';
import { normalizeProducts } from '../domain/product.js';

let cachedLocalCatalog;
let cachedSource;

export function getLocalCatalogProducts(sourceProducts = localProducts) {
  if (sourceProducts === cachedSource && cachedLocalCatalog) {
    return cachedLocalCatalog;
  }

  const normalizedProducts = normalizeProducts(sourceProducts);

  if (sourceProducts === localProducts) {
    cachedSource = sourceProducts;
    cachedLocalCatalog = normalizedProducts;
  }

  return normalizedProducts;
}
