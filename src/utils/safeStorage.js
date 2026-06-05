const DEFAULT_MAX_VALUE_BYTES = 96 * 1024;

function estimateBytes(value = '') {
  return String(value).length * 2;
}

export function canUseBrowserStorage(storage) {
  return Boolean(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function');
}

export function safeGetStorageItem(storage, key, fallback = null) {
  if (!canUseBrowserStorage(storage)) return fallback;

  try {
    const value = storage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function safeSetStorageItem(storage, key, value, { maxBytes = DEFAULT_MAX_VALUE_BYTES, onQuotaExceeded } = {}) {
  if (!canUseBrowserStorage(storage)) return false;

  const serializedValue = String(value);
  if (estimateBytes(serializedValue) > maxBytes) {
    onQuotaExceeded?.({ key, bytes: estimateBytes(serializedValue), maxBytes, reason: 'max_bytes' });
    return false;
  }

  try {
    storage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    onQuotaExceeded?.({ key, error, reason: 'storage_write_failed' });
    return false;
  }
}

export function safeRemoveStorageItem(storage, key) {
  if (!storage || typeof storage.removeItem !== 'function') return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeParseJson(raw, fallback) {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function safeReadJson(storage, key, fallback) {
  return safeParseJson(safeGetStorageItem(storage, key, null), fallback);
}

export function safeWriteJson(storage, key, value, options) {
  return safeSetStorageItem(storage, key, JSON.stringify(value), options);
}
