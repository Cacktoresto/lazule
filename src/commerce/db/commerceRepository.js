const TABLES = Object.freeze({
  orders: 'orders',
  orderItems: 'order_items',
  payments: 'payments',
  orderEvents: 'order_events',
  paymentEvents: 'payment_events',
  checkoutSessions: 'checkout_sessions',
  inventory: 'inventory',
  jobs: 'jobs',
  analyticsEvents: 'analytics_events',
  recommendationEvents: 'recommendation_events',
  customerMemory: 'customer_memory',
  featureFlags: 'feature_flags',
});

function hasSupabaseEnv(env = process.env) {
  return Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));
}

function getSupabaseHeaders(env = process.env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function toSnakeOrder(order = {}) {
  return {
    id: order.id,
    user_id: order.userId || order.user_id || null,
    checkout_session_id: order.checkoutSessionId || order.checkout_session_id || order.checkout?.sessionId || null,
    status: order.status || 'awaiting_payment',
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    total: Number(order.total || 0),
    currency: order.currency || 'BRL',
    coupon: order.coupon || null,
    customer_json: order.customer || order.customer_json || {},
    payment_json: order.payment || order.payment_json || {},
    consistency_json: order.consistency || order.consistency_json || {},
    processing_json: order.processing || order.processing_json || {},
    checkout_json: order.checkout || order.checkout_json || {},
    mp_preference_id: order.mpPreferenceId || order.mp_preference_id || null,
    mp_payment_id: order.mpPaymentId || order.mp_payment_id || order.payment?.id || null,
    external_reference: order.externalReference || order.external_reference || order.id,
    created_at: order.createdAt || order.created_at || new Date().toISOString(),
    updated_at: order.updatedAt || order.updated_at || new Date().toISOString(),
  };
}

function fromSnakeOrder(row = {}, { items = [], events = [] } = {}) {
  return {
    id: row.id,
    userId: row.user_id || null,
    status: row.status,
    items,
    subtotal: Number(row.subtotal || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    currency: row.currency || 'BRL',
    coupon: row.coupon || null,
    customer: row.customer_json || {},
    payment: row.payment_json || {},
    consistency: row.consistency_json || {},
    processing: row.processing_json || {},
    checkout: row.checkout_json || {},
    mpPreferenceId: row.mp_preference_id || null,
    mpPaymentId: row.mp_payment_id || null,
    externalReference: row.external_reference || row.id,
    checkoutSessionId: row.checkout_session_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events,
  };
}

function toOrderItemRows(order = {}) {
  return (order.items || []).map((item, index) => ({
    order_id: order.id,
    product_id: item.id || item.product_id,
    title: item.title || item.name || '',
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.unit_price || item.unitPrice || item.salePrice || 0),
    currency: item.currency_id || item.currency || 'BRL',
    image_url: item.image || item.image_url || null,
    position: index,
    payload_json: item,
  }));
}

function fromOrderItemRows(rows = []) {
  return rows.map((row) => ({
    id: row.product_id,
    title: row.title,
    quantity: Number(row.quantity || 1),
    unit_price: Number(row.unit_price || 0),
    currency_id: row.currency || 'BRL',
    image: row.image_url || row.payload_json?.image || null,
  }));
}

function toEventRecord(event = {}, orderId = null) {
  return {
    id: event.id,
    order_id: orderId || event.orderId || event.order_id || null,
    event_type: event.type || event.event_type,
    source: event.source || 'system',
    payload_json: event.payload || event.payload_json || {},
    fingerprint: event.fingerprint || null,
    created_at: event.timestamp || event.created_at || new Date().toISOString(),
    correlation_id: event.correlationId || event.correlation_id || event.payload?.correlationId || null,
  };
}

function fromEventRecord(row = {}) {
  return {
    id: row.id,
    type: row.event_type,
    timestamp: row.created_at,
    source: row.source,
    payload: row.payload_json || {},
    fingerprint: row.fingerprint || null,
    correlationId: row.correlation_id || null,
  };
}

class LocalCommerceRepository {
  constructor(store = {}) {
    this.store = store;
    this.store.orders ||= new Map();
    this.store.checkoutSessions ||= new Map();
    this.store.orderEvents ||= new Map();
    this.store.inventory ||= new Map();
    this.store.jobs ||= new Map();
    this.store.analyticsEvents ||= [];
    this.store.recommendationEvents ||= [];
    this.store.featureFlags ||= new Map();
  }

  async saveOrder(order) {
    this.store.orders.set(order.id, order);
    for (const event of order.events || []) {
      await this.appendOrderEvent(order.id, event);
    }
    return order;
  }

  async getOrder(orderId) {
    const order = this.store.orders.get(orderId) || null;
    if (!order) return null;
    const events = await this.listOrderEvents(orderId);
    return { ...order, events: events.length ? events : (order.events || []) };
  }

  async updateOrder(orderId, patch = {}) {
    const current = await this.getOrder(orderId);
    if (!current) return null;
    const updated = { ...current, ...patch, updatedAt: patch.updatedAt || new Date().toISOString() };
    this.store.orders.set(orderId, updated);
    return updated;
  }

  async listOrders({ statuses = null, limit = 50 } = {}) {
    const statusSet = statuses ? new Set(statuses) : null;
    return [...this.store.orders.values()]
      .filter((order) => !statusSet || statusSet.has(order.status))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, limit);
  }

  async saveCheckoutSession(session) {
    this.store.checkoutSessions.set(session.id, session);
    return session;
  }

  async appendOrderEvent(orderId, event) {
    if (!orderId || !event?.id) return event;
    const current = this.store.orderEvents.get(orderId) || [];
    if (!current.some((item) => item.fingerprint && item.fingerprint === event.fingerprint)) {
      this.store.orderEvents.set(orderId, [...current, event]);
    }
    return event;
  }

  async listOrderEvents(orderId) {
    return [...(this.store.orderEvents.get(orderId) || [])].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  }

  async upsertInventory(record) {
    this.store.inventory.set(record.productId || record.product_id, record);
    return record;
  }

  async getInventory(productId) {
    return this.store.inventory.get(productId) || null;
  }

  async enqueueJob(job) {
    this.store.jobs.set(job.id, job);
    return job;
  }

  async listJobs({ status = null, limit = 50 } = {}) {
    return [...this.store.jobs.values()].filter((job) => !status || job.status === status).slice(0, limit);
  }

  async trackAnalyticsEvent(event) {
    this.store.analyticsEvents.unshift(event);
    return event;
  }

  async trackRecommendationEvent(event) {
    this.store.recommendationEvents.unshift(event);
    return event;
  }

  async getFeatureFlag(key, environment = 'production') {
    return this.store.featureFlags.get(`${environment}:${key}`) || this.store.featureFlags.get(key) || null;
  }
}

