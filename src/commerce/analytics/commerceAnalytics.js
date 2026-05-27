import { trackEvent } from '../../utils/analytics';

export function trackCheckoutStep(step, payload = {}) {
  trackEvent('commerce_checkout_step', { step, ...payload });
}
