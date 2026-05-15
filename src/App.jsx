import { useEffect, useState } from 'react';
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
import { getBrandSlugFromPath, getProductSlugFromPath, normalizeSpaPath } from './utils/productRouting';
import { navigateSpa } from './utils/navigation';
import { trackPageView } from './utils/analytics';

const SPA_ROUTE_PATTERN = /^(\/|\/catalogo\/?|\/faq\/?|\/produto-nao-encontrado\/?|\/produto-sugerido\/?|\/produto\/[^/]+\/?|\/marca\/[^/]+\/?)$/;

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
  const isProductNotFoundRoute = route.pathname === '/produto-nao-encontrado';
  const isProductSuggestionRoute = route.pathname === '/produto-sugerido';

  useEffect(() => {
    const routeName = isProductRoute
      ? 'product'
      : isBrandRoute
        ? 'brand'
        : isCatalogRoute
          ? 'catalog'
          : isFaqRoute
            ? 'faq'
            : isProductNotFoundRoute
              ? 'product_not_found'
              : isProductSuggestionRoute
                ? 'product_suggestion'
                : 'home';

    trackPageView({ path: `${route.pathname}${route.search}${route.hash}`, routeName });
  }, [isBrandRoute, isCatalogRoute, isFaqRoute, isProductNotFoundRoute, isProductRoute, isProductSuggestionRoute, route.hash, route.pathname, route.search]);

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
    <div className="relative min-h-screen overflow-x-clip bg-lazule-night text-lazule-mist">
      <MineralBackground />
      <div className="relative z-10">
        <Header immersiveProduct={isProductRoute} />
        <main>
          {isProductRoute ? (
            <ProductDetails slug={route.productSlug} />
          ) : isBrandRoute ? (
            <BrandPage slug={route.brandSlug} />
          ) : isCatalogRoute ? (
            <ProductCatalog key={route.search} />
          ) : isFaqRoute ? (
            <FAQ />
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
      <WhatsAppButton hidden={isProductRoute} />
    </div>
  );
}

export default App;
