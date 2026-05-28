export async function isFeatureEnabled(repository, key, { environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'production', userId = null } = {}) {
  const flag = await repository.getFeatureFlag(key, environment);
  if (!flag || !flag.enabled) return false;
  const rollout = Number(flag.rollout_percentage ?? flag.rolloutPercentage ?? 100);
  if (rollout >= 100 || !userId) return true;
  let hash = 0;
  for (const char of `${key}:${userId}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 100) < rollout;
}
