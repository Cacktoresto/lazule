import { lazy, Suspense, useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MineralBackground } from './components/MineralBackground';
import { FAQ } from './components/FAQ';
import { Home } from './components/Home';
import { BrandPage } from './components/BrandPage';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetails } from './components/ProductDetails';
import { ProductNotFound } from './components/ProductNotFound';
import { ProductSuggestion } from './components/ProductSuggestion';
import { WhatsAppButton } from './components/WhatsAppButton';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAdmin } from './auth/RequireAdmin';
import { RequireInfluencerOrAdmin } from './auth/RequireInfluencerOrAdmin';
import { AdminLogin } from './pages/admin/AdminLogin';
import { InfluencerDashboard } from './pages/influencer/InfluencerDashboard';
import { InfluencerInvite } from './pages/influencer/InfluencerInvite';
import { OlfactiveIdentityPortal } from './pages/OlfactiveIdentityPortal';
import { CheckoutPage } from './pages/commerce/CheckoutPage';
import { CartPage } from './pages/commerce/CartPage';
import { CheckoutResultPage } from './pages/commerce/CheckoutResultPage';
import { OrderDetailPage } from './pages/commerce/OrderDetailPage';
import { getBrandSlugFromPath, getProductSlugFromPath, normalizeSpaPath } from './utils/productRouting';
import { navigateSpa } from './utils/navigation';
import { trackCouponDetected, trackInfluencerRouteVisit, trackPageView, trackPromoRouteVisit, trackReferralApplied, trackReferralVisit } from './utils/analytics';
import { captureReferralParams } from './utils/referral';
import { applyPromoReferralRoute, isPromoReferralRoute } from './utils/promoRoutes';
import { resolveCartUiRendering } from './commerce/checkout/cartUiRouting';

const AnalyticsDashboard = lazy(() => import('./components/analytics/AnalyticsDashboard').then((module) => ({ default: module.AnalyticsDashboard })));

const SPA_ROUTE_PATTERN = /^(\/|\/pedido\/[^/]+\/?|\/minha-selecao\/[^/]+\/?|\/checkout\/recuperar\/[^/]+\/?|\/catalogo\/?|\/faq\/?|\/identidade\/?|\/selecao\/?|\/checkout(?:\/(?:success|pending|failure))?\/?|\/carrinho\/?|\/produto-nao-encontrado\/?|\/produto-sugerido\/?|\/admin\/(?:analytics|login)\/?|\/influencer(?:\/login|\/invite\/[^/]+)?\/?|\/promo\/[^/]+\/?|\/(?:i|indica)\/[^/]+\/?|\/produto\/[^/]+\/?|\/marca\/[^/]+\/?)$/;

