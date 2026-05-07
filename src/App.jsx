import { useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MineralBackground } from './components/MineralBackground';
import { FAQ } from './components/FAQ';
import { Hero } from './components/Hero';
import { Home } from './components/Home';
import { BrandPage } from './components/BrandPage';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetails } from './components/ProductDetails';
import { WhatsAppButton } from './components/WhatsAppButton';
import { getBrandSlugFromPath, getProductSlugFromPath } from './utils/productRouting';

function normalizeLegacyCatalogRoute() {
  const { pathname, hash } = window.location;

  if (pathname !== '/') {
    return;
  }

  const legacyRouteMap = {
    '#catalogo': '/catalogo',
    '#atendimento': '/faq',
    '#top': '/',
  };
  const normalizedPath = legacyRouteMap[hash];

  if (normalizedPath) {
    window.history.replaceState(null, '', normalizedPath);
  }
}

function getCurrentRoute() {
  normalizeLegacyCatalogRoute();

  return {
    pathname: window.location.pathname,
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

  useEffect(() => {
    function updateRoute({ scrollToTop = true } = {}) {
      setRoute(getCurrentRoute());

      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

      const nextUrl = new URL(anchor.href);

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const legacyRouteMap = {
        '#catalogo': '/catalogo',
        '#atendimento': '/faq',
        '#top': '/',
      };
      const legacyPath = nextUrl.pathname === '/' ? legacyRouteMap[nextUrl.hash] : null;
      const routePath = legacyPath || nextUrl.pathname;
      const isSpaRoute =
        routePath === '/' ||
        routePath === '/catalogo' ||
        routePath === '/faq' ||
        routePath.startsWith('/produto/') ||
        routePath.startsWith('/marca/');

      if (!isSpaRoute) {
        return;
      }

      event.preventDefault();
      window.history.pushState(null, '', `${routePath}${nextUrl.search}`);
      updateRoute();
    }

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-lazule-night text-lazule-mist">
      <MineralBackground />
      <div className="relative z-10">
        <Header />
        <main>
          {isProductRoute ? (
            <ProductDetails slug={route.productSlug} />
          ) : isBrandRoute ? (
            <BrandPage slug={route.brandSlug} />
          ) : isCatalogRoute ? (
            <>
              <Hero />
              <ProductCatalog />
            </>
          ) : isFaqRoute ? (
            <FAQ />
          ) : (
            <Home />
          )}
        </main>
        <Footer />
      </div>
      <WhatsAppButton />
    </div>
  );
}

export default App;
