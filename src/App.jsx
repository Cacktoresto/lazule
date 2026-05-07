import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductCatalog } from './components/ProductCatalog';
import { WhatsAppButton } from './components/WhatsAppButton';

function App() {
  return (
    <div className="min-h-screen overflow-hidden bg-lazule-night text-lazule-mist">
      <Header />
      <main>
        <Hero />
        <ProductCatalog />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;
