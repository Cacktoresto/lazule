import { getAnalyticsSnapshot } from '../utils/analytics.js';

export function getLocalAnalyticsEventsSnapshot() {
  return getAnalyticsSnapshot()?.events ?? [];
}
