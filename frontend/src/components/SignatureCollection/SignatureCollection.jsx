import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collectionsData } from './CollectionData';
import { addToCart, updateQuantity } from '../../utils/cartHelper';
import { showToast } from '../../utils/toast.js';

const categoryBanners = {
  summer: {
    title: 'Summer Perfumes',
    desc: 'Discover fresh, citrusy, and aquatic fragrances perfect for hot Indian summers. Explore summer perfume decants that keep you feeling fresh all day long.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
  },
  winter: {
    title: 'Winter Perfumes',
    desc: 'Explore warm, spicy, vanilla, and woody fragrances that perform exceptionally well in colder weather. Find the best winter perfume decants for lasting impressions.',
    image: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?auto=format&fit=crop&w=1200&q=80'
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
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=80'
  },
  him: {
    title: 'For Him',
    desc: 'Discover bold, charismatic, and refined masculine scents. From fresh, energetic everyday profiles to rich, magnetic evening colognes.',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80'
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
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Sync URL search query parameters
  useEffect(() => {
    const handleUrlParams = () => {
      const fullHash = window.location.hash.replace('#', '');
      const params = new URLSearchParams(fullHash.split('?')[1] || '');
      const searchParam = params.get('search');
      if (searchParam) {
        setSearchQuery(decodeURIComponent(searchParam));
      } else {
        setSearchQuery('');
      }
    };
    handleUrlParams();
    window.addEventListener('hashchange', handleUrlParams);
    return () => window.removeEventListener('hashchange', handleUrlParams);
  }, []);

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wishlist') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const syncCart = () => {
      try {
        setCartItems(JSON.parse(localStorage.getItem('cartItems') || '[]'));
      } catch (e) {
        console.error('Failed to sync cart in SignatureCollection:', e);
      }
    };
    syncCart();
    window.addEventListener('cart-updated', syncCart);
    return () => window.removeEventListener('cart-updated', syncCart);
  }, []);

  const toggleWishlist = (itemId, e) => {
    e.stopPropagation();
    setWishlist(prev => {
      const exists = prev.includes(itemId);
      const updated = exists ? prev.filter(id => id !== itemId) : [...prev, itemId];
      localStorage.setItem('wishlist', JSON.stringify(updated));
      showToast(exists ? 'Removed from your wishlist' : 'Added to your wishlist', 'success');
      return updated;
    });
  };

  const handleUpdateQuantity = async (item, sizeOption, newQty, e) => {
    e.stopPropagation();
    const token = isSignedIn ? await getToken() : null;
    const sizeLabel = sizeOption.size || 'Default Size';
    
    // Find matching size variant ID if available
    let id = item.id;
    if (sizeOption.variantId) {
      id = sizeOption.variantId;
    } else {
      const sizes = item.sizes || [];
      const match = sizes.find(s => s.size === sizeLabel);
      if (match && match.variantId) {
        id = match.variantId;
      }
    }
    await updateQuantity(id, sizeLabel, newQty, token);
  };

  const [selectedCardSizes, setSelectedCardSizes] = useState({});
  const [addingItemId, setAddingItemId] = useState(null);

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
    setAddingItemId(item.id);
    
    const token = isSignedIn ? await getToken() : null;
    await addToCart(item, sizeOption, 1, token);

    setTimeout(() => {
      setAddingItemId(null);
    }, 500);
  };

  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('http://localhost:5000/api/categories');
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
    window.location.hash = `shop?category=${categorySlug}`;
  }, [onSelectCategory]);
  const activeCollection = useMemo(
    () => collections.find(collection => collection.slug === currentCategory),
    [collections, currentCategory]
  );

  const handleProductClick = (id) => {
    window.location.hash = `product-${id}`;
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
          // Tag-based or custom collections filtering
          let tagToSearch = currentCategory;
          if (currentCategory === 'for-him' || currentCategory === 'him') tagToSearch = 'him';
          else if (currentCategory === 'for-her' || currentCategory === 'her') tagToSearch = 'her';
          else if (currentCategory === 'newarrivals' || currentCategory === 'new-arrivals') tagToSearch = 'new-arrival';
          else if (currentCategory === 'bestsellers' || currentCategory === 'best-sellers') tagToSearch = 'featured';

          items = items.filter(item => {
            if (item.tags && item.tags.includes(tagToSearch)) return true;
            // Handle fallback tags/properties
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
    const countAfterSort = items.length;

    console.log('[DEBUG FILTER TRACE]', {
      totalProductsLoaded: initialCount,
      activeCategory: currentCategory,
      productsAfterCategoryFilter: countAfterCategory,
      productsAfterSearchFilter: countAfterSearch,
      productsAfterSortFilter: countAfterSort,
      dbCategoriesCount: dbCategories.length
    });

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

  return (
    <section className="relative bg-[#F7F3ED] pt-6 pb-16 md:pt-8 md:pb-20 lg:pt-10 lg:pb-24 overflow-hidden select-none font-body">
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
                  src={activeBanner.image} 
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
            <div className="text-[0.6rem] font-bold tracking-[3px] uppercase mb-3 text-left" style={{ color: '#746F69' }}>
              HOME <span className="mx-1" style={{ color: '#C9A46A' }}>/</span> <span style={{ color: '#C9A46A' }}>{breadcrumbText}</span>
            </div>
          );
        })()}

        {/* Title Row */}
        {currentCategory === 'wishlist' ? (
          <div className="mb-8 text-left">
            <h2 className="font-heading text-3xl lg:text-4xl font-light tracking-wide uppercase" style={{ color: '#2C2926' }}>
              My Wishlist
            </h2>
            <p className="text-xs font-body mt-2 uppercase tracking-wider" style={{ color: '#746F69' }}>
              {filteredAndSortedItems.length} Saved Fragrance{filteredAndSortedItems.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-3 h-px w-16" style={{ backgroundColor: '#C9A46A' }} />
          </div>
        ) : !categoryBanners[currentCategory] && !activeCollection && (
          <div className="mb-8 text-left">
            <h2 className="font-heading text-3xl lg:text-4xl font-light tracking-wide" style={{ color: '#2C2926' }}>
              Fragrance Collection
            </h2>
            <div className="mt-3 h-px w-16" style={{ backgroundColor: '#C9A46A' }} />
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
              <i className="fas fa-search absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: '#746F69' }}></i>
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
                <i className={`fas fa-chevron-down text-[8px] transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} style={{ color: '#746F69' }} />
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
                            color: sortBy === opt.value ? '#2C2926' : '#746F69',
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
            {filteredAndSortedItems.map((item) => (
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
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-102"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#F1ECE4] relative group-hover:scale-102 transition-transform duration-700 ease-out">
                      <div className="text-4xl md:text-5xl font-heading font-light tracking-widest border rounded-full w-20 h-20 flex items-center justify-center bg-white/40 shadow-inner" style={{ color: '#C9A46A', borderColor: 'rgba(201,164,106,0.2)' }}>
                        {item.name ? item.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="text-[0.65rem] tracking-[0.2em] font-body uppercase mt-4 font-semibold" style={{ color: '#C9A46A' }}>
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
                      <span className="text-[0.55rem] font-bold tracking-[0.15em] uppercase bg-[#FEFCF9]/90 backdrop-blur-[2px] px-2 py-0.5" style={{ color: '#C9A46A' }}>
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
                  <span className="text-[0.6rem] tracking-[0.15em] uppercase font-bold text-left block mb-1" style={{ color: '#C9A46A' }}>
                    {item.category === 'sets' ? 'CURATED SET' : (item.brand || 'FRAGRANCE')}
                  </span>

                  {/* Product Title */}
                  <h3 className="font-heading text-[0.95rem] font-light mb-1 tracking-wide leading-tight group-hover:text-policy-gold transition-colors duration-300 line-clamp-1 text-left" style={{ color: '#3A3632' }}>
                    {item.name}
                  </h3>

                  {/* Scent Profile notes */}
                  {item.notes && item.notes.length > 0 && (
                    <div className="text-[0.7rem] text-left font-light tracking-wide mb-1.5 font-body" style={{ color: '#746F69' }}>
                      {item.notes.slice(0, 2).join(' • ')}
                    </div>
                  )}

                  {/* Selected size price */}
                  <div className="text-xs font-semibold mb-3 text-left" style={{ color: '#2C2926' }}>
                    ₹{(() => {
                      const idx = getCardSizeIndex(item.id);
                      const priceVal = item.sizes && item.sizes[idx] ? item.sizes[idx].price : item.price;
                      return priceVal.toLocaleString('en-IN');
                    })()}
                  </div>

                  {/* Size selectors */}
                  <div className="min-h-[36px] mb-4 flex items-center justify-start overflow-visible">
                    {item.sizes && item.sizes.length > 0 ? (
                      <div className="flex flex-wrap gap-5 py-1 items-center w-full overflow-visible">
                        {item.sizes.map((sz, idx) => {
                          const isSelected = getCardSizeIndex(item.id) === idx;
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
                              className="relative py-1 text-[0.68rem] tracking-widest uppercase cursor-pointer select-none focus:outline-none transition-colors duration-300 min-h-[32px] flex items-center justify-center focus-visible:ring-1 focus-visible:ring-black/10 focus-visible:outline-none"
                            >
                              <span className="transition-colors duration-300 hover:text-policy-primary" style={{
                                color: isSelected ? '#2C2926' : '#746F69',
                                fontWeight: isSelected ? 500 : 400
                              }}>
                                {sizeLabel}
                              </span>
                              {isSelected && (
                                <motion.div
                                  layoutId={`activeCardSizeUnderline-${item.id}`}
                                  className="absolute bottom-0 left-0 right-0 h-[1.5px]"
                                  style={{ backgroundColor: '#C9A46A' }}
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
                    const sizeIdx = getCardSizeIndex(item.id);
                    const selectedOption = item.sizes && item.sizes[sizeIdx] ? item.sizes[sizeIdx] : { size: 'Default' };
                    
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
                    const cartItem = cartItems.find(ci => ci.id === item.id && ci.size === selectedOption.size);
                    if (cartItem) {
                      return (
                        <div className="flex items-center justify-between gap-2 mt-auto w-full min-h-[44px]">
                          <button
                            onClick={(e) => handleUpdateQuantity(item, selectedOption, cartItem.quantity - 1, e)}
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
                            onClick={(e) => handleUpdateQuantity(item, selectedOption, cartItem.quantity + 1, e)}
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
                        onClick={(e) => handleCardAddToCart(item, selectedOption, e)}
                        disabled={isAdding}
                        className="w-full py-2.5 rounded-none border text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-300 mt-auto cursor-pointer min-h-[44px]"
                        style={{
                          backgroundColor: isAdding ? '#2C2926' : 'transparent',
                          borderColor: '#2C2926',
                          color: isAdding ? '#FFFFFF' : '#2C2926',
                        }}
                      >
                        {isAdding ? (
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
            ))}
          </div>
        ) : currentCategory === 'wishlist' ? (
          <div className="text-center py-24 bg-[#FEFCF9] border rounded-none p-10 shadow-sm max-w-xl mx-auto" style={{ borderColor: '#D8D1C7' }}>
            <i className="far fa-heart text-5xl mb-4 block" style={{ color: '#C9A46A' }}></i>
            <h4 className="font-heading text-xl font-light mb-2 uppercase tracking-wide" style={{ color: '#3A3632' }}>Your wishlist is empty.</h4>
            <p className="text-xs leading-relaxed mb-6 font-body" style={{ color: '#746F69' }}>
              Explore our boutique decants and curate your personal fragrance wishlist.
            </p>
            <button
              onClick={() => { window.location.hash = 'collection'; }}
              className="px-6 py-3 rounded-none text-white text-[0.7rem] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-sm"
              style={{ backgroundColor: '#2C2926' }}
            >
              DISCOVER SCENTS
            </button>
          </div>
        ) : (
          <div className="text-center py-24 bg-white/40 border rounded-none p-10 shadow-sm" style={{ borderColor: '#D8D1C7' }}>
            <i className="fas fa-search text-5xl mb-4 block" style={{ color: '#746F69' }}></i>
            <h4 className="font-heading text-xl font-light mb-2" style={{ color: '#3A3632' }}>No Scents Found</h4>
            <p className="text-xs font-body" style={{ color: '#746F69' }}>
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
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeQuickView}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end justify-center lg:justify-end"
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="
                fixed top-0 bottom-0 right-0 w-full lg:max-w-2xl bg-[#F7F3ED] z-50
                shadow-2xl flex flex-col h-full border-l border-black/8
              "
            >
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-8 sm:p-10 lg:p-12 pb-32">
                {/* Header panel controls */}
                <div className="flex items-center justify-between mb-10 pb-4 border-b border-black/8">
                  <span className="text-[0.62rem] font-bold tracking-[3px] uppercase" style={{ color: '#C9A46A' }}>
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
                        <ShieldCheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#C9A46A' }} />
                        <div>
                          <p className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: '#2C2926' }}>
                            Authenticity Promise
                          </p>
                          <p className="text-[0.65rem] leading-relaxed mt-1 font-body" style={{ color: '#5A5550' }}>
                            Sourced directly from batch-tracked original retail bottles. Hand-decanted to order.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Descriptions, Pyramids, and Size Selector */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="text-[0.62rem] font-bold tracking-widest uppercase px-3 py-1 rounded-none inline-block mb-4" style={{ color: '#C9A46A', backgroundColor: 'rgba(201,164,106,0.08)' }}>
                        {selectedItem.category === 'decants' ? 'Decant Scent' : selectedItem.category === 'sets' ? 'Collection Set' : 'Retail Bottle'}
                      </span>
                      <h3 className="font-heading text-3xl font-light mb-2 tracking-wide leading-tight" style={{ color: '#2C2926' }}>
                        {selectedItem.name}
                      </h3>
                      <p className="text-[0.78rem] italic tracking-wide mb-4" style={{ color: '#C9A46A' }}>
                        {selectedItem.tagline}
                      </p>
                      <p className="text-[0.82rem] leading-relaxed font-body mb-6" style={{ color: '#5A5550' }}>
                        {selectedItem.description}
                      </p>

                      {/* Olfactory Pyramid Accordion */}
                      <div className="mb-8 p-5 bg-[#FEFCF9] border" style={{ borderColor: '#D8D1C7' }}>
                        <h4 className="text-[0.72rem] font-bold uppercase tracking-wider mb-4 pb-2 border-b" style={{ color: '#3A3632', borderBottomColor: '#D8D1C7' }}>
                          Olfactory Pyramid
                        </h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold uppercase tracking-wide" style={{ color: '#C9A46A' }}>Top notes:</span>
                            <span style={{ color: '#5A5550' }}>{selectedItem.pyramid.top}</span>
                          </div>
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold uppercase tracking-wide" style={{ color: '#C9A46A' }}>Heart notes:</span>
                            <span style={{ color: '#5A5550' }}>{selectedItem.pyramid.heart}</span>
                          </div>
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold uppercase tracking-wide" style={{ color: '#C9A46A' }}>Base notes:</span>
                            <span style={{ color: '#5A5550' }}>{selectedItem.pyramid.base}</span>
                          </div>
                        </div>
                      </div>

                      {/* Size Selector */}
                      <div className="mb-6">
                        <h4 className="text-[0.72rem] font-bold uppercase tracking-wider mb-3" style={{ color: '#3A3632' }}>
                          Select Product Option
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedItem.sizes.map((sz, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSizeIndex(idx)}
                              className="p-3.5 rounded-none border text-left cursor-pointer transition-all duration-300"
                              style={{
                                backgroundColor: selectedSizeIndex === idx ? '#2C2926' : '#FEFCF9',
                                borderColor: selectedSizeIndex === idx ? '#2C2926' : '#D8D1C7',
                                color: selectedSizeIndex === idx ? '#FFFFFF' : '#2C2926'
                              }}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[0.72rem] font-bold" style={{ color: selectedSizeIndex === idx ? '#C9A46A' : '#2C2926' }}>
                                  {sz.size}
                                </span>
                                <span className="text-[0.8rem] font-bold">
                                  ₹{sz.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <span className="text-[0.58rem] block" style={{ color: selectedSizeIndex === idx ? 'rgba(255,255,255,0.8)' : '#746F69' }}>
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
              <div className="absolute bottom-0 left-0 right-0 bg-[#F7F3ED]/95 backdrop-blur-md border-t p-8 flex items-center justify-between gap-6 z-20" style={{ borderTopColor: '#D8D1C7' }}>
                <div>
                  <span className="text-[0.62rem] uppercase tracking-wider block" style={{ color: '#746F69' }}>Selected Option Price</span>
                  <span className="text-2xl font-semibold font-heading tracking-wide" style={{ color: '#2C2926' }}>
                    ₹{selectedItem.sizes[selectedSizeIndex]?.price.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex gap-3 flex-1 max-w-xs justify-end">
                  <button
                    onClick={async () => {
                      const sizeOption = selectedItem.sizes[selectedSizeIndex];
                      const token = isSignedIn ? await getToken() : null;
                      await addToCart(selectedItem, sizeOption, 1, token);
                      closeQuickView();
                    }}
                    className="
                      flex-1 px-6 py-4 rounded-none text-white
                      hover:bg-[#C9A46A] border flex items-center justify-center gap-2 cursor-pointer
                    "
                    style={{
                      backgroundColor: '#2C2926',
                      borderColor: '#2C2926',
                    }}
                  >
                    <BottleIcon className="w-4.5 h-4.5" />
                    <span>Purchase Scent</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
