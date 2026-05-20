import { products } from '../src/data/products.js';
import { sanitizePublicProduct, isPrivateProductFieldKey } from '../src/data/publicProductSanitizer.js';

const errors = [];

for (const product of products) {
  for (const key of Object.keys(product)) {
    if (isPrivateProductFieldKey(key)) {
      errors.push(`${product.id || product.name}: campo privado detectado (${key})`);
    }
  }

  const sanitized = sanitizePublicProduct(product);
  if (!sanitized.name || !sanitized.brand || !sanitized.category) {
    errors.push(`${product.id || product.name}: shape público incompleto`);
  }

  const text = JSON.stringify(sanitized).toLowerCase();
  if (/<\/?[a-z][\s\S]*>/i.test(text)) errors.push(`${product.id || product.name}: html bruto no payload público`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Public boundary validation passed');
