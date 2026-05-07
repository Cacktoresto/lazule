import { useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MineralBackground } from './components/MineralBackground';
import { Hero } from './components/Hero';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetails } from './components/ProductDetails';
import { WhatsAppButton } from './components/WhatsAppButton';
import { getProductSlugFromPath } from './utils/productRouting';

function getCurrentRoute() {
  return {
    pathname: window.location.pathname,
    productSlug: getProductSlugFromPath(window.location.pathname),
  };
}

function App() {
  const [route, setRoute] = useState(getCurrentRoute);
  const isProductRoute = route.pathname.startsWith('/produto/');

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

      const isCatalogAnchor = nextUrl.pathname === '/' && Boolean(nextUrl.hash);
      const isProductLink = nextUrl.pathname.startsWith('/produto/');

      if (!isCatalogAnchor && !isProductLink) {
        return;
      }

      event.preventDefault();
      window.history.pushState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      updateRoute({ scrollToTop: isProductLink });

      if (isCatalogAnchor) {
        requestAnimationFrame(() => {
          document.querySelector(nextUrl.hash)?.scrollIntoView({ behavior: 'smooth' });
        });
      }
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
          ) : (
            <>
              <Hero />
              <ProductCatalog />
            </>
          )}
        </main>
        <Footer />
      </div>
      <WhatsAppButton />
    </div>
  );
}

export default App;
