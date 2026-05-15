import { getCatalogProducts } from '../utils/catalog.js';
import { createSupabaseClient, getDefaultSupabaseProductsSelect } from './supabaseClient.js';

function firstArrayItem(value) {
  return Array.isArray(value) && value.length > 0 ? value[0] : null;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function normalizeJoinedValue(value) {
  return Array.isArray(value) ? firstArrayItem(value) : value;
}

function normalizeBadges(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(String);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((badge) => badge.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePrice(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'sim', 'available'].includes(value.trim().toLowerCase());
  }

  return fallback;
}

function normalizeImage(row) {
  const primaryImage = normalizeJoinedValue(row.product_images);

  return firstDefined(row.image, row.image_url, row.photo_url, primaryImage?.url, primaryImage?.image_url);
}

function normalizeBrand(row) {
  const joinedBrand = normalizeJoinedValue(row.brands ?? row.brand_data);

  return firstDefined(row.brand, row.brand_name, row.brandName, joinedBrand?.name);
}

function normalizeCategory(row) {
  const joinedCategory = normalizeJoinedValue(row.categories ?? row.category_data);

  return firstDefined(row.category, row.category_name, row.categoryName, row.catalog_type, joinedCategory?.name, joinedCategory?.catalog_type);
}

function normalizeCatalogType(row, category) {
  const joinedCategory = normalizeJoinedValue(row.categories ?? row.category_data);

  return firstDefined(row.catalogType, row.catalog_type, row.type, joinedCategory?.catalog_type, category);
}

function normalizeAvailability(row) {
  const inventory = normalizeJoinedValue(row.product_inventory ?? row.inventory);
  const quantity = firstDefined(row.quantity, row.stock, inventory?.quantity);

  return normalizeBoolean(firstDefined(row.available, row.is_available, inventory?.available), Number(quantity) > 0);
}

function normalizeFeatured(row) {
  return normalizeBoolean(firstDefined(row.featured, row.is_featured), false);
}

function normalizeSalePrice(row) {
  const priceRow = normalizeJoinedValue(row.product_prices ?? row.prices);

  return normalizePrice(firstDefined(row.salePrice, row.sale_price, row.price, priceRow?.sale_price, priceRow?.price));
}

function normalizeOriginalPrice(row) {
  const priceRow = normalizeJoinedValue(row.product_prices ?? row.prices);

  return normalizePrice(firstDefined(row.originalPrice, row.original_price, priceRow?.original_price));
}

function normalizeSize(row) {
  const volume = firstDefined(row.size, row.volume, row.volume_ml, row.ml);

  if (volume === undefined) {
    return undefined;
  }

  return typeof volume === 'number' ? `${volume}ml` : String(volume);
}

export function mapSupabaseProductRow(row = {}) {
  const category = normalizeCategory(row);
  const catalogType = normalizeCatalogType(row, category);
  const salePrice = normalizeSalePrice(row);
  const originalPrice = normalizeOriginalPrice(row);

  return {
    id: String(firstDefined(row.id, row.slug, row.sku, row.name) ?? '').trim(),
    name: String(firstDefined(row.name, row.title) ?? '').trim(),
    brand: normalizeBrand(row) ?? '',
    category: category ?? catalogType ?? '',
    gender: firstDefined(row.gender, row.publico, row.audience, 'Unissex'),
    salePrice,
    price: salePrice,
    originalPrice,
    image: normalizeImage(row) ?? '',
    badges: normalizeBadges(row.badges ?? row.tags),
    description: firstDefined(row.description, row.short_description, ''),
    olfactoryReference: firstDefined(row.olfactoryReference, row.olfactory_reference, row.inspiration, ''),
    available: normalizeAvailability(row),
    featured: normalizeFeatured(row),
    size: normalizeSize(row),
    catalogType,
  };
}

export function mapSupabaseProductRows(rows = []) {
  return getCatalogProducts(rows.map(mapSupabaseProductRow));
}

export async function fetchSupabaseCatalogProducts({ client = createSupabaseClient(), table = 'products' } = {}) {
  if (!client) {
    return [];
  }

  const rows = await client.select(table, {
    select: getDefaultSupabaseProductsSelect(),
    order: 'name.asc',
  });

  return mapSupabaseProductRows(Array.isArray(rows) ? rows : []);
}
