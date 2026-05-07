import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { MineralBackground } from './components/MineralBackground';
import { Hero } from './components/Hero';
import { ProductCatalog } from './components/ProductCatalog';
import { WhatsAppButton } from './components/WhatsAppButton';

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-lazule-night text-lazule-mist">
      <MineralBackground />
      <div className="relative z-10">
        <Header />
        <main>
          <Hero />
          <ProductCatalog />
        </main>
        <Footer />
      </div>
      <WhatsAppButton />
    </div>
  );
}

export default App;
