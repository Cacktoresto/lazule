import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createTabSyncChannel } from '../state/tabSyncEngine';

const FINAL_STATUSES = new Set(['paid', 'failed', 'cancelled', 'refunded']);

function resolveDelay(status, attempt) {
  if (FINAL_STATUSES.has(status)) return null;
  const base = status === 'awaiting_payment' || status === 'pending' ? 5000 : 2500;
  return Math.min(30000, base * Math.max(1, attempt));
}

export function useOrderConsistency(orderId, { enabled = true, staleAfterMs = 15000 } = {}) {
  const [order, setOrder] = useState(null);
  const [uiState, setUiState] = useState('syncing');
  const [error, setError] = useState(null);
  const attemptRef = useRef(1);
  const lastFetchRef = useRef(0);

  const refresh = useCallback(async ({ reason = 'poll' } = {}) => {
    if (!enabled || !orderId) return null;
    lastFetchRef.current = Date.now();
    setUiState((current) => (current === 'finalizing' ? current : (reason === 'reconcile' ? 'reconciling' : 'syncing')));
    try {
      const response = await fetch(`/api/payments/status/${encodeURIComponent(orderId)}${reason === 'reconcile' ? '?reconcile=1' : ''}`);
      if (!response.ok) throw new Error('order_status_unavailable');
      const data = await response.json();
      const nextOrder = data.order || { id: data.orderId, status: data.status };
      setOrder(nextOrder);
      setUiState(data.canonicalState?.uiState || (nextOrder.status === 'paid' ? 'finalizing' : 'awaiting_confirmation'));
      setError(null);
      attemptRef.current = 1;
      return nextOrder;
    } catch (loadError) {
      setError(loadError);
      setUiState('awaiting_confirmation');
      attemptRef.current += 1;
      return null;
    }
  }, [enabled, orderId]);

  useEffect(() => {
    if (!enabled || !orderId) return undefined;
    let cancelled = false;
    let timer = null;
    async function tick(reason) {
      if (cancelled) return;
      const nextOrder = await refresh({ reason });
      if (cancelled) return;
      const status = nextOrder?.status || order?.status || 'awaiting_payment';
      const delay = resolveDelay(status, attemptRef.current);
      if (delay) timer = window.setTimeout(() => tick('poll'), delay);
    }
    tick('initial');
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, orderId, refresh]);

  useEffect(() => {
    if (!enabled || !orderId || typeof window === 'undefined') return undefined;
    const revalidate = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > staleAfterMs) refresh({ reason: 'focus' });
    };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [enabled, orderId, refresh, staleAfterMs]);

  useEffect(() => {
    if (!enabled || !orderId) return undefined;
    const channel = createTabSyncChannel({
      onMessage(message) {
        if (message?.type === 'order_update' && message.orderId === orderId) {
          setOrder(message.order);
          setUiState(message.order?.status === 'paid' ? 'finalizing' : 'awaiting_confirmation');
        }
      },
    });
    return () => channel.close();
  }, [enabled, orderId]);

  return useMemo(() => ({
    order,
    status: order?.status || 'loading',
    uiState,
    error,
    isStale: Date.now() - lastFetchRef.current > staleAfterMs,
    refresh,
    reconcile: () => refresh({ reason: 'reconcile' }),
  }), [order, uiState, error, refresh, staleAfterMs]);
}
