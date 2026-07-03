import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { Routes, Route, useLocation, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
const SignatureCollection = lazy(() => import('./components/SignatureCollection'));
import Gifting from './components/Gifting';
import Pricing from './components/Pricing';
import Authenticity from './components/Authenticity';
import Footer from './components/Footer';
import ProductPage from './components/ProductPage';
import CartPage from './components/CartPage';
import CategoriesPage from './components/CategoriesPage';
import DailyOfferPopup from './components/DailyOfferPopup';
import { collectionsData } from './components/SignatureCollection/CollectionData';
const PoliciesPage = lazy(() => import('./components/Policies'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const GiftingPage = lazy(() => import('./components/GiftingPage'));
const PaymentSuccessPage = lazy(() => import('./components/PaymentSuccessPage'));
const PaymentFailurePage = lazy(() => import('./components/PaymentFailurePage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
import MiniBag from './components/MiniBag';
import HashRedirectCompatibility from './components/HashRedirectCompatibility';
import ScrollRestoration from './components/ScrollRestoration';
import { API_BASE_URL } from './utils/config.js';
import { clearCart } from './utils/cartHelper.js';
import { CartStore } from './utils/store.js';
import SEO from './components/SEO';


/**
 * Wrapper component that resolves `activePage` and `activeCategory` from the
 * current React Router location, so the legacy prop-driven components
 * (SEO, Navbar, Footer, DailyOfferPopup) continue to work without changes
 * to their internal logic yet.
 */
function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ---------------------------------------------------------------------------
  // Derive activePage & activeCategory from the URL pathname + search params
  // ---------------------------------------------------------------------------
  const activePage = useMemo(() => {
    let path = location.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    if (path === '/') return 'home';
    if (path === '/shop') return 'shop';
    if (path === '/wishlist') return 'wishlist';
    if (path === '/cart') return 'cart';
    if (path === '/categories') return 'categories';
    if (path === '/gifting') return 'gifting';
    if (path === '/profile') return 'profile';
    if (path === '/admin') return 'admin';
    if (path.startsWith('/product/')) return 'product';
    if (path === '/payment/success') return 'payment-success';
    if (path === '/payment/failure') return 'payment-failure';
    // Policy pages
    const policyPages = ['about', 'authenticity', 'shipping', 'refund', 'terms', 'privacy'];
    const segment = path.replace('/', '');
    if (policyPages.includes(segment)) return 'policies';
    return 'home';
  }, [location.pathname]);

  const activeCategory = useMemo(() => {
    let path = location.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    if (path === '/wishlist') return 'wishlist';
    if (path === '/shop') {
      return searchParams.get('category') || 'all';
    }
    return 'all';
  }, [location.pathname, searchParams]);

  // ---------------------------------------------------------------------------
  // Product catalog state (unchanged from original)
  // ---------------------------------------------------------------------------
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
            const staticProd = collectionsData.find(sp => sp.id === dbProd.slug || sp.id === dbProd.id);
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
              const found = dbProducts.find(dp => dp.slug === sp.id || dp.id === sp.id);
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

  // Resolve selected product from URL params when on a product page
  useEffect(() => {
    if (activePage === 'product' && products.length > 0) {
      let slug = location.pathname.replace('/product/', '');
      if (slug.endsWith('/')) {
        slug = slug.slice(0, -1);
      }
      const foundProduct = products.find(
        (p) => String(p.id) === String(slug) || String(p.slug) === String(slug)
      );
      if (foundProduct) {
        setSelectedProduct(foundProduct);
      } else if (import.meta.env.DEV) {
        console.error(`[CRITICAL DEVELOPMENT ERROR] Selected product "${slug}" was not found in the database products list.`);
      }
    }
  }, [activePage, products, location.pathname]);

  // ---------------------------------------------------------------------------
  // Convenience navigation callbacks passed to legacy components
  // ---------------------------------------------------------------------------
  const setActivePage = (page) => {
    const pageRouteMap = {
      home: '/',
      shop: '/shop',
      wishlist: '/wishlist',
      cart: '/cart',
      categories: '/categories',
      gifting: '/gifting',
      profile: '/profile',
      admin: '/admin',
      policies: '/about',
    };
    const target = pageRouteMap[page];
    if (target) {
      navigate(target);
    }
  };

  const setActiveCategory = (category) => {
    if (category === 'wishlist') {
      navigate('/wishlist');
    } else {
      navigate(`/shop?category=${category}`);
    }
  };

  // ---------------------------------------------------------------------------
  // Suspense fallback
  // ---------------------------------------------------------------------------
  const suspenseFallback = (
    <div className="py-20 text-center font-body text-[#1C1B18]/50 bg-[#F7F3ED] min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <i className="fas fa-circle-notch fa-spin text-lg" style={{ color: '#8B672F' }} />
        <span className="text-xs uppercase tracking-widest">Loading details...</span>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Determine layout flags
  // ---------------------------------------------------------------------------
  const showNavbar = activePage !== 'admin';
  const showFooter = activePage !== 'admin';
  const showDailyOffer = activePage !== 'admin' && activePage !== 'cart' && activePage !== 'profile';

  // Pages that get no padding/bg wrapper
  const noWrapperPages = ['home', 'admin', 'cart', 'profile', 'gifting', 'policies'];
  const needsWrapper = !noWrapperPages.includes(activePage);

  return (
    <div className="flex flex-col gap-0 min-h-screen">
      {/* Legacy hash URL compatibility redirects */}
      <HashRedirectCompatibility />
      {/* Scroll to top on navigation */}
      <ScrollRestoration />

      <a href="#main" className="skip-link">Skip to content</a>
      <SEO activePage={activePage} activeCategory={activeCategory} selectedProduct={selectedProduct} products={products} />
      {showDailyOffer && <DailyOfferPopup />}

      {/* Mini Bag — Global slide-out drawer, mounted at root so it overlays any page */}
      <MiniBag products={products} />
      
      {showNavbar && (
        <Navbar
          onNavigate={setActivePage}
          activePage={activePage}
          onSelectCategory={setActiveCategory}
          activeCategory={activeCategory}
          products={products}
        />
      )}

      <main id="main" className="flex-1">
        <Suspense fallback={suspenseFallback}>
          <Routes>
            {/* ─── Home ─── */}
            <Route path="/" element={
              <>
                <Hero />
                <Gifting
                  onSelectCategory={setActiveCategory}
                  onNavigate={setActivePage}
                />
                <Pricing />
                <Authenticity />
              </>
            } />

            {/* ─── Shop / Collection ─── */}
            <Route path="/shop" element={
              <div className="main-content-padding" style={{ backgroundColor: '#F7F3ED' }}>
                <SignatureCollection
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  products={products}
                />
              </div>
            } />

            {/* ─── Wishlist ─── */}
            <Route path="/wishlist" element={
              <div className="main-content-padding" style={{ backgroundColor: '#F7F3ED' }}>
                <SignatureCollection
                  activeCategory="wishlist"
                  onSelectCategory={setActiveCategory}
                  products={products}
                />
              </div>
            } />

            {/* ─── Product Detail ─── */}
            <Route path="/product/:slug" element={
              <div className="main-content-padding" style={{ backgroundColor: '#F7F3ED' }}>
                <ProductPage
                  product={selectedProduct}
                  products={products}
                  onBackToShop={() => navigate('/shop')}
                />
              </div>
            } />

            {/* ─── Cart / Checkout ─── */}
            <Route path="/cart" element={
              <CartPage
                products={products}
                onBackToShop={() => navigate('/shop')}
              />
            } />

            {/* ─── Categories ─── */}
            <Route path="/categories" element={
              <div className="main-content-padding" style={{ backgroundColor: '#F7F3ED' }}>
                <CategoriesPage
                  onSelectCategory={(categoryKey) => {
                    const normalized = (categoryKey || '').toLowerCase().trim();
                    navigate(`/shop?category=${normalized}`);
                  }}
                />
              </div>
            } />

            {/* ─── Profile ─── */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* ─── Admin ─── */}
            <Route path="/admin" element={<AdminPage />} />

            {/* ─── Gifting ─── */}
            <Route path="/gifting" element={<GiftingPage />} />

            {/* ─── Payment Results ─── */}
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/payment/failure" element={<PaymentFailurePage />} />

            {/* ─── Policy Pages ─── */}
            <Route path="/about" element={<PoliciesPage />} />
            <Route path="/authenticity" element={<PoliciesPage />} />
            <Route path="/shipping" element={<PoliciesPage />} />
            <Route path="/refund" element={<PoliciesPage />} />
            <Route path="/terms" element={<PoliciesPage />} />
            <Route path="/privacy" element={<PoliciesPage />} />

            {/* ─── 404 ─── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {showFooter && <Footer onNavigate={setActivePage} />}
    </div>
  );
}

export default App;
