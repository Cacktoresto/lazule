export function normalizeCartUiPath(pathname = '/') {
  const normalized = String(pathname || '/').split(/[?#]/)[0] || '/';

  if (normalized !== '/' && normalized.endsWith('/')) {
    return normalized.replace(/\/+$/, '');
  }

  return normalized;
}

export function resolveCartUiRendering(pathname = '/') {
  const routePath = normalizeCartUiPath(pathname);
  const isCheckoutRoute = routePath === '/checkout';

  return {
    routePath,
    isCheckoutRoute,
    renderCheckoutSummary: isCheckoutRoute,
    renderCartDrawer: !isCheckoutRoute,
    renderFloatingSelectionPanel: !isCheckoutRoute,
    renderSelectionSidebar: !isCheckoutRoute,
    renderSelectionPanel: !isCheckoutRoute,
  };
}
