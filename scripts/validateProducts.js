import { products } from '../src/data/products.js';
import { normalizeProducts } from '../src/domain/product.js';
import { createCanonicalUrl } from '../src/utils/seo.js';
import { createProductPath, createProductSlug } from '../src/utils/productRouting.js';

const FORBIDDEN_PUBLIC_FIELDS = ['costPrice', 'supplierCost', 'supplierRetailPrice', 'sourceUrl', 'supplierUrl', 'margin', 'margem', 'profit', 'wholesalePrice'];
const ALLOWED_CATALOG_TYPES = new Set(['Importado', 'Árabe', 'Nicho', 'Contratipo', 'Outros']);
const REQUIRED_TEXT_FIELDS = ['id', 'name', 'brand'];
const warnings = [];
const errors = [];

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

function addError(product, message) {
  errors.push(`[products validation] ${product?.id || product?.name || 'produto sem identificação'}: ${message}`);
}

function addWarning(product, message) {
  warnings.push(`[products validation] aviso ${product?.id || product?.name || 'produto sem identificação'}: ${message}`);
}

function hasOnlyDuplicatedOlfactoryReference(product) {
  const normalizedDescription = normalizeComparisonText(product.description);
  const normalizedReference = normalizeComparisonText(product.olfactoryReference);

  return Boolean(normalizedDescription && normalizedReference && normalizedDescription === normalizedReference);
}

const normalizedProducts = normalizeProducts(products);
const seenIds = new Map();
const seenSlugs = new Map();

products.forEach((product, index) => {
  REQUIRED_TEXT_FIELDS.forEach((field) => {
    if (!String(product[field] ?? '').trim()) {
      addError(product, `campo obrigatório ausente: ${field}`);
    }
  });

  const price = Number(product.salePrice);
  if (!Number.isFinite(price) || price < 0) {
    addError(product, `salePrice inválido: ${product.salePrice}`);
  }

  if (!String(product.image ?? '').trim()) {
    addWarning(product, 'imagem vazia; UI deve usar fallback premium');
  }

  const id = String(product.id ?? '').trim();
  if (id) {
    if (seenIds.has(id)) addError(product, `id duplicado com índice ${seenIds.get(id)}: ${id}`);
    seenIds.set(id, index);
  }

  const slug = createProductSlug(product.name);
  if (seenSlugs.has(slug)) addError(product, `slug duplicado com índice ${seenSlugs.get(slug)}: ${slug}`);
  seenSlugs.set(slug, index);

  FORBIDDEN_PUBLIC_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(product, field)) {
      addError(product, `campo privado/de fornecedor exposto no front público: ${field}`);
    }
  });

  if (hasOnlyDuplicatedOlfactoryReference(product)) {
    addError(product, `descrição duplica somente referência olfativa: description="${product.description}" | olfactoryReference="${product.olfactoryReference}"`);
  }
});

normalizedProducts.forEach((product) => {
  if (!product.productSlug || createProductSlug(product.productSlug) !== product.productSlug) {
    addError(product, `productSlug normalizado inválido: ${product.productSlug}`);
  }

  if (!ALLOWED_CATALOG_TYPES.has(product.catalogType)) {
    addError(product, `catalogType inconsistente para migração: ${product.catalogType}`);
  }

  const canonical = createCanonicalUrl(createProductPath(product));
  if (!canonical.startsWith('https://lazulefragrances.com.br/produto/')) {
    addError(product, `canonical inseguro ou inesperado: ${canonical}`);
  }
});

warnings.forEach((warning) => console.warn(warning));

if (errors.length > 0) {
  errors.forEach((error) => console.error(error));
  process.exit(1);
}

console.log(`[products validation] ${products.length} produtos validados: campos obrigatórios, slugs únicos, preço, canonical, catalogType e ausência de campos privados.`);
