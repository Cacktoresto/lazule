import { useEffect, useMemo, useState } from 'react';
import { trackCommerceEvent } from '../../commerce/analytics/commerceAnalytics';
import { CheckoutResultExperience } from '../../components/commerce/CheckoutResultExperience';
import { resolveCheckoutResultVariant } from '../../commerce/checkout/checkoutResultResolver';

export function CheckoutResultPage({ mode = 'pending' }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderId = params.get('order_id') || params.get('external_reference') || '';
  const paymentId = params.get('payment_id') || params.get('collection_id') || '';
  const urlStatus = params.get('status') || '';
  const [result, setResult] = useState({ status: 'loading', order: null, view: null, pix: null });

  useEffect(() => {
    let cancelled = false;
    let timer;
    let attempts = 0;

    async function loadStatus() {
      if (!orderId) {
        setResult({ status: 'unknown', order: null, view: null, pix: null });
        return;
      }
      attempts += 1;
      try {
        const response = await fetch(`/api/payments/status/${encodeURIComponent(orderId)}`);
        if (!response.ok) throw new Error('status_unavailable');
        const data = await response.json();
        if (cancelled) return;
        const order = data.order || null;
        const status = data.status || order?.status || 'awaiting_payment';
        setResult({ status, order, view: data.view || order?.statusView || null, pix: order?.pix || order?.payment?.pix || null });
        trackCommerceEvent('order_status_viewed', { productIds: order?.items?.map((item) => item.id) || [], total: order?.total, metadata: { orderId, paymentId, status, urlStatus } });
        if (['awaiting_payment', 'pending_payment', 'processing_payment'].includes(status) && attempts < 3) {
          timer = window.setTimeout(loadStatus, 2000);
        }
      } catch {
        if (cancelled) return;
        setResult((current) => ({ ...current, status: attempts < 3 ? 'loading' : 'unknown' }));
        if (attempts < 3) timer = window.setTimeout(loadStatus, 2000);
      }
    }

    loadStatus();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [orderId, paymentId, urlStatus]);

  const variant = resolveCheckoutResultVariant(result.status, mode);
  return <CheckoutResultExperience variant={variant} order={result.order} view={result.view} pix={result.pix} orderId={orderId} />;
}
