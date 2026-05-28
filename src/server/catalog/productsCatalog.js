const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let cachedProducts = null;

function loadProducts() {
  if (cachedProducts) return cachedProducts;

  const productsFile = path.join(__dirname, '../../data/products.js');
  const source = fs.readFileSync(productsFile, 'utf8');
  const transformed = source.replace(/^\s*export\s+const\s+products\s*=/m, 'products =');
  const context = { products: [] };
  vm.createContext(context);
  vm.runInContext(`${transformed}\nproducts;`, context, { filename: productsFile, timeout: 1000 });
  cachedProducts = Array.isArray(context.products) ? context.products : [];
  return cachedProducts;
}

module.exports = { loadProducts };
