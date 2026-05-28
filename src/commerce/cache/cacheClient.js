const memory = new Map();

function isExpired(entry) {
  return entry?.expiresAt && Date.now() > entry.expiresAt;
}

export const cache = {
  async get(key) {
    const entry = memory.get(key);
    if (!entry || isExpired(entry)) {
      memory.delete(key);
      return null;
    }
    return entry.value;
  },
  async set(key, value, { ttlMs = null } = {}) {
    memory.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
    return value;
  },
  async del(key) {
    return memory.delete(key);
  },
  async remember(key, producer, options = {}) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const value = await producer();
    await this.set(key, value, options);
    return value;
  },
};
