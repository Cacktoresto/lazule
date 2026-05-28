export function createCommerceTrace({ operation = 'commerce', correlationId = null, orderId = null, paymentId = null, checkoutSessionId = null, source = 'system' } = {}) {
  const trace = {
    correlationId: correlationId || `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orderId,
    paymentId,
    checkoutSessionId,
    source,
    timestamp: new Date().toISOString(),
  };
  return {
    ...trace,
    log(level = 'info', message = operation, details = {}) {
      const logger = console[level] || console.info;
      logger(`[LZL][${operation}]`, { ...trace, timestamp: new Date().toISOString(), ...details, message });
    },
  };
}
