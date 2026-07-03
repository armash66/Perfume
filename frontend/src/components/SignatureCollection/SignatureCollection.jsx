import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { collectionsData } from './CollectionData';
import { addToCart, updateQuantity } from '../../utils/cartHelper';
import { showToast } from '../../utils/toast.js';
import { CartStore, WishlistStore } from '../../utils/store.js';
import { API_BASE_URL, sanitizeImageUrl } from '../../utils/config.js';

const categoryBanners = {
  summer: {
    title: 'Summer Perfumes',
    desc: 'Discover fresh, citrusy, and aquatic fragrances perfect for hot Indian summers. Explore summer perfume decants that keep you feeling fresh all day long.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
  },
  winter: {
    title: 'Winter Perfumes',
    desc: 'Explore warm, spicy, vanilla, and woody fragrances that perform exceptionally well in colder weather. Find the best winter perfume decants for lasting impressions.',
    image:'/decant_images/wintercc.png'
  },
  office: {
    title: 'Office Perfumes',
    desc: 'Professional, versatile, and crowd-pleasing fragrances ideal for work environments. Discover office-safe perfume decants that leave a refined impression.',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'
  },
  gym: {
    title: 'Gym Perfumes',
    desc: 'Stay fresh and confident through every workout with clean, energetic, and refreshing fragrances. Explore gym-friendly perfume decants designed to perform without being overpowering.',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80'
  },
  datenight: {
    title: 'Date Night Perfumes',
    desc: 'Turn heads with seductive and memorable fragrances crafted for special moments. Explore date night perfume decants that boost confidence and attraction.',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80'
  },
  party: {
    title: 'Party Perfumes',
    desc: 'Bold, attention-grabbing scents designed to stand out in any crowd. Find powerful party perfume decants with exceptional projection and longevity.',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'
  },
  her: {
    title: 'For Her',
    desc: 'Explore our collection of elegant, feminine scents. From soft, romantic florals and sweet gourmands to bold, sophisticated statement fragrances.',
    image:'/decant_images/for_her.png'
  },
  him: {
    title: 'For Him',
    desc: 'Discover bold, charismatic, and refined masculine scents. From fresh, energetic everyday profiles to rich, magnetic evening colognes.',
    image:'/decant_images/for_him.png'
  },
  newarrivals: {
    title: 'New Arrivals',
    desc: 'Explore the newest additions to our collection. Freshly curated fragrances and decants from the worlds most prestigious design houses.',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80'
  },
  bestsellers: {
    title: 'Best Sellers',
    desc: 'Discover our most sought-after fragrances. Highly requested by perfume connoisseurs, these are our top-performing decants.',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80'
  }
};

/**
 * Custom SVG Icon Components
 */
const CloseIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const BottleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const ShieldCheckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);