function isSafeSpaPath(path) {
  const normalizedPath = normalizeSpaPath(path || '/').split(/[?#]/)[0];

  return SPA_ROUTE_PATTERN.test(normalizedPath);
}

function restoreRouteFromFallbackRedirect() {
  const params = new URLSearchParams(window.location.search);
  const redirectPath = params.get('lazule_redirect');

  if (window.location.pathname !== '/' || !redirectPath) {
    return;
  }

  let nextUrl;

  try {
    nextUrl = new URL(redirectPath, window.location.origin);
  } catch {
    params.delete('lazule_redirect');
    const query = params.toString();
    window.history.replaceState(null, '', query ? `/?${query}${window.location.hash}` : `/${window.location.hash}`);
    return;
  }

  if (nextUrl.origin !== window.location.origin || !isSafeSpaPath(nextUrl.pathname)) {
    params.delete('lazule_redirect');
    const query = params.toString();
    window.history.replaceState(null, '', query ? `/?${query}${window.location.hash}` : `/${window.location.hash}`);
    return;
  }

  const nextPath = normalizeSpaPath(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  window.history.replaceState(null, '', nextPath);
}

function normalizeTrailingSlashRoute() {
  const { pathname, search, hash } = window.location;

  if (pathname !== '/' && pathname.endsWith('/') && isSafeSpaPath(pathname)) {
    window.history.replaceState(null, '', normalizeSpaPath(`${pathname}${search}${hash}`));
  }
}

function normalizeLegacyCatalogRoute() {
  restoreRouteFromFallbackRedirect();
  normalizeTrailingSlashRoute();

  const { pathname, hash } = window.location;

  if (pathname === '/' && hash === '#catalogo') {
    window.history.replaceState(null, '', '/catalogo');
  }
}

function scrollToHashOrTop({ smooth = true } = {}) {
  const hash = window.location.hash;
  const behavior = smooth ? 'smooth' : 'auto';

  if (!hash || hash === '#top') {
    window.scrollTo({ top: 0, behavior });
    return;
  }

  const target = document.getElementById(hash.slice(1));

  if (target) {
    target.scrollIntoView({ behavior, block: 'start' });
  }
}

function PromoReferralLanding({ route }) {
  const isPromoRoute = route.pathname.startsWith('/promo/');
  const title = isPromoRoute ? 'Cupom aplicado' : 'Curadoria liberada';
  const eyebrow = isPromoRoute ? 'Benefício LAZULE' : 'Indicação premium';
  const description = isPromoRoute
    ? 'Seu cupom foi salvo com segurança. Estamos levando você para conhecer a seleção da LAZULE FRAGRANCES.'
    : 'Você está entrando na curadoria LAZULE por uma indicação especial. Preparando o catálogo para você.';

  return (
    <section className="mx-auto flex min-h-[62vh] max-w-4xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative w-full overflow-hidden rounded-[2rem] border border-lazule-gold/25 bg-slate-950/72 p-8 text-center shadow-2xl shadow-lazule-blue/20 backdrop-blur sm:p-12">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-lazule-gold/70 to-transparent" />
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-lazule-gold/30 bg-lazule-gold/10 text-2xl text-lazule-gold shadow-lg shadow-lazule-gold/10">
          ✦
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.36em] text-lazule-gold/80">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-lazule-mist/74 sm:text-base">{description}</p>
        <div className="mx-auto mt-8 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-lazule-gold via-white to-lazule-blue animate-lazule-shimmer" />
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.28em] text-lazule-mist/48">Redirecionando para o catálogo</p>
      </div>
    </section>
  );
}

function getCurrentRoute() {
  normalizeLegacyCatalogRoute();

  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    productSlug: getProductSlugFromPath(window.location.pathname),
    brandSlug: getBrandSlugFromPath(window.location.pathname),
  };
}