class SupabaseCommerceRepository {
  constructor({ url = process.env.SUPABASE_URL, env = process.env, fetchImpl = globalThis.fetch } = {}) {
    this.url = String(url || '').replace(/\/$/, '');
    this.env = env;
    this.fetch = fetchImpl;
    this.headers = getSupabaseHeaders(env);
  }

  endpoint(table, query = '') {
    return `${this.url}/rest/v1/${table}${query}`;
  }

  async request(table, { method = 'GET', query = '', body = undefined, headers = {} } = {}) {
    if (!this.fetch) throw new Error('fetch_unavailable');
    const response = await this.fetch(this.endpoint(table, query), {
      method,
      headers: { ...this.headers, ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`supabase_${table}_${response.status}`);
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async saveOrder(order) {
    const row = toSnakeOrder(order);
    await this.request(TABLES.orders, { method: 'POST', query: '?on_conflict=id', body: row, headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
    const itemRows = toOrderItemRows(order);
    if (itemRows.length) {
      await this.request(TABLES.orderItems, { method: 'POST', query: '?on_conflict=order_id,product_id', body: itemRows, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
    }
    for (const event of order.events || []) await this.appendOrderEvent(order.id, event);
    return order;
  }

  async getOrder(orderId) {
    const rows = await this.request(TABLES.orders, { query: `?id=eq.${encodeURIComponent(orderId)}&limit=1` });
    const row = rows?.[0];
    if (!row) return null;
    const [items, events] = await Promise.all([
      this.request(TABLES.orderItems, { query: `?order_id=eq.${encodeURIComponent(orderId)}&order=position.asc` }),
      this.listOrderEvents(orderId),
    ]);
    return fromSnakeOrder(row, { items: fromOrderItemRows(items || []), events });
  }

  async updateOrder(orderId, patch = {}) {
    const row = toSnakeOrder({ id: orderId, ...patch, updatedAt: patch.updatedAt || new Date().toISOString() });
    const rows = await this.request(TABLES.orders, { method: 'PATCH', query: `?id=eq.${encodeURIComponent(orderId)}`, body: row });
    return rows?.[0] ? fromSnakeOrder(rows[0]) : null;
  }

  async listOrders({ statuses = null, limit = 50 } = {}) {
    const statusQuery = statuses?.length ? `&status=in.(${statuses.map(encodeURIComponent).join(',')})` : '';
    const rows = await this.request(TABLES.orders, { query: `?order=created_at.desc&limit=${limit}${statusQuery}` });
    return Promise.all((rows || []).map(async (row) => fromSnakeOrder(row, { events: await this.listOrderEvents(row.id) })));
  }

  async saveCheckoutSession(session) {
    const row = {
      id: session.id,
      order_id: session.orderId || null,
      user_id: session.userId || null,
      status: session.status,
      cart_snapshot_json: session.cartSnapshot || [],
      customer_context_json: session.customerContext || {},
      preference_id: session.preferenceId || null,
      recovery_token: session.recoveryToken || null,
      abandonment_state: session.abandonmentState || 'none',
      expires_at: session.expiresAt || null,
      last_activity_at: session.lastActivityAt || new Date().toISOString(),
      created_at: session.createdAt || new Date().toISOString(),
    };
    await this.request(TABLES.checkoutSessions, { method: 'POST', query: '?on_conflict=id', body: row, headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
    return session;
  }

  async appendOrderEvent(orderId, event) {
    await this.request(TABLES.orderEvents, { method: 'POST', query: '?on_conflict=fingerprint', body: toEventRecord(event, orderId), headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } });
    return event;
  }

  async listOrderEvents(orderId) {
    const rows = await this.request(TABLES.orderEvents, { query: `?order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc` });
    return (rows || []).map(fromEventRecord);
  }

  async upsertInventory(record) {
    const row = {
      product_id: record.productId || record.product_id,
      quantity_available: Number(record.quantityAvailable ?? record.quantity_available ?? 0),
      quantity_reserved: Number(record.quantityReserved ?? record.quantity_reserved ?? 0),
      quantity_sold: Number(record.quantitySold ?? record.quantity_sold ?? 0),
      status: record.status || 'in_stock',
      low_stock_threshold: Number(record.lowStockThreshold ?? record.low_stock_threshold ?? 2),
      updated_at: new Date().toISOString(),
    };
    await this.request(TABLES.inventory, { method: 'POST', query: '?on_conflict=product_id', body: row, headers: { Prefer: 'resolution=merge-duplicates,return=representation' } });
    return record;
  }

  async getInventory(productId) {
    const rows = await this.request(TABLES.inventory, { query: `?product_id=eq.${encodeURIComponent(productId)}&limit=1` });
    return rows?.[0] || null;
  }

  async enqueueJob(job) {
    await this.request(TABLES.jobs, { method: 'POST', body: job, headers: { Prefer: 'return=representation' } });
    return job;
  }

  async listJobs({ status = null, limit = 50 } = {}) {
    const statusQuery = status ? `&status=eq.${encodeURIComponent(status)}` : '';
    return this.request(TABLES.jobs, { query: `?order=created_at.asc&limit=${limit}${statusQuery}` });
  }

  async trackAnalyticsEvent(event) {
    await this.request(TABLES.analyticsEvents, { method: 'POST', body: event, headers: { Prefer: 'return=minimal' } });
    return event;
  }

  async trackRecommendationEvent(event) {
    await this.request(TABLES.recommendationEvents, { method: 'POST', body: event, headers: { Prefer: 'return=minimal' } });
    return event;
  }

  async getFeatureFlag(key, environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'production') {
    const rows = await this.request(TABLES.featureFlags, { query: `?key=eq.${encodeURIComponent(key)}&environment=eq.${encodeURIComponent(environment)}&limit=1` });
    return rows?.[0] || null;
  }
}

export function createCommerceRepository({ store, env = process.env, fetchImpl = globalThis.fetch, forceLocal = false } = {}) {
  if (!forceLocal && hasSupabaseEnv(env)) return new SupabaseCommerceRepository({ env, fetchImpl });
  return new LocalCommerceRepository(store);
}

export { LocalCommerceRepository, SupabaseCommerceRepository, TABLES, hasSupabaseEnv, toEventRecord, fromEventRecord };
