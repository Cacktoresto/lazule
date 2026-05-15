export const CATALOG_SOURCE_LOCAL = 'local';
export const CATALOG_SOURCE_SUPABASE = 'supabase';

const DEFAULT_SUPABASE_TABLE = 'perfumes';
const DEFAULT_SUPABASE_SELECT = '*';

function readRuntimeEnv(name) {
  if (typeof import.meta !== 'undefined' && import.meta.env && Object.hasOwn(import.meta.env, name)) {
    return import.meta.env[name];
  }

  if (typeof process !== 'undefined' && process.env && Object.hasOwn(process.env, name)) {
    return process.env[name];
  }

  return undefined;
}

function readFirstRuntimeEnv(names) {
  return names.map(readRuntimeEnv).find((value) => String(value ?? '').trim());
}

export function getCatalogSource() {
  const source = String(readFirstRuntimeEnv(['VITE_LAZULE_CATALOG_SOURCE', 'LAZULE_CATALOG_SOURCE']) ?? CATALOG_SOURCE_LOCAL)
    .trim()
    .toLowerCase();

  return source === CATALOG_SOURCE_SUPABASE ? CATALOG_SOURCE_SUPABASE : CATALOG_SOURCE_LOCAL;
}

export function getSupabaseCatalogConfig() {
  const url = String(readFirstRuntimeEnv(['VITE_SUPABASE_URL', 'SUPABASE_URL']) ?? '').replace(/\/+$/, '');
  const anonKey = String(readFirstRuntimeEnv(['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']) ?? '').trim();
  const table = String(readFirstRuntimeEnv(['VITE_SUPABASE_CATALOG_TABLE', 'SUPABASE_CATALOG_TABLE']) ?? DEFAULT_SUPABASE_TABLE).trim();
  const select = String(readFirstRuntimeEnv(['VITE_SUPABASE_CATALOG_SELECT', 'SUPABASE_CATALOG_SELECT']) ?? DEFAULT_SUPABASE_SELECT).trim();

  return {
    url,
    anonKey,
    table: table || DEFAULT_SUPABASE_TABLE,
    select: select || DEFAULT_SUPABASE_SELECT,
    enabled: Boolean(url && anonKey),
  };
}
