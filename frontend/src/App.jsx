import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SignatureCollection from './components/SignatureCollection';
import Gifting from './components/Gifting';
import Pricing from './components/Pricing';
import Authenticity from './components/Authenticity';
import PoliciesPage from './components/Policies';
import Footer from './components/Footer';
import ProductPage from './components/ProductPage';
import CartPage from './components/CartPage';
import CategoriesPage from './components/CategoriesPage';
import ProfilePage from './components/ProfilePage';
import DailyOfferPopup from './components/DailyOfferPopup';
import AdminPage from './components/AdminPage';
import { collectionsData } from './components/SignatureCollection/CollectionData';

function App() {
  const getPageFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    const policies = ['authenticity', 'about', 'shipping', 'returns', 'terms', 'privacy'];

    if (policies.includes(hash)) return 'policies';
    if (hash === 'profile') return 'profile';
    if (hash === 'admin') return 'admin';
    if (hash === 'shop' || hash === 'collection') return 'shop';
    if (hash === 'cart') return 'cart';
    if (hash === 'categories') return 'categories';
    if (hash.startsWith('product-')) return 'product';

    return 'home';
  };

  const [activePage, setActivePage] = useState(getPageFromHash);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch active products from backend database catalog
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('http://localhost:5000/api/products');
        if (res.ok) {
          const dbProducts = await res.json();
          // Merge with static data for details not present in the DB schema (e.g. pyramid, characteristics, notes)
          const merged = dbProducts.map(dbProd => {
            const staticProd = collectionsData.find(sp => sp.slug === dbProd.slug || sp.id === dbProd.id);
            if (staticProd) {
              return {
                ...staticProd,
                ...dbProd,
                sizes: dbProd.sizes && dbProd.sizes.length > 0 ? dbProd.sizes : staticProd.sizes
              };
            }
            // Sensible fallbacks for newly added admin panel products
            return {
              tagline: dbProd.brand || 'Premium Fragrance',
              notes: [],
              tags: dbProd.featured ? ['featured'] : [],
              pyramid: {
                top: 'Fresh top notes',
                heart: 'Aromatic heart notes',
                base: 'Long-lasting base notes'
              },
              characteristics: {
                longevity: '8+ Hours',
                sillage: 'Moderate',
                gender: 'Unisex'
              },
              retailPrice: dbProd.price * 1.5,
              competitorPrice: dbProd.price * 1.25,
              ...dbProd
            };
          });
          setProducts(merged);
        } else {
          setProducts(collectionsData);
        }
      } catch (err) {
        console.error('Failed to load dynamic product catalog:', err);
        setProducts(collectionsData);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Update selected product based on URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const page = getPageFromHash();
      setActivePage(page);

      const hash = window.location.hash.replace('#', '');

      if (hash.startsWith('product-')) {
        const id = hash.replace('product-', '');
        // Search in dynamic/merged products first
        const foundProduct = products.find(
          (p) => String(p.id) === String(id) || String(p.slug) === String(id)
        ) || collectionsData.find(
          (p) => String(p.id) === String(id) || String(p.slug) === String(id)
        );

        if (foundProduct) {
          setSelectedProduct(foundProduct);
        }
      }
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [products]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePage]);


  return (
    <div className="flex flex-col gap-0 min-h-screen">
      {activePage !== 'admin' && activePage !== 'cart' && activePage !== 'profile' && <DailyOfferPopup />}
      
      {activePage !== 'admin' && activePage !== 'cart' && activePage !== 'profile' && (
        <Navbar
          onNavigate={setActivePage}
          activePage={activePage}
          onSelectCategory={setActiveCategory}
          activeCategory={activeCategory}
          products={products}
        />
      )}

      {activePage === 'home' && (
        <>
          <Hero />
          <Gifting
            onSelectCategory={setActiveCategory}
            onNavigate={setActivePage}
          />
          <Pricing />
          <Authenticity />
        </>
      )}

      {activePage !== 'home' && (
        <div className={(activePage === 'admin' || activePage === 'cart' || activePage === 'profile') ? '' : 'main-content-padding'}>
          {activePage === 'shop' && (
            <SignatureCollection
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              products={products}
            />
          )}

          {activePage === 'product' && (
            <ProductPage
              product={selectedProduct}
              onBackToShop={() => {
                window.location.hash = 'shop';
              }}
            />
          )}

          {activePage === 'cart' && (
            <CartPage
              onBackToShop={() => {
                window.location.hash = 'shop';
              }}
            />
          )}

          {activePage === 'profile' && (
            <ProfilePage />
          )}

          {activePage === 'admin' && (
            <AdminPage />
          )}

          {activePage === 'policies' && <PoliciesPage />}

          {activePage === 'categories' && (
            <CategoriesPage
              onSelectCategory={(categoryKey) => {
                setActiveCategory(categoryKey);
                setActivePage('shop');
                window.location.hash = 'collection';
              }}
            />
          )}
        </div>
      )}

      {activePage !== 'admin' && activePage !== 'cart' && activePage !== 'profile' && <Footer onNavigate={setActivePage} />}
    </div>
  );
}

export default App;