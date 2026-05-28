const globalState = globalThis.__lazulePayments || {
  orders: new Map(),
  checkoutSessions: new Map(),
  processedEvents: new Set(),
  stockReservations: new Map(),
  orderLocks: new Map(),
};

globalThis.__lazulePayments = globalState;

export default globalState;
