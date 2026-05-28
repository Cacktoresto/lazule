const RECOMMENDATION_EVENT_TYPES = new Set(['product_viewed', 'recommendation_seen', 'recommendation_clicked', 'added_to_selection', 'purchased', 'ignored', 'revisited', 'search_query', 'semantic_intent', 'atmosphere', 'context', 'impression', 'click', 'add_to_cart', 'purchase', 'ignore', 'dwell_time', 'return_to_product']);

export async function recordRecommendationEvent(repository, { type, userId = null, sessionId = null, productId = null, payload = {}, source = 'lazule_web' } = {}) {
  const eventType = RECOMMENDATION_EVENT_TYPES.has(type) ? type : 'context';
  const event = {
    id: `rec_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event_type: eventType,
    user_id: userId,
    session_id: sessionId,
    product_id: productId,
    source,
    payload_json: payload,
    created_at: new Date().toISOString(),
  };
  return repository.trackRecommendationEvent(event);
}

export { RECOMMENDATION_EVENT_TYPES };