export default function SignatureCollection({
  activeCategory = 'all',
  onSelectCategory,
  products = [],
  collections = [],
  collectionsLoading = false,
  collectionsError = ''
}) {
  const { isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Sync URL search query parameters from React Router searchParams
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(decodeURIComponent(searchParam));
    } else {
      setSearchQuery('');
    }
  }, [searchParams]);

  const [wishlist, setWishlist] = useState(() => WishlistStore.getState());
  const [cartItems, setCartItems] = useState(() => CartStore.getState());
  const [mutatingItems, setMutatingItems] = useState(new Set());
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);

  useEffect(() => {
    const unsubscribeCart = CartStore.subscribe(setCartItems);
    const unsubscribeWishlist = WishlistStore.subscribe(setWishlist);
    const unsubscribeMutating = CartStore.subscribeMutating(setMutatingItems);
    return () => {
      unsubscribeCart();
      unsubscribeWishlist();
      unsubscribeMutating();
    };
  }, []);

  const toggleWishlist = (itemId, e) => {
    e.stopPropagation();
    const added = WishlistStore.toggle(itemId);
    showToast(added ? 'Added to your wishlist' : 'Removed from your wishlist', 'success');
  };

  const handleUpdateQuantity = async (item, sizeOption, newQty, currentRenderQty, e) => {
    if (e) e.stopPropagation();
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) return;

    const sizeLabel = sizeOption.size || 'Default Size';
    let id = sizeOption.variantId;
    if (!id) {
      const sizes = item.sizes || [];
      const match = sizes.find(s => s.size === sizeLabel);
      if (match) id = match.variantId;
    }
    const finalId = id || item.id;

    // Determine the latest quantity from the store
    const latestCart = CartStore.getState();
    const latestItem = latestCart.find(ci => (ci.variantId && finalId === ci.variantId) || (ci.id === finalId && ci.size === sizeLabel));
    const baseQty = latestItem ? latestItem.quantity : currentRenderQty;
    const delta = qty - currentRenderQty;
    const targetQty = baseQty + delta;

    if (targetQty < 0) return;
    if (targetQty > sizeOption.stock) {
      showToast(`Cannot exceed available stock. Only ${sizeOption.stock} available.`, "warning");
      return;
    }

    try {
      const token = isSignedIn ? await getToken() : null;
      await updateQuantity(finalId, sizeLabel, targetQty, token);
    } catch (err) {
      console.error(err);
    }
  };

  const [selectedCardSizes, setSelectedCardSizes] = useState({});
  const [addingItemId, setAddingItemId] = useState(null);
  const [isWishlistCtaHovered, setIsWishlistCtaHovered] = useState(false);

  const getCardSizeIndex = (itemId) => {
    return selectedCardSizes[itemId] !== undefined ? selectedCardSizes[itemId] : 0;
  };

  const handleSelectCardSize = (itemId, idx, e) => {
    e.stopPropagation();
    setSelectedCardSizes(prev => ({
      ...prev,
      [itemId]: idx
    }));
  };

  const handleCardAddToCart = async (item, sizeOption, e) => {
    e.stopPropagation();
    if (addingItemId || isUpdatingCart) return;
    setAddingItemId(item.id);
    setIsUpdatingCart(true);
    
    try {
      const token = isSignedIn ? await getToken() : null;
      const result = await addToCart(item, sizeOption, 1, token);
      if (result && result.success) {
        navigate('/cart');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingItemId(null);
      setIsUpdatingCart(false);
    }
  };

  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/categories`);
        if (res.ok) {
          const data = await res.json();
          setDbCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }
    fetchCategories();
  }, []);

  const [localCategory, setLocalCategory] = useState('all');
  const currentCategory = onSelectCategory ? activeCategory : localCategory;

  const handleCategorySelect = useCallback((categorySlug) => {
    if (onSelectCategory) {
      onSelectCategory(categorySlug);
    } else {
      setLocalCategory(categorySlug);
    }
    navigate(`/shop?category=${categorySlug}`);
  }, [onSelectCategory, navigate]);
  const activeCollection = useMemo(
    () => collections.find(collection => collection.slug === currentCategory),
    [collections, currentCategory]
  );

  const handleProductClick = (id) => {
    navigate(`/product/${id}`);
  };

  // Intercept category mapping for special items (e.g. from navbar clicks)
  const categoryPillsMap = {
    all: 'All',
    sets: 'Sets',
    decants: 'Decants',
    fullbottles: 'Full Bottles',
    wishlist: 'Wishlist'
  };

  // Helper to determine active pill ID based on selected category state
  const activePillId = useMemo(() => {
    if (categoryPillsMap[currentCategory]) {
      return currentCategory;
    }
    return 'all'; // Default pill is All if a tag filter is active
  }, [currentCategory]);

  // Handle clearing of all filters
  const handleClearFilters = () => {
    handleCategorySelect('all');
    setSearchQuery('');
    setSortBy('recommended');
  };

  // Olfactory filtering & search & sorting logic
  const filteredAndSortedItems = useMemo(() => {
    let items = products && products.length > 0 ? [...products] : collectionsData;
    const initialCount = items.length;

    if (import.meta.env.DEV && (!products || products.length === 0)) {
      console.warn('[DEVELOPMENT WARNING] SignatureCollection: No database products loaded. Using static collectionsData fallback.');
    }

    if (activeCollection) {
      const assignedProducts = activeCollection.products || [];
      items = assignedProducts.map(assignedProduct => (
        items.find(item => item.id === assignedProduct.id || item.slug === assignedProduct.slug) || assignedProduct
      ));
    }

    // 1. Filter by category
    if (currentCategory !== 'all' && !activeCollection) {
      if (currentCategory === 'wishlist') {
        items = items.filter(item => wishlist.includes(item.id));
      } else {
        const primaryCategories = ['decants', 'full-bottles', 'fullbottles', 'sets'];
        if (primaryCategories.includes(currentCategory)) {
          const targetSlug = currentCategory === 'fullbottles' ? 'full-bottles' : currentCategory;
          const matchedCat = dbCategories.find(c => c.slug === targetSlug);
          if (matchedCat) {
            items = items.filter(item => item.categoryId === matchedCat.id || item.category === matchedCat.slug);
          } else {
            items = items.filter(item => item.category === currentCategory || (currentCategory === 'full-bottles' && (item.category === 'fullbottles' || item.category === 'full-bottles')));
          }
        } else {
          // Tag-based or custom collections filtering (e.g. summer, winter, him, her)
          let tagToSearch = currentCategory;
          if (currentCategory === 'for-him' || currentCategory === 'him') tagToSearch = 'him';
          else if (currentCategory === 'for-her' || currentCategory === 'her') tagToSearch = 'her';
          else if (currentCategory === 'newarrivals' || currentCategory === 'new-arrivals') tagToSearch = 'new-arrival';
          else if (currentCategory === 'bestsellers' || currentCategory === 'best-sellers') tagToSearch = 'featured';

          // Resolve matching category in the database
          const matchedCat = dbCategories.find(c => 
            c.slug === currentCategory || 
            (currentCategory === 'him' && c.slug === 'for-him') ||
            (currentCategory === 'for-him' && c.slug === 'him') ||
            (currentCategory === 'her' && c.slug === 'for-her') ||
            (currentCategory === 'for-her' && c.slug === 'her') ||
            (currentCategory === 'newarrivals' && c.slug === 'new-arrivals') ||
            (currentCategory === 'bestsellers' && c.slug === 'best-sellers')
          );

          items = items.filter(item => {
            // Match database category by ID or Slug
            if (matchedCat && (item.categoryId === matchedCat.id || item.category === matchedCat.slug)) {
              return true;
            }
            // Direct slug string match
            if (item.category === currentCategory) {
              return true;
            }
            // Fallback tags matching
            if (item.tags && item.tags.includes(tagToSearch)) {
              return true;
            }
            // Fallback for custom metadata/featured flags
            if (tagToSearch === 'new-arrival' && item.featured) return true;
            if (tagToSearch === 'featured' && item.featured) return true;
            return false;
          });
        }
      }
    }
    const countAfterCategory = items.length;

    // 2. Real-time Search
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.notes.some(note => note.toLowerCase().includes(query)) ||
          item.description.toLowerCase().includes(query) ||
          item.tagline.toLowerCase().includes(query)
      );
    }
    const countAfterSearch = items.length;

    // 3. Sorting
    if (sortBy === 'price-low') {
      items.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      items.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'recommended') {
      // Prioritize items with 'featured' tag
      items.sort((a, b) => {
        const aFeat = a.tags && a.tags.includes('featured') ? 1 : 0;
        const bFeat = b.tags && b.tags.includes('featured') ? 1 : 0;
        return bFeat - aFeat;
      });
    }

    return items;
  }, [activeCollection, currentCategory, products, searchQuery, sortBy, dbCategories]);

  // Open & Close Concierge drawer
  const openQuickView = (item) => {
    setSelectedItem(item);
    setSelectedSizeIndex(0);
    document.body.style.overflow = 'hidden';
  };

  const closeQuickView = () => {
    setSelectedItem(null);
    document.body.style.overflow = '';
  };

  // Accessibility: Escape key closes Quick View drawer
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedItem) {
        closeQuickView();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedItem]);

  // Breadcrumb dynamic text
  const breadcrumbText = useMemo(() => {
    if (currentCategory === 'all') return 'SHOP ALL';
    if (currentCategory === 'wishlist') return 'MY WISHLIST';
    if (currentCategory === 'decants') return 'DECANTS';
    if (currentCategory === 'fullbottles') return 'FULL BOTTLES';
    if (currentCategory === 'sets') return 'SETS';
    if (currentCategory === 'newarrivals') return 'NEW ARRIVALS';
    
    // Format tag labels (e.g. datenight -> DATE NIGHT)
    const tagsMap = {
      summer: 'SUMMER FRAGRANCES',
      winter: 'WINTER FRAGRANCES',
      office: 'OFFICE FRAGRANCES',
      gym: 'GYM FRAGRANCES',
      datenight: 'DATE NIGHT FRAGRANCES',
      party: 'PARTY FRAGRANCES',
      her: 'FOR HER',
      him: 'FOR HIM'
    };
    return tagsMap[currentCategory] || currentCategory.toUpperCase();
  }, [currentCategory]);

  const drawerItemMutating = useMemo(() => {
    if (!selectedItem) return false;
    const drawerOption = selectedItem.sizes[selectedSizeIndex] || { size: 'Default' };
    return mutatingItems.has(drawerOption.variantId) || 
           mutatingItems.has((drawerOption.variantId || selectedItem.id) + '_' + drawerOption.size) ||
           mutatingItems.has(selectedItem.id + '_' + drawerOption.size);
  }, [selectedItem, selectedSizeIndex, mutatingItems]);

  return (
    <section className="relative bg-[#F7F3ED] pt-6 pb-16 md:pt-8 md:pb-20 lg:pt-10 lg:pb-24 overflow-hidden select-none font-body text-[#1C1B18]">
      {/* Background visual graphics */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #C9A46A 1px, transparent 1px), linear-gradient(to bottom, #C9A46A 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(201,164,106,0.03)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(44,41,38,0.02)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-[clamp(1.5rem,4vw,3.5rem)] relative z-10">
        {/* Category Banner or normal breadcrumbs */}
        {(() => {
          const activeBanner = activeCollection ? {
            title: activeCollection.name,
            desc: activeCollection.description,
            image: activeCollection.imageUrl
          } : categoryBanners[currentCategory];
          if (activeBanner) {
            return (
              <div 
                className="collection-hero-banner w-full relative overflow-hidden mb-6 md:mb-8 rounded-3xl shadow-sm border border-black/5"
                role="banner"
                aria-label={`${activeBanner.title} collection`}
              >
                {/* Background image with safe object-fit for any uploaded image */}
                <img 
                  src={sanitizeImageUrl(activeBanner.image)} 
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full z-0"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                  }}
                />

                {/* Intelligent 4-stop horizontal gradient overlay — guarantees text readability on ANY image */}
                <div 
                  className="absolute inset-0 z-10" 
                  style={{ 
                    background: 'linear-gradient(90deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.05) 100%)'
                  }}
                />
                
                {/* Text Safe Zone — content container with constrained width */}
                <div className="absolute inset-0 flex items-center px-5 sm:px-7 md:px-10 lg:px-14 z-20">
                  <div 
                    className="collection-hero-content text-left"
                    style={{
                      maxWidth: '500px',
                    }}
                  >
                    <h2 
                      className="font-heading text-white mb-3"
                      style={{
                        color: '#FFFFFF',
                        fontWeight: 400,
                        lineHeight: 1.05,
                        letterSpacing: '-0.02em',
                        fontSize: 'clamp(2rem, 5vw, 5rem)',
                        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                    >
                      {activeBanner.title}
                    </h2>
                    <p 
                      className="leading-relaxed"
                      style={{
                        color: 'rgba(255,255,255,0.92)',
                        textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                        fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                        maxWidth: '520px',
                        lineHeight: 1.6,
                      }}
                    >
                      {activeBanner.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          return (
            /* Normal Breadcrumbs */
            <div className="text-[0.6rem] font-bold tracking-[3px] uppercase mb-3 text-left" style={{ color: '#3A3632' }}>
              HOME <span className="mx-1" style={{ color: '#8B672F' }}>/</span> <span style={{ color: '#8B672F' }}>{breadcrumbText}</span>
            </div>
          );
        })()}

        {/* Title Row */}
        {currentCategory === 'wishlist' ? (
          <div className="mb-8 text-left">
            <h2 className="font-heading text-3xl lg:text-4xl font-light tracking-wide uppercase" style={{ color: '#2C2926' }}>
              My Wishlist
            </h2>
            <p className="text-xs font-body mt-2 uppercase tracking-wider" style={{ color: '#5A5550' }}>
              {filteredAndSortedItems.length} Saved Fragrance{filteredAndSortedItems.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-3 h-px w-16" style={{ backgroundColor: '#8B672F' }} />
          </div>
        ) : !categoryBanners[currentCategory] && !activeCollection && (
          <div className="mb-8 text-left">
            <h2 className="font-heading text-3xl lg:text-4xl font-light tracking-wide" style={{ color: '#2C2926' }}>
              Fragrance Collection
            </h2>
            <div className="mt-3 h-px w-16" style={{ backgroundColor: '#8B672F' }} />
          </div>
        )}

        {/* Unified Control Bar (Filters on Left, Search + Sort on Right) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 pb-3 md:pb-4 border-b mb-6 md:mb-8" style={{ borderBottomColor: '#D8D1C7' }}>
          {/* Left side intentionally empty — filter pills removed */}
          <div className="hidden md:block" />
          {/* Right: Search + Sort controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
            {/* Search input container */}
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search fragrances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-[320px] pl-0 pr-10 py-1.5 rounded-none border-b bg-transparent outline-none text-xs tracking-wider transition-all duration-300 min-h-[44px] placeholder-policy-secondary"
                style={{
                  borderBottomColor: '#D8D1C7',
                  color: '#2C2926',
                }}
              />
              <i className="fas fa-search absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#3A3632' }}></i>
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative z-30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSortOpen(!isSortOpen);
                }}
                className="flex items-center justify-between gap-3 px-0 py-1.5 bg-transparent border-b transition-colors text-[0.75rem] font-medium tracking-[0.05em] cursor-pointer min-h-[44px]"
                style={{
                  borderBottomColor: '#D8D1C7',
                  color: '#2C2926',
                }}
              >
                <span>
                  {sortBy === 'recommended' && 'Recommended'}
                  {sortBy === 'price-low' && 'Price: Low to High'}
                  {sortBy === 'price-high' && 'Price: High to Low'}
                </span>
                <i className={`fas fa-chevron-down text-[8px] transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} style={{ color: '#3A3632' }} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsSortOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 mt-1 w-[150px] bg-white border shadow-sm z-20 py-1"
                      style={{ borderColor: '#D8D1C7' }}
                    >
                      {[
                        { value: 'recommended', label: 'Recommended' },
                        { value: 'price-low', label: 'Price: Low to High' },
                        { value: 'price-high', label: 'Price: High to Low' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value);
                            setIsSortOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-[0.75rem] font-medium cursor-pointer transition-colors duration-200 hover:bg-[#F7F3ED]/40"
                          style={{
                            backgroundColor: sortBy === opt.value ? '#F7F3ED' : 'transparent',
                            color: sortBy === opt.value ? '#2C2926' : '#5A5550',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Dynamic Products Grid */}
        {collectionsLoading && currentCategory !== 'all' ? (
          <div className="py-20 text-center text-black/50">Loading this collection...</div>
        ) : collectionsError && currentCategory !== 'all' ? (
          <div className="py-20 text-center text-red-700">{collectionsError}</div>
        ) : filteredAndSortedItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-6 lg:gap-x-8 gap-y-8 md:gap-y-12 lg:gap-y-16">
            {filteredAndSortedItems.map((item) => {
              const cardSizeIdx = getCardSizeIndex(item.id);
              const cardOption = item.sizes && item.sizes[cardSizeIdx] ? item.sizes[cardSizeIdx] : { size: 'Default' };
              const itemMutating = mutatingItems.has(cardOption.variantId) || 
                                   mutatingItems.has((cardOption.variantId || item.id) + '_' + cardOption.size) ||
                                   mutatingItems.has(item.id + '_' + cardOption.size);

              return (
                <div
                  key={item.id}
                  onClick={() => handleProductClick(item.id)}
                  className="
                    group h-full flex flex-col bg-transparent rounded-none
                    border-0 shadow-none overflow-hidden cursor-pointer
                  "
                >
                  {/* Product Image and Badges */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#F7F3ED]/30">
                    {item.image && item.image.trim() !== "" ? (
                      <img
                        src={sanitizeImageUrl(item.image)}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-102"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F1ECE4] relative group-hover:scale-102 transition-transform duration-700 ease-out">
                        <div className="text-4xl md:text-5xl font-heading font-light tracking-widest border rounded-full w-20 h-20 flex items-center justify-center bg-white/40 shadow-inner" style={{ color: '#8B672F', borderColor: 'rgba(139,103,47,0.2)' }}>
                          {item.name ? item.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className="text-[0.65rem] tracking-[0.2em] font-body uppercase mt-4 font-semibold" style={{ color: '#8B672F' }}>
                          {item.brand || 'Decant Atelier'}
                        </div>
                      </div>
                    )}

                    {/* Wishlist Heart Icon Button */}
                    <button
                      onClick={(e) => toggleWishlist(item.id, e)}
                      className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-black/5 flex items-center justify-center hover:text-[#FF003C] hover:bg-white transition-all duration-300 shadow-sm cursor-pointer"
                      style={{ color: '#2C2926' }}
                      aria-label="Toggle wishlist"
                    >
                      <i className={`${wishlist.includes(item.id) ? 'fas fa-heart text-[#FF003C]' : 'far fa-heart'}`} />
                    </button>

                    {/* Overlays Badges */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none items-start">
                      {item.tags && item.tags.includes('featured') && (
                        <span className="text-[0.55rem] font-bold tracking-[0.15em] uppercase bg-[#FEFCF9]/90 backdrop-blur-[2px] px-2 py-0.5" style={{ color: '#8B672F' }}>
                          BESTSELLER
                        </span>
                      )}
                      {item.tags && item.tags.includes('new-arrival') && (
                        <span className="text-[0.55rem] font-bold tracking-[0.15em] uppercase bg-[#FEFCF9]/90 backdrop-blur-[2px] px-2 py-0.5" style={{ color: '#2C2926' }}>
                          NEW
                        </span>
                      )}
                      {item.tags && item.tags.includes('low-stock') && (
                        <span className="text-[0.55rem] font-bold tracking-[0.15em] uppercase text-[#E67E22] bg-[#FEFCF9]/90 backdrop-blur-[2px] px-2 py-0.5">
                          LIMITED
                        </span>
                      )}
                      {item.tags && item.tags.includes('out-of-stock') && (
                        <span className="text-[0.55rem] font-bold tracking-[0.15em] uppercase text-[#FF003C] bg-[#FEFCF9]/90 backdrop-blur-[2px] px-2 py-0.5">
                          SOLD OUT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info block */}
                  <div className="pt-4 flex flex-col flex-1">
                    {/* Brand / Category Badge */}
                    <span className="text-[0.6rem] tracking-[0.15em] uppercase font-bold text-left block mb-1" style={{ color: '#8B672F' }}>
                      {item.category === 'sets' ? 'CURATED SET' : (item.brand || 'FRAGRANCE')}
                    </span>

                    {/* Product Title */}
                    <h3 className="font-heading text-[0.95rem] font-normal mb-1 tracking-wide leading-tight group-hover:text-policy-gold transition-colors duration-300 line-clamp-1 text-left" style={{ color: '#3A3632' }}>
                      {item.name}
                    </h3>

                    {/* Scent Profile notes */}
                    {item.notes && item.notes.length > 0 && (
                      <div className="text-[0.7rem] text-left font-light tracking-wide mb-1.5 font-body" style={{ color: '#5A5550' }}>
                        {item.notes.slice(0, 2).join(' • ')}
                      </div>
                    )}

                    {/* Selected size price */}
                    <div className="text-xs font-semibold mb-3 text-left" style={{ color: '#2C2926' }}>
                      ₹{(() => {
                        const priceVal = item.sizes && item.sizes[cardSizeIdx] ? item.sizes[cardSizeIdx].price : item.price;
                        return priceVal.toLocaleString('en-IN');
                      })()}
                    </div>

                    {/* Size selectors */}
                    <div className="min-h-[36px] mb-4 flex items-center justify-start overflow-visible">
                      {item.sizes && item.sizes.length > 0 ? (
                        <div className="flex flex-wrap gap-5 py-1 items-center w-full overflow-visible">
                          {item.sizes.map((sz, idx) => {
                            const isSelected = cardSizeIdx === idx;
                            const sizeLabel = sz.size.split(' ')[0].toUpperCase();
                            const isOutOfStock = item.tags && item.tags.includes('out-of-stock');
                            
                            if (isOutOfStock) {
                              return (
                                <button
                                  key={idx}
                                  disabled
                                  className="relative py-1 text-[0.68rem] tracking-widest font-normal text-black/30 select-none cursor-not-allowed uppercase transition-colors duration-300 focus:outline-none"
                                  style={{ textDecoration: 'line-through' }}
                                >
                                  {sizeLabel}
                                </button>
                              );
                            }
                            
                            return (
                              <button
                                key={idx}
                                onClick={(e) => handleSelectCardSize(item.id, idx, e)}
                                disabled={isUpdatingCart || itemMutating}
                                className="relative py-1 text-[0.68rem] tracking-widest uppercase cursor-pointer select-none focus:outline-none transition-colors duration-300 min-h-[32px] flex items-center justify-center focus-visible:ring-1 focus-visible:ring-black/10 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="transition-colors duration-300 hover:text-policy-primary" style={{
                                  color: isSelected ? '#2C2926' : '#5A5550',
                                  fontWeight: isSelected ? 500 : 400
                                }}>
                                  {sizeLabel}
                                </span>
                                {isSelected && (
                                  <motion.div
                                    layoutId={`activeCardSizeUnderline-${item.id}`}
                                    className="absolute bottom-0 left-0 right-0 h-[1.5px]"
                                    style={{ backgroundColor: '#8B672F' }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-0" />
                      )}
                    </div>

                    {/* Add to Cart / Sold Out / Quantity Adjuster Button */}
                    {(() => {
                      const isOutOfStock = item.tags && item.tags.includes('out-of-stock');
                      const isAdding = addingItemId === item.id;
                      
                      if (isOutOfStock) {
                        return (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-none border text-[0.65rem] font-bold tracking-widest uppercase text-center cursor-not-allowed mt-auto min-h-[44px]"
                            style={{
                              borderColor: 'rgba(216,209,199,0.6)',
                              backgroundColor: 'rgba(239,232,221,0.3)',
                              color: 'rgba(116,111,105,0.6)',
                            }}
                          >
                            SOLD OUT
                          </button>
                        );
                      }

                      // Check if item is already in the cart with this size
                      const cartItem = cartItems.find(ci => ci.id === item.id && ci.size === cardOption.size);
                      if (cartItem) {
                        return (
                          <div className="flex items-center justify-between gap-2 mt-auto w-full min-h-[44px]">
                            <button
                              onClick={(e) => handleUpdateQuantity(item, cardOption, cartItem.quantity - 1, cartItem.quantity, e)}
                              className="w-10 h-10 rounded-none border flex items-center justify-center text-sm transition-all duration-300 bg-transparent cursor-pointer font-bold"
                              style={{
                                borderColor: '#D8D1C7',
                                color: '#2C2926',
                              }}
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="font-semibold text-[0.65rem] tracking-wider uppercase text-center flex-1" style={{ color: '#2C2926' }}>
                              {cartItem.quantity} IN BAG
                            </span>
                            <button
                              onClick={(e) => handleUpdateQuantity(item, cardOption, cartItem.quantity + 1, cartItem.quantity, e)}
                              className="w-10 h-10 rounded-none border flex items-center justify-center text-sm transition-all duration-300 bg-transparent cursor-pointer font-bold"
                              style={{
                                borderColor: '#D8D1C7',
                                color: '#2C2926',
                              }}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        );
                      }
                      
                      return (
                        <button
                          onClick={(e) => handleCardAddToCart(item, cardOption, e)}
                          disabled={isAdding || isUpdatingCart || itemMutating}
                          className="w-full py-2.5 rounded-none border text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-300 mt-auto cursor-pointer min-h-[44px] disabled:opacity-50"
                          style={{
                            backgroundColor: (isAdding || isUpdatingCart || itemMutating) ? '#2C2926' : 'transparent',
                            borderColor: '#2C2926',
                            color: (isAdding || isUpdatingCart || itemMutating) ? '#FFFFFF' : '#2C2926',
                          }}
                        >
                          {isAdding || itemMutating ? (
                            <span className="flex items-center justify-center gap-1.5">
                              <i className="fas fa-spinner animate-spin"></i>
                              ADDING...
                            </span>
                          ) : (
                            'ADD TO CART'
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : currentCategory === 'wishlist' ? (
          <div className="text-center py-24 bg-[#FEFCF9] border rounded-none p-10 shadow-sm max-w-xl mx-auto" style={{ borderColor: '#D8D1C7' }}>
            <i className="far fa-heart text-5xl mb-4 block" style={{ color: '#8B672F' }}></i>
            <h3 className="font-heading text-xl font-light mb-2 uppercase tracking-wide" style={{ color: '#3A3632' }}>Your wishlist is empty.</h3>
            <p className="text-xs leading-relaxed mb-6 font-body" style={{ color: '#5A5550' }}>
              Explore our boutique decants and curate your personal fragrance wishlist.
            </p>
            <button
              onClick={() => { navigate('/shop'); }}
              onMouseEnter={() => setIsWishlistCtaHovered(true)}
              onMouseLeave={() => setIsWishlistCtaHovered(false)}
              className="px-6 py-3 rounded-none text-[0.7rem] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-sm"
              style={{
                backgroundColor: isWishlistCtaHovered ? '#8B672F' : '#1C1B18',
                color: '#ffffff',
                fill: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              DISCOVER SCENTS
              <span style={{ display: 'inline-block', transition: 'transform 0.3s ease', transform: isWishlistCtaHovered ? 'translateX(4px)' : 'none' }}>→</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-24 bg-white/40 border rounded-none p-10 shadow-sm" style={{ borderColor: '#D8D1C7' }}>
            <i className="fas fa-search text-5xl mb-4 block" style={{ color: '#5A5550' }}></i>
            <h3 className="font-heading text-xl font-light mb-2" style={{ color: '#3A3632' }}>No Scents Found</h3>
            <p className="text-xs font-body" style={{ color: '#5A5550' }}>
              Try adjusting your filters, search term, or sorting option.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-6 px-6 py-3 rounded-none text-white text-[0.7rem] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-sm"
              style={{ backgroundColor: '#2C2926' }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Concierge Drawer Panel Overlay */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center lg:items-stretch lg:justify-end pointer-events-none">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeQuickView}
              className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
            />

            {/* Slide-over Drawer Panel / Centered Modal */}
            <motion.div
              initial={typeof window !== 'undefined' && window.innerWidth < 1024 ? { opacity: 0, y: 50, scale: 0.95 } : { x: '100%' }}
              animate={typeof window !== 'undefined' && window.innerWidth < 1024 ? { opacity: 1, y: 0, scale: 1 } : { x: 0 }}
              exit={typeof window !== 'undefined' && window.innerWidth < 1024 ? { opacity: 0, y: 50, scale: 0.95 } : { x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="
                relative bg-[#F7F3ED] shadow-2xl flex flex-col overflow-hidden pointer-events-auto
                w-[calc(100vw-24px)] max-h-[90vh] rounded-lg border border-black/8
                lg:h-full lg:max-h-none lg:w-full lg:max-w-2xl lg:rounded-none lg:border-l lg:border-t-0 lg:border-r-0 lg:border-b-0
              "
            >
              {/* Header panel controls */}
              <div className="sticky top-0 bg-[#F7F3ED] z-30 flex-shrink-0 border-b border-black/8 p-6 sm:px-10 lg:px-12 flex items-center justify-between">
                <span className="text-[0.62rem] font-bold tracking-[3px] uppercase" style={{ color: '#8B672F' }}>
                  Interactive Concierge Sizing
                </span>
                <button
                  onClick={closeQuickView}
                  aria-label="Close panel"
                  className="
                    group w-9 h-9 rounded-full bg-black/5 hover:bg-[#2C2926]
                    flex items-center justify-center text-[#2C2926] hover:text-white
                    transition-all duration-300 hover:rotate-90 cursor-pointer
                  "
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content Body */}
              <div 
                className="flex-1 overflow-y-auto scrollbar-hide p-6 sm:p-10 lg:p-12 pb-6"
                style={{ overscrollBehavior: 'contain' }}
              >
                {/* Main Product Layout inside Drawer */}
                <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
                  {/* Left Column: Image & Details */}
                  <div>
                    <div className="aspect-square rounded overflow-hidden bg-white border border-black/5 shadow-md">
                      <img
                        src={selectedItem.image}
                        alt={selectedItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Sourcing certificate box */}
                    <div className="mt-6 p-4 rounded-none bg-[#EFE8DD]/70 border" style={{ borderColor: '#D8D1C7' }}>
                      <div className="flex gap-2.5 items-start">
                        <ShieldCheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#8B672F' }} />
                        <div>
                          <p className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: '#2C2926' }}>
                            Authenticity Promise
                          </p>
                          <p className="text-[0.65rem] leading-relaxed mt-1 font-body" style={{ color: '#1C1B18' }}>
                            Sourced directly from batch-tracked original retail bottles. Hand-decanted to order.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Descriptions, Pyramids, and Size Selector */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="text-[0.62rem] font-bold tracking-widest uppercase px-3 py-1 rounded-none inline-block mb-4" style={{ color: '#8B672F', backgroundColor: 'rgba(139,103,47,0.08)' }}>
                        {selectedItem.category === 'decants' ? 'Decant Scent' : selectedItem.category === 'sets' ? 'Collection Set' : 'Retail Bottle'}
                      </span>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h2 className="font-heading text-3xl font-light tracking-wide leading-tight" style={{ color: '#2C2926', margin: 0 }}>
                          {selectedItem.name}
                        </h2>
                        <button
                          onClick={(e) => toggleWishlist(selectedItem.id, e)}
                          className="w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 hover:scale-105 shadow-sm cursor-pointer min-w-[36px] flex-shrink-0"
                          style={{
                            borderColor: wishlist.includes(selectedItem.id) ? 'rgba(255, 0, 60, 0.3)' : '#D8D1C7',
                            backgroundColor: wishlist.includes(selectedItem.id) ? 'rgba(255, 0, 60, 0.05)' : '#FEFCF9',
                            color: wishlist.includes(selectedItem.id) ? '#FF003C' : '#2C2926'
                          }}
                          aria-label="Toggle wishlist"
                        >
                          <i className={`${wishlist.includes(selectedItem.id) ? 'fas fa-heart text-[#FF003C]' : 'far fa-heart'}`} />
                        </button>
                      </div>
                      <p className="text-[0.78rem] italic tracking-wide mb-4" style={{ color: '#8B672F' }}>
                        {selectedItem.tagline}
                      </p>
                      <p className="text-[0.82rem] leading-relaxed font-body mb-6" style={{ color: '#1C1B18' }}>
                        {selectedItem.description}
                      </p>

                      {/* Olfactory Pyramid Accordion */}
                      <div className="mb-8 p-5 bg-[#FEFCF9] border" style={{ borderColor: '#D8D1C7' }}>
                        <h3 className="text-[0.72rem] font-bold uppercase tracking-wider mb-4 pb-2 border-b" style={{ color: '#3A3632', borderBottomColor: '#D8D1C7' }}>
                          Olfactory Pyramid
                        </h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold uppercase tracking-wide" style={{ color: '#8B672F' }}>Top notes:</span>
                            <span style={{ color: '#1C1B18' }}>{selectedItem.pyramid.top}</span>
                          </div>
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold uppercase tracking-wide" style={{ color: '#8B672F' }}>Heart notes:</span>
                            <span style={{ color: '#1C1B18' }}>{selectedItem.pyramid.heart}</span>
                          </div>
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold uppercase tracking-wide" style={{ color: '#8B672F' }}>Base notes:</span>
                            <span style={{ color: '#1C1B18' }}>{selectedItem.pyramid.base}</span>
                          </div>
                        </div>
                      </div>

                      {/* Size Selector */}
                      <div className="mb-6">
                        <h3 className="text-[0.72rem] font-bold uppercase tracking-wider mb-3" style={{ color: '#3A3632' }}>
                          Select Product Option
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedItem.sizes.map((sz, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSizeIndex(idx)}
                              disabled={isUpdatingCart || drawerItemMutating}
                              className="p-3.5 rounded-none border text-left cursor-pointer transition-all duration-300 min-h-[44px] disabled:opacity-50"
                              style={{
                                backgroundColor: selectedSizeIndex === idx ? '#2C2926' : '#FEFCF9',
                                borderColor: selectedSizeIndex === idx ? '#2C2926' : '#D8D1C7',
                                color: selectedSizeIndex === idx ? '#FFFFFF' : '#2C2926'
                              }}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[0.72rem] font-bold" style={{ color: selectedSizeIndex === idx ? '#FEFCF9' : '#2C2926' }}>
                                  {sz.size}
                                </span>
                                <span className="text-[0.8rem] font-bold">
                                  ₹{sz.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <span className="text-[0.58rem] block" style={{ color: selectedSizeIndex === idx ? 'rgba(255,255,255,0.8)' : '#5A5550' }}>
                                {sz.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Purchase Strip */}
              <div 
                className="sticky bottom-0 bg-[#F7F3ED]/95 backdrop-blur-md border-t p-6 sm:px-10 lg:px-12 flex items-center justify-between gap-6 z-20 flex-shrink-0" 
                style={{ borderTopColor: '#D8D1C7' }}
              >
                <div>
                  <span className="text-[0.62rem] uppercase tracking-wider block" style={{ color: '#5A5550' }}>Selected Option Price</span>
                  <span className="text-2xl font-semibold font-heading tracking-wide" style={{ color: '#2C2926' }}>
                    ₹{selectedItem.sizes[selectedSizeIndex]?.price.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex gap-3 flex-1 max-w-xs justify-end">
                  <button
                    onClick={async () => {
                      if (addingItemId || isUpdatingCart || drawerItemMutating) return;
                      const sizeOption = selectedItem.sizes[selectedSizeIndex];
                      if (!sizeOption) return;
                      setAddingItemId(selectedItem.id);
                      setIsUpdatingCart(true);
                      try {
                        const token = isSignedIn ? await getToken() : null;
                        const result = await addToCart(selectedItem, sizeOption, 1, token);
                        if (result && result.success) {
                          closeQuickView();
                          navigate('/cart');
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setAddingItemId(null);
                        setIsUpdatingCart(false);
                      }
                    }}
                    disabled={addingItemId === selectedItem.id || isUpdatingCart || drawerItemMutating || !selectedItem.sizes[selectedSizeIndex] || selectedItem.sizes[selectedSizeIndex].stock <= 0}
                    className="
                      flex-1 px-6 py-4 rounded-none text-white min-h-[44px]
                      hover:bg-[#8B672F] border flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    style={{
                      backgroundColor: '#2C2926',
                      borderColor: '#2C2926',
                    }}
                  >
                    {addingItemId === selectedItem.id || isUpdatingCart || drawerItemMutating ? (
                      <>
                        <i className="fas fa-spinner animate-spin"></i>
                        <span>ADDING...</span>
                      </>
                    ) : (
                      <>
                        <BottleIcon className="w-4.5 h-4.5" />
                        <span>Purchase Scent</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
