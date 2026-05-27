const globalState = globalThis.__lazulePayments || {
  orders: new Map(),
  processedEvents: new Set(),
  stockReservations: new Map(),
};

globalThis.__lazulePayments = globalState;

export default globalState;
