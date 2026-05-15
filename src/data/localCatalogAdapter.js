import { getCatalogProducts } from '../utils/catalog.js';
import { products } from './products.js';

export function getLocalCatalogProducts(sourceProducts = products) {
  return getCatalogProducts(sourceProducts);
}
