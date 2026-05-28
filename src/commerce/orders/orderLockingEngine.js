const LOCK_TTL_MS = 30000;

export function isLockExpired(processing, now = Date.now()) {
  if (!processing?.locked) return true;
  const lockedAt = Date.parse(processing.lockedAt || '');
  return !Number.isFinite(lockedAt) || now - lockedAt > LOCK_TTL_MS;
}

export function acquireOrderLock(order, lockOwner = 'system') {
  const current = order || {};
  if (current.processing?.locked && !isLockExpired(current.processing)) {
    return { acquired: false, order: current };
  }
  return {
    acquired: true,
    order: {
      ...current,
      processing: { locked: true, lockedAt: new Date().toISOString(), lockOwner },
      consistency: { ...(current.consistency || {}), technicalState: 'locked' },
    },
  };
}

export function releaseOrderLock(order, lockOwner = 'system') {
  return {
    ...(order || {}),
    processing: { locked: false, lockedAt: null, lockOwner },
    consistency: { ...((order || {}).consistency || {}), technicalState: 'synced' },
  };
}
