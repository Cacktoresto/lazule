const globalState = globalThis.__lazulePayments || {
  orders: new Map(),
  processedEvents: new Set(),
  stockReservations: new Map(),
  checkoutFingerprints: new Map(),
  rateLimits: new Map(),
};

globalThis.__lazulePayments = globalState;

export default globalState;
