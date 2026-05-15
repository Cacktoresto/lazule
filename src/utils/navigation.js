import { normalizeSpaPath } from './productRouting.js';

export function dispatchSpaNavigationEvent() {
  if (typeof PopStateEvent === 'function') {
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }

  window.dispatchEvent(new Event('popstate'));
}

export function navigateSpa(path) {
  const nextPath = normalizeSpaPath(path || '/');
  const currentPath = normalizeSpaPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);

  if (currentPath !== nextPath) {
    window.history.pushState(null, '', nextPath);
  }

  dispatchSpaNavigationEvent();
}
