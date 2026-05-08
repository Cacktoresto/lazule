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
import { getBrandSlugFromPath, getProductSlugFromPath } from './utils/productRouting';

function normalizeLegacyCatalogRoute() {
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

      const nextUrl = new URL(anchor.href);

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const legacyRouteMap = {
        '#catalogo': '/catalogo',
        '#top': '/',
        '#atendimento': '/',
      };
      const legacyPath = nextUrl.pathname === '/' ? legacyRouteMap[nextUrl.hash] : null;
      const routePath = legacyPath || nextUrl.pathname;
      const routeHash = legacyPath && nextUrl.hash !== '#catalogo' ? nextUrl.hash : '';
      const isSpaRoute =
        routePath === '/' ||
        routePath === '/catalogo' ||
        routePath === '/faq' ||
        routePath === '/produto-nao-encontrado' ||
        routePath === '/produto-sugerido' ||
        routePath.startsWith('/produto/') ||
        routePath.startsWith('/marca/');

      if (!isSpaRoute) {
        return;
      }

      event.preventDefault();
      window.history.pushState(null, '', `${routePath}${nextUrl.search}${routeHash}`);
      updateRoute();
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
        <Header />
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
      <WhatsAppButton />
    </div>
  );
}

export default App;
