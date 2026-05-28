const globalState = globalThis.__lazulePayments || {
  orders: new Map(),
  checkoutSessions: new Map(),
  checkoutFingerprints: new Map(),
  processedEvents: new Set(),
  stockReservations: new Map(),
  orderLocks: new Map(),
  rateLimits: new Map(),
};

globalThis.__lazulePayments = globalState;

module.exports = globalState;
