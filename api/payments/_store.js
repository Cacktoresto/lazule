const globalState = globalThis.__lazulePayments || {
  orders: new Map(),
  checkoutSessions: new Map(),
  checkoutFingerprints: new Map(),
  processedEvents: new Set(),
  stockReservations: new Map(),
  orderLocks: new Map(),
  orderEvents: new Map(),
  inventory: new Map(),
  jobs: new Map(),
  analyticsEvents: [],
  recommendationEvents: [],
  featureFlags: new Map(),
  rateLimits: new Map(),
};

globalThis.__lazulePayments = globalState;

export default globalState;
