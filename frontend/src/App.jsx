import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
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
import GiftingPage from './components/GiftingPage';
import { collectionsData } from './components/SignatureCollection/CollectionData';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import PaymentFailurePage from './components/PaymentFailurePage';
import MiniBag from './components/MiniBag';
import { API_BASE_URL } from './utils/config.js';
import { clearCart } from './utils/cartHelper.js';
import { CartStore } from './utils/store.js';


function App() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const getPageFromHash = () => {
    const fullHash = window.location.hash.replace('#', '');
    const hash = fullHash.split('?')[0];
    const policies = ['authenticity', 'about', 'shipping', 'returns', 'terms', 'privacy'];

    if (hash === 'wishlist') return 'wishlist';
    if (policies.includes(hash)) return 'policies';
    if (hash === 'profile') return 'profile';
    if (hash === 'admin') return 'admin';
    if (hash === 'shop' || hash === 'collection') return 'shop';
    if (hash === 'cart') return 'cart';
    if (hash === 'categories') return 'categories';
    if (hash === 'gifting') return 'gifting';
    if (hash.startsWith('product-')) return 'product';
    if (hash === 'payment-success') return 'payment-success';
    if (hash === 'payment-failure') return 'payment-failure';

    return 'home';
  };

  const getCategoryFromHash = () => {
    const fullHash = window.location.hash.replace('#', '');
    const hash = fullHash.split('?')[0];
    if (hash === 'wishlist') return 'wishlist';
    if (hash === 'shop' || hash === 'collection') {
      const params = new URLSearchParams(fullHash.split('?')[1] || '');
      return params.get('category') || 'all';
    }
    return 'all';
  };

  const [activePage, setActivePage] = useState(getPageFromHash);
  const [activeCategory, setActiveCategory] = useState(getCategoryFromHash);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch active products from backend database catalog
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
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
              family: 'Woody / Amber',
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

          // Verify that all CollectionData products exist in the database
          if (import.meta.env.DEV) {
            collectionsData.forEach(sp => {
              const found = dbProducts.find(dp => dp.slug === sp.slug || dp.id === sp.id);
              if (!found) {
                console.error(`[CRITICAL DEVELOPMENT ERROR] Product "${sp.name}" with slug/id "${sp.slug || sp.id}" is defined in CollectionData.js but is MISSING from the Neon Database!`);
              }
            });
          }

          setProducts(merged);
        } else {
          setProducts([]);
          if (import.meta.env.DEV) {
            console.error('[CRITICAL DEVELOPMENT ERROR] Product catalog fetch returned non-200 response.');
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic product catalog:', err);
        setProducts([]);
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
      setActiveCategory(getCategoryFromHash());

      const fullHash = window.location.hash.replace('#', '');
      const hash = fullHash.split('?')[0];

      if (hash.startsWith('product-')) {
        const id = hash.replace('product-', '');
        // Search in dynamic/merged products first
        const foundProduct = products.find(
          (p) => String(p.id) === String(id) || String(p.slug) === String(id)
        );

        if (foundProduct) {
          setSelectedProduct(foundProduct);
        } else if (import.meta.env.DEV) {
          console.error(`[CRITICAL DEVELOPMENT ERROR] Selected product "${id}" was not found in the database products list.`);
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

  useEffect(() => {
    if (!authLoaded) return;
    CartStore.setAuthenticated(isSignedIn);
    if (authLoaded && !isSignedIn) {
      clearCart();
    }
  }, [authLoaded, isSignedIn]);


  return (
    <div className="flex flex-col gap-0 min-h-screen">
      {activePage !== 'admin' && activePage !== 'cart' && activePage !== 'profile' && <DailyOfferPopup />}

      {/* Mini Bag — Global slide-out drawer, mounted at root so it overlays any page */}
      <MiniBag products={products} />
      
      {activePage !== 'admin' && (
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
        <div className={(activePage === 'admin' || activePage === 'cart' || activePage === 'profile' || activePage === 'gifting' || activePage === 'policies') ? '' : 'main-content-padding'} style={(activePage !== 'admin' && activePage !== 'cart' && activePage !== 'profile' && activePage !== 'gifting' && activePage !== 'policies') ? { backgroundColor: '#F7F3ED' } : {}}>
          {(activePage === 'shop' || activePage === 'wishlist') && (
            <SignatureCollection
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              products={products}
            />
          )}

          {activePage === 'product' && (
            <ProductPage
              product={selectedProduct}
              products={products}
              onBackToShop={() => {
                window.location.hash = 'shop';
              }}
            />
          )}

          {activePage === 'cart' && (
            <CartPage
              products={products}
              onBackToShop={() => {
                window.location.hash = 'shop';
              }}
            />
          )}

          {activePage === 'profile' && (
            <ProfilePage />
          )}

          {activePage === 'payment-success' && (
            <PaymentSuccessPage />
          )}

          {activePage === 'payment-failure' && (
            <PaymentFailurePage />
          )}

          {activePage === 'admin' && (
            <AdminPage />
          )}

          {activePage === 'policies' && <PoliciesPage />}

          {activePage === 'categories' && (
            <CategoriesPage
              onSelectCategory={(categoryKey) => {
                const normalized = (categoryKey || '').toLowerCase().trim();
                setActiveCategory(normalized);
                setActivePage('shop');
                window.location.hash = `shop?category=${normalized}`;
              }}
            />
          )}

          {activePage === 'gifting' && (
            <GiftingPage />
          )}
        </div>
      )}

      {activePage !== 'admin' && <Footer onNavigate={setActivePage} />}
    </div>
  );
}

export default App;