function App() {
  const [route, setRoute] = useState(getCurrentRoute);
  const isProductRoute = route.pathname.startsWith('/produto/');
  const isBrandRoute = route.pathname.startsWith('/marca/');
  const isCatalogRoute = route.pathname === '/catalogo';
  const isFaqRoute = route.pathname === '/faq';
  const isIdentityRoute = route.pathname === '/identidade';
  const isCheckoutRecoveryRoute = route.pathname.startsWith('/checkout/recuperar/');
  const isOrderDetailRoute = route.pathname.startsWith('/pedido/') || route.pathname.startsWith('/minha-selecao/');
  const isCheckoutExperienceRoute = route.pathname === '/selecao' || route.pathname === '/checkout' || isCheckoutRecoveryRoute;
  const isCartRoute = route.pathname === '/carrinho';
  const isCheckoutSuccessRoute = route.pathname === '/checkout/success';
  const isCheckoutPendingRoute = route.pathname === '/checkout/pending';
  const isCheckoutFailureRoute = route.pathname === '/checkout/failure';
  const isProductNotFoundRoute = route.pathname === '/produto-nao-encontrado';
  const isProductSuggestionRoute = route.pathname === '/produto-sugerido';
  const isAnalyticsDashboardRoute = route.pathname === '/admin/analytics';
  const isAdminLoginRoute = route.pathname === '/admin/login';
  const isInfluencerLoginRoute = route.pathname === '/influencer/login';
  const isInfluencerDashboardRoute = route.pathname === '/influencer';
  const isInfluencerInviteRoute = route.pathname.startsWith('/influencer/invite/');
  const influencerInviteToken = isInfluencerInviteRoute ? route.pathname.split('/').filter(Boolean).at(-1) : '';
  const orderDetailId = isOrderDetailRoute ? route.pathname.split('/').filter(Boolean).at(-1) : '';
  if (isCheckoutRecoveryRoute && !route.search.includes('recover=')) {
    const recoveryId = route.pathname.split('/').filter(Boolean).at(-1);
    window.history.replaceState(null, '', `/checkout?recover=${encodeURIComponent(recoveryId)}`);
    route.pathname = '/checkout';
    route.search = `?recover=${encodeURIComponent(recoveryId)}`;
  }
  const cartUiRendering = resolveCartUiRendering(route.pathname);
  const isAdminRoute = route.pathname.startsWith('/admin/');
  const isProtectedDashboardRoute = isAdminRoute || isInfluencerDashboardRoute;
  const isPromoReferralRouteActive = isPromoReferralRoute(route.pathname);

  useEffect(() => {
    if (isPromoReferralRouteActive || isProtectedDashboardRoute || isInfluencerInviteRoute) {
      return;
    }

    const referralContext = captureReferralParams({ search: route.search });

    if (referralContext.ref || referralContext.coupon || referralContext.utm_source || referralContext.utm_campaign) {
      trackReferralVisit({ ...referralContext, source_page: 'referral_capture', page_path: `${route.pathname}${route.search}${route.hash}` });
    }

    if (referralContext.coupon) {
      trackCouponDetected({ coupon: referralContext.coupon, source_page: 'referral_capture', page_path: `${route.pathname}${route.search}${route.hash}` });
    }
  }, [isPromoReferralRouteActive, isProtectedDashboardRoute, isInfluencerInviteRoute, route.hash, route.pathname, route.search]);

  useEffect(() => {
    const shouldNoIndexRoute = isPromoReferralRouteActive || isProtectedDashboardRoute || isAdminLoginRoute || isInfluencerLoginRoute || isInfluencerInviteRoute;

    if (!shouldNoIndexRoute) {
      return undefined;
    }

    const robotsMeta = document.querySelector('meta[name="robots"]') || document.createElement('meta');
    const previousContent = robotsMeta.getAttribute('content');
    const wasConnected = robotsMeta.isConnected;
    robotsMeta.setAttribute('name', 'robots');
    robotsMeta.setAttribute('content', 'noindex, nofollow');

    if (!wasConnected) {
      document.head.appendChild(robotsMeta);
    }

    return () => {
      if (previousContent) {
        robotsMeta.setAttribute('content', previousContent);
      } else if (!wasConnected) {
        robotsMeta.remove();
      } else {
        robotsMeta.removeAttribute('content');
      }
    };
  }, [isAdminLoginRoute, isInfluencerLoginRoute, isPromoReferralRouteActive, isProtectedDashboardRoute, isInfluencerInviteRoute]);

  useEffect(() => {
    if (!isPromoReferralRouteActive) {
      return undefined;
    }

    const result = applyPromoReferralRoute({ pathname: route.pathname, search: route.search, hash: route.hash });

    if (!result) {
      return undefined;
    }

    if (result.routeType === 'promo') {
      trackPromoRouteVisit(result.payload);
    } else {
      trackInfluencerRouteVisit(result.payload);
    }

    trackReferralApplied(result.payload);

    const redirectTimer = window.setTimeout(() => {
      navigateSpa(result.redirectTo);
    }, 900);

    return () => window.clearTimeout(redirectTimer);
  }, [isPromoReferralRouteActive, route.hash, route.pathname, route.search]);

  useEffect(() => {
    let routeName = 'home';

    if (isProductRoute) {
      routeName = 'product';
    } else if (isPromoReferralRouteActive) {
      routeName = 'promo_referral';
    } else if (isAnalyticsDashboardRoute) {
      routeName = 'admin_analytics';
    } else if (isInfluencerDashboardRoute) {
      routeName = 'influencer_dashboard';
    } else if (isInfluencerInviteRoute) {
      routeName = 'influencer_invite';
    } else if (isBrandRoute) {
      routeName = 'brand';
    } else if (isCatalogRoute) {
      routeName = 'catalog';
    } else if (isFaqRoute) {
      routeName = 'faq';
    } else if (isIdentityRoute) {
      routeName = 'olfactive_identity';
    } else if (isOrderDetailRoute) {
      routeName = 'order_detail';
    } else if (isCheckoutExperienceRoute) {
      routeName = 'checkout_experience';
    } else if (isCartRoute) {
      routeName = 'cart';
    } else if (isProductNotFoundRoute) {
      routeName = 'product_not_found';
    } else if (isProductSuggestionRoute) {
      routeName = 'product_suggestion';
    }

    if (!isProtectedDashboardRoute && !isInfluencerInviteRoute && !isPromoReferralRouteActive && !isAdminLoginRoute && !isInfluencerLoginRoute) {
      trackPageView({ path: `${route.pathname}${route.search}${route.hash}`, routeName });
    }
  }, [isProtectedDashboardRoute, isAnalyticsDashboardRoute, isBrandRoute, isCatalogRoute, isFaqRoute, isIdentityRoute, isCheckoutExperienceRoute, isOrderDetailRoute, isProductNotFoundRoute, isProductRoute, isInfluencerDashboardRoute, isInfluencerInviteRoute, isProductSuggestionRoute, isPromoReferralRouteActive, isAdminLoginRoute, isInfluencerLoginRoute, route.hash, route.pathname, route.search]);

  useEffect(() => {
    function updateRoute({ scrollToTop = true } = {}) {
      setRoute(getCurrentRoute());

      if (scrollToTop) {
        window.requestAnimationFrame(() => scrollToHashOrTop());
      }
    }

    function handlePopState() {
      updateRoute();
    }

    function handleDocumentClick(event) {
      const clickedElement = event.target instanceof Element ? event.target : null;
      const anchor = clickedElement?.closest('a[href]');

      if (!anchor || anchor.target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      let nextUrl;

      try {
        nextUrl = new URL(anchor.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const legacyRouteMap = {
        '#catalogo': '/catalogo',
        '#top': '/',
        '#atendimento': '/',
      };
      const legacyPath = nextUrl.pathname === '/' ? legacyRouteMap[nextUrl.hash] : null;
      const routePath = normalizeSpaPath(legacyPath || nextUrl.pathname).split(/[?#]/)[0];
      const routeHash = legacyPath && nextUrl.hash !== '#catalogo' ? nextUrl.hash : '';
      if (!isSafeSpaPath(routePath)) {
        return;
      }

      event.preventDefault();
      navigateSpa(`${routePath}${nextUrl.search}${routeHash}`);
    }

    window.requestAnimationFrame(() => scrollToHashOrTop({ smooth: false }));
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  return (
    <AuthProvider>
      <div className="relative flex min-h-screen flex-col overflow-x-clip bg-lazule-night text-lazule-mist">
      <MineralBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header immersiveProduct={isProductRoute} suppressCartUi={!cartUiRendering.renderCartDrawer} />
        <main key={`${route.pathname}${route.search}`} className="lazule-route-shell flex-1">
          {isPromoReferralRouteActive ? (
            <PromoReferralLanding route={route} />
          ) : isAdminLoginRoute ? (
            <AdminLogin />
          ) : isInfluencerLoginRoute ? (
            <AdminLogin experience="partner" />
          ) : isInfluencerInviteRoute ? (
            <InfluencerInvite token={influencerInviteToken} />
          ) : isInfluencerDashboardRoute ? (
            <RequireInfluencerOrAdmin>
              <InfluencerDashboard />
            </RequireInfluencerOrAdmin>
          ) : isAnalyticsDashboardRoute ? (
            <RequireAdmin>
              <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-16 text-lazule-mist/70" role="status" aria-live="polite">Refinando inteligência LAZULE…</div>}>
                <AnalyticsDashboard />
              </Suspense>
            </RequireAdmin>
          ) : isProductRoute ? (
            <AppErrorBoundary>
              <ProductDetails slug={route.productSlug} />
            </AppErrorBoundary>
          ) : isBrandRoute ? (
            <BrandPage slug={route.brandSlug} />
          ) : isCatalogRoute ? (
            <AppErrorBoundary>
              <ProductCatalog key={route.search} />
            </AppErrorBoundary>
          ) : isFaqRoute ? (
            <FAQ />
          ) : isIdentityRoute ? (
            <OlfactiveIdentityPortal />
          ) : isOrderDetailRoute ? (
            <OrderDetailPage orderId={orderDetailId} />
          ) : isCheckoutExperienceRoute ? (
            <CheckoutPage />
          ) : isCartRoute ? (
            <CartPage />
          ) : isCheckoutSuccessRoute ? (
            <CheckoutResultPage mode='success' />
          ) : isCheckoutPendingRoute ? (
            <CheckoutResultPage mode='pending' />
          ) : isCheckoutFailureRoute ? (
            <CheckoutResultPage mode='failure' />
          ) : isProductNotFoundRoute ? (
            <ProductNotFound key={route.search} />
          ) : isProductSuggestionRoute ? (
            <ProductSuggestion key={route.search} />
          ) : (
            <Home />
          )}
        </main>
        <Footer />
      </div>
        <WhatsAppButton hidden={isProductRoute || isProtectedDashboardRoute || isPromoReferralRouteActive || isInfluencerInviteRoute} />
      </div>
    </AuthProvider>
  );
}

export default App;
