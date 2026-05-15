const DEFAULT_PRODUCTS_SELECT = `
  id,
  slug,
  name,
  description,
  brand,
  brand_name,
  category,
  category_name,
  catalog_type,
  gender,
  price,
  sale_price,
  original_price,
  image,
  image_url,
  badges,
  olfactory_reference,
  available,
  featured,
  size,
  volume_ml,
  brands(name, slug),
  categories(name, slug, catalog_type),
  product_images(url, alt, sort_order),
  product_prices(price, sale_price, original_price, currency),
  product_inventory(available, quantity)
`;

function getEnvValue(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return import.meta.env[key];
  }

  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }

  return '';
}

function normalizeConfigValue(value) {
  return String(value ?? '').trim();
}

function buildSupabaseRestUrl(url, table, query = {}) {
  const endpoint = new URL(`/rest/v1/${table}`, url.endsWith('/') ? url : `${url}/`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      endpoint.searchParams.set(key, value);
    }
  });

  return endpoint;
}

export function getSupabaseConfig(env = {}) {
  const url = normalizeConfigValue(env.VITE_SUPABASE_URL ?? getEnvValue('VITE_SUPABASE_URL'));
  const anonKey = normalizeConfigValue(env.VITE_SUPABASE_ANON_KEY ?? getEnvValue('VITE_SUPABASE_ANON_KEY'));

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

export function createSupabaseClient(config = getSupabaseConfig(), { fetchImpl = globalThis.fetch } = {}) {
  const normalizedConfig = {
    url: normalizeConfigValue(config.url),
    anonKey: normalizeConfigValue(config.anonKey),
    isConfigured: Boolean(normalizeConfigValue(config.url) && normalizeConfigValue(config.anonKey)),
  };

  if (!normalizedConfig.isConfigured) {
    return null;
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('Supabase experimental client requires a fetch implementation.');
  }

  return {
    config: normalizedConfig,
    async select(table, { select = '*', order = 'name.asc', query = {} } = {}) {
      const endpoint = buildSupabaseRestUrl(normalizedConfig.url, table, { select, order, ...query });
      const response = await fetchImpl(endpoint, {
        headers: {
          apikey: normalizedConfig.anonKey,
          Authorization: `Bearer ${normalizedConfig.anonKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Supabase request failed (${response.status}): ${message || response.statusText}`);
      }

      return response.json();
    },
  };
}

export function getDefaultSupabaseProductsSelect() {
  return DEFAULT_PRODUCTS_SELECT.replace(/\s+/g, ' ').trim();
}

export const supabaseClient = createSupabaseClient();
