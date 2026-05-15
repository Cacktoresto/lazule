import { normalizeProducts } from '../domain/product.js';
import { getSupabaseCatalogConfig } from './catalogSourceConfig.js';

const DEFAULT_TIMEOUT_MS = 8000;

function getRowValue(row, keys, fallback = undefined) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) {
      return row[key];
    }
  }

  return fallback;
}

function getNestedBrand(row) {
  const brand = getRowValue(row, ['brand', 'brand_name']);

  if (brand) {
    return brand;
  }

  if (typeof row?.brands?.name === 'string') {
    return row.brands.name;
  }

  if (Array.isArray(row?.brands) && row.brands[0]?.name) {
    return row.brands[0].name;
  }

  return '';
}

function getPrimaryImage(row) {
  const directImage = getRowValue(row, ['image', 'image_url', 'primary_image', 'primary_image_url', 'url']);

  if (directImage) {
    return directImage;
  }

  const images = getRowValue(row, ['images', 'perfume_images'], []);

  if (!Array.isArray(images)) {
    return '';
  }

  const primaryImage = images.find((image) => image?.is_primary) ?? images[0];
  return getRowValue(primaryImage, ['url', 'image', 'image_url'], '');
}

function normalizeBadges(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((badge) => badge.trim())
      .filter(Boolean);
  }

  return [];
}

function mapSupabasePerfumeRow(row = {}) {
  const status = String(getRowValue(row, ['status'], 'published')).toLowerCase();
  const available = getRowValue(row, ['available', 'is_available'], status !== 'unpublished' && status !== 'draft');

  return {
    id: String(getRowValue(row, ['legacy_id', 'sku', 'id'], '')).trim(),
    name: getRowValue(row, ['name', 'title'], ''),
    brand: getNestedBrand(row),
    category: getRowValue(row, ['category', 'category_name'], ''),
    gender: getRowValue(row, ['gender'], ''),
    salePrice: getRowValue(row, ['salePrice', 'sale_price', 'price', 'public_price'], 0),
    image: getPrimaryImage(row),
    badges: normalizeBadges(getRowValue(row, ['badges', 'tags'], [])),
    description: getRowValue(row, ['description', 'summary'], ''),
    olfactoryReference: getRowValue(row, ['olfactoryReference', 'olfactory_reference'], ''),
    available: available !== false,
    featured: Boolean(getRowValue(row, ['featured', 'is_featured'], false)),
  };
}

function createSupabaseCatalogUrl(config) {
  const url = new URL(`${config.url}/rest/v1/${encodeURIComponent(config.table)}`);
  url.searchParams.set('select', config.select);
  return url;
}

export async function fetchSupabaseCatalogProducts(options = {}) {
  const config = { ...getSupabaseCatalogConfig(), ...options.config };

  if (!config.enabled) {
    throw new Error('Supabase catalog source is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY, or their VITE_ equivalents.');
  }

  if (typeof fetch !== 'function') {
    throw new Error('Supabase catalog source requires a runtime with fetch support.');
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS) : null;

  try {
    const response = await fetch(createSupabaseCatalogUrl(config), {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: 'application/json',
      },
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error(`Supabase catalog request failed with ${response.status} ${response.statusText}`);
    }

    const rows = await response.json();

    if (!Array.isArray(rows)) {
      throw new Error('Supabase catalog response must be an array.');
    }

    return normalizeProducts(rows.map(mapSupabasePerfumeRow));
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export default {
  fetchSupabaseCatalogProducts,
};
