const JOB_TYPES = new Set(['reconcile_payment', 'send_transactional_email', 'notify_whatsapp', 'rebuild_recommendations', 'sync_catalog', 'refresh_semantic_index', 'detect_abandoned_checkout', 'update_customer_memory']);

function createJobId(type) {
  return `job_${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createJob({ type, payload = {}, runAt = null, correlationId = null, orderId = null, idempotencyKey = null, source = 'system' } = {}) {
  const safeType = JOB_TYPES.has(type) ? type : 'reconcile_payment';
  return {
    id: createJobId(safeType),
    type: safeType,
    status: 'queued',
    payload_json: payload,
    attempts: 0,
    max_attempts: 5,
    run_at: runAt || new Date().toISOString(),
    locked_at: null,
    locked_by: null,
    idempotency_key: idempotencyKey || null,
    correlation_id: correlationId || null,
    order_id: orderId || payload.orderId || null,
    source,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function enqueueJob(repository, input) {
  const job = createJob(input);
  return repository.enqueueJob(job);
}

export { JOB_TYPES };
