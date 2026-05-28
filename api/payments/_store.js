const globalState = globalThis.__lazulePayments || {
  orders: new Map(),
  checkoutSessions: new Map(),
  processedEvents: new Set(),
  checkoutFingerprints: new Map(),
};

globalThis.__lazulePayments = globalState;

module.exports = globalState;
