import { products } from '../src/data/products.js';

const FORBIDDEN_PUBLIC_FIELDS = ['costPrice', 'supplierRetailPrice', 'sourceUrl', 'margin', 'margem'];

function normalizeComparisonText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:ref\.?\s*olfativa|referencia\s*olfativa|ref\.?|referencia)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasOnlyDuplicatedOlfactoryReference(product) {
  const normalizedDescription = normalizeComparisonText(product.description);
  const normalizedReference = normalizeComparisonText(product.olfactoryReference);

  return Boolean(normalizedDescription && normalizedReference && normalizedDescription === normalizedReference);
}

const duplicatedReferenceDescriptions = products.filter(hasOnlyDuplicatedOlfactoryReference);
const exposedPrivateFields = products.flatMap((product) =>
  FORBIDDEN_PUBLIC_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(product, field)).map((field) => ({ product, field })),
);

if (duplicatedReferenceDescriptions.length > 0 || exposedPrivateFields.length > 0) {
  for (const product of duplicatedReferenceDescriptions) {
    console.error(
      `[products validation] Descrição duplicando somente referência olfativa: ${product.name} | description="${product.description}" | olfactoryReference="${product.olfactoryReference}"`,
    );
  }

  for (const { product, field } of exposedPrivateFields) {
    console.error(`[products validation] Campo privado exposto em products.js: ${field} | produto="${product.name}"`);
  }

  process.exit(1);
}

console.log(`[products validation] ${products.length} produtos validados sem descrição de referência olfativa duplicada.`);
