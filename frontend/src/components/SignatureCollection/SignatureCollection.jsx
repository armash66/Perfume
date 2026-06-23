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
  
  // Luxury Filter Drawer States
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedFamilies, setSelectedFamilies] = useState([]);

  // Extract unique brands and families from products
  const uniqueBrands = useMemo(() => {
    const set = new Set(products.map(p => p.brand).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const uniqueFamilies = useMemo(() => {
    const set = new Set(products.map(p => p.family).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

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
    setSelectedBrands([]);
    setSelectedFamilies([]);
  };

  // Olfactory filtering & search & sorting logic
  const filteredAndSortedItems = useMemo(() => {
    let items = [...products];

    if (import.meta.env.DEV && products.length === 0) {
      console.warn('[DEVELOPMENT WARNING] SignatureCollection: No database products loaded.');
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

    // 1.5. Filter by brand
    if (selectedBrands.length > 0) {
      items = items.filter(item => selectedBrands.includes(item.brand));
    }

    // 1.6. Filter by family
    if (selectedFamilies.length > 0) {
      items = items.filter(item => selectedFamilies.includes(item.family));
    }

    // 2. Real-time Search
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          (item.brand && item.brand.toLowerCase().includes(query)) ||
          (item.family && item.family.toLowerCase().includes(query)) ||
          item.notes.some(note => note.toLowerCase().includes(query)) ||
          item.description.toLowerCase().includes(query) ||
          item.tagline.toLowerCase().includes(query)
      );
    }

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
  }, [activeCollection, currentCategory, products, searchQuery, sortBy, dbCategories, selectedBrands, selectedFamilies]);

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
    <section className="relative bg-[#F7F3ED] py-16 lg:py-24 overflow-hidden select-none font-body">
      {/* Background visual graphics */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #B08A50 1px, transparent 1px), linear-gradient(to bottom, #B08A50 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(176,138,80,0.03)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(28,27,24,0.02)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-[clamp(1.5rem,4vw,3.5rem)] relative z-10">
        {/* Breadcrumb */}
        <div className="text-[0.65rem] font-bold tracking-[0.2em] text-[#B08A50] uppercase mb-2 text-left">
          Shop / {breadcrumbText}
        </div>

        {/* Title & Count */}
        <div className="flex items-baseline gap-3 mb-8 text-left">
          <h1 className="font-heading text-3xl md:text-4xl font-light text-[#1C1B18] tracking-wide">
            {breadcrumbText.charAt(0) + breadcrumbText.slice(1).toLowerCase()}
          </h1>
          <span className="text-[0.65rem] font-bold text-[#8E8A82] tracking-wider uppercase">
            ({filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'scent' : 'scents'})
          </span>
        </div>

        {/* Pills, Search, and Filter Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/8 mb-10">
          {/* Left: Category Navigation Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'bestsellers', label: 'Best Sellers' },
              { id: 'him', label: 'For Him' },
              { id: 'her', label: 'For Her' },
              { id: 'sets', label: 'Sets' },
              { id: 'fullbottles', label: 'Full Bottles' },
            ].map((pill) => {
              const isActive = activePillId === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => handleCategorySelect(pill.id)}
                  className={`
                    px-4 py-2 rounded-full text-[0.65rem] font-bold tracking-wider uppercase
                    transition-all duration-300 ease-out whitespace-nowrap cursor-pointer border min-h-[38px] flex items-center justify-center
                    ${isActive
                      ? 'bg-[#1C1B18] border-[#1C1B18] text-[#FEFCF9]'
                      : 'bg-transparent border-black/8 text-[#1C1B18] hover:bg-[#EFE8DD] hover:border-[#1C1B18]/50'
                    }
                  `}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Right: Search and Filter Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:flex-none">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-48 pl-3 pr-8 py-2 rounded-full border border-black/8 bg-white/60 focus:bg-white focus:border-[#1C1B18] outline-none text-xs text-[#1C1B18] transition-all duration-300 min-h-[38px]"
              />
              <i className="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-[#1C1B18]/40 text-xs pointer-events-none"></i>
            </div>

            {/* Filter button */}
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="px-5 py-2 rounded-full border border-black/8 bg-transparent hover:bg-[#EFE8DD] text-[0.65rem] font-bold tracking-widest text-[#1C1B18] uppercase transition-all duration-300 cursor-pointer min-h-[38px] flex items-center gap-2"
            >
              <span>Filter</span>
              <i className="fas fa-sliders-h text-[0.7rem] opacity-70"></i>
            </button>
          </div>
        </div>

        {/* Dynamic Products Grid */}
        {collectionsLoading && currentCategory !== 'all' ? (
          <div className="py-20 text-center text-black/50">Loading this collection...</div>
        ) : collectionsError && currentCategory !== 'all' ? (
          <div className="py-20 text-center text-red-700">{collectionsError}</div>
        ) : filteredAndSortedItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
            {filteredAndSortedItems.map((item, itemIdx) => {
              // Subtle Alternate Image Mixing statically
              const hasImages = Array.isArray(item.images) && item.images.length > 1;
              const primaryImage = hasImages
                ? (itemIdx % 3 === 2 ? item.images[1] : item.images[0])
                : (item.image || '/images/perfume_placeholder.jpeg');

              // Format Scent Profile (e.g. Spicy • Amber)
              const scentProfile = item.family
                ? item.family.replace(/\s+/g, ' • ')
                : (Array.isArray(item.notes) && item.notes.length > 0
                  ? item.notes.slice(0, 2).join(' • ')
                  : 'Signature • Scent');

              return (
                <div
                  key={item.id}
                  onClick={() => handleProductClick(item.id)}
                  className="group flex flex-col cursor-pointer"
                >
                  {/* Product Image and Badges */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#FEFCF9]/40 mb-4">
                    <img
                      src={primaryImage}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-103"
                    />

                    {/* Small Uppercase Badge System */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none items-start">
                      {item.tags && item.tags.includes('new-arrival') && (
                        <span className="text-[0.55rem] font-bold tracking-wider uppercase bg-[#1C1B18] text-white px-2 py-0.5 shadow-sm">
                          NEW
                        </span>
                      )}
                      {item.tags && item.tags.includes('featured') && (
                        <span className="text-[0.55rem] font-bold tracking-wider uppercase bg-[#B08A50] text-white px-2 py-0.5 shadow-sm">
                          BESTSELLER
                        </span>
                      )}
                      {item.tags && (item.tags.includes('limited') || item.tags.includes('low-stock')) && (
                        <span className="text-[0.55rem] font-bold tracking-wider uppercase bg-black text-white px-2 py-0.5 shadow-sm">
                          LIMITED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Metadata Info block */}
                  <div className="flex flex-col text-left">
                    {/* Brand */}
                    <span className="text-[0.58rem] font-bold tracking-[0.18em] text-[#8E8A82] uppercase mb-1.5">
                      {item.brand || 'Decant Atelier'}
                    </span>

                    {/* Product Title */}
                    <h3 className="font-heading text-xs font-normal text-[#1C1B18] mb-1.5 tracking-wide leading-tight group-hover:text-[#B08A50] transition-colors duration-300 line-clamp-1">
                      {item.name}
                    </h3>

                    {/* Scent Profile */}
                    <div className="text-[0.65rem] font-normal text-black/50 tracking-wide mb-1.5 uppercase">
                      {scentProfile}
                    </div>

                    {/* Price */}
                    <span className="text-xs font-medium text-[#1C1B18]">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 p-10">
            <h4 className="font-heading text-xl font-light text-[#1C1B18] mb-2">No Scents Found</h4>
            <p className="text-xs text-black/40 font-body">
              Try adjusting your filters, search term, or sorting option.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-6 px-6 py-2.5 bg-[#1C1B18] text-white hover:bg-[#B08A50] text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer"
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
                  <span className="text-[0.62rem] font-bold tracking-[3px] uppercase text-[#B08A50]">
                    Interactive Concierge Sizing
                  </span>
                  <button
                    onClick={closeQuickView}
                    aria-label="Close panel"
                    className="
                      group w-9 h-9 rounded-full bg-black/5 hover:bg-[#1C1B18]
                      flex items-center justify-center text-[#1C1B18] hover:text-white
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
                    <div className="mt-6 p-4 rounded-none bg-[#EFE8DD] border border-black/5">
                      <div className="flex gap-2.5 items-start">
                        <ShieldCheckIcon className="w-4 h-4 text-[#B08A50] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[0.68rem] font-bold text-[#1C1B18] uppercase tracking-wider">
                            Authenticity Promise
                          </p>
                          <p className="text-[0.65rem] text-[#1C1B18]/70 leading-relaxed mt-1 font-body">
                            Sourced directly from batch-tracked original retail bottles. Hand-decanted to order.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Descriptions, Pyramids, and Size Selector */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="text-[0.62rem] font-bold tracking-widest uppercase text-[#B08A50] bg-[#B08A50]/[0.08] px-3 py-1 rounded-none inline-block mb-4">
                        {selectedItem.category === 'decants' ? 'Decant Scent' : selectedItem.category === 'sets' ? 'Collection Set' : 'Retail Bottle'}
                      </span>
                      <h3 className="font-heading text-3xl font-light text-[#1C1B18] mb-2 tracking-wide leading-tight">
                        {selectedItem.name}
                      </h3>
                      <p className="text-[0.78rem] text-[#B08A50] italic tracking-wide mb-4">
                        {selectedItem.tagline}
                      </p>
                      <p className="text-[0.82rem] text-[#1C1B18]/70 leading-relaxed font-body mb-6">
                        {selectedItem.description}
                      </p>

                      {/* Olfactory Pyramid Accordion */}
                      <div className="mb-8 p-5 bg-[#FEFCF9] border border-black/5">
                        <h4 className="text-[0.72rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-4 pb-2 border-b border-black/5">
                          Olfactory Pyramid
                        </h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold text-[#B08A50] uppercase tracking-wide">Top notes:</span>
                            <span className="text-[#1C1B18]">{selectedItem.pyramid.top}</span>
                          </div>
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold text-[#B08A50] uppercase tracking-wide">Heart notes:</span>
                            <span className="text-[#1C1B18]">{selectedItem.pyramid.heart}</span>
                          </div>
                          <div className="grid grid-cols-[85px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold text-[#B08A50] uppercase tracking-wide">Base notes:</span>
                            <span className="text-[#1C1B18]">{selectedItem.pyramid.base}</span>
                          </div>
                        </div>
                      </div>

                      {/* Size Selector */}
                      <div className="mb-6">
                        <h4 className="text-[0.72rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-3">
                          Select Product Option
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedItem.sizes.map((sz, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSizeIndex(idx)}
                              className={`
                                p-3.5 rounded-none border text-left cursor-pointer transition-all duration-300
                                ${selectedSizeIndex === idx
                                  ? 'bg-[#1C1B18] border-[#1C1B18] text-white shadow-sm'
                                  : 'bg-[#FEFCF9] border-black/8 text-[#1C1B18] hover:border-black/20'
                                }
                              `}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[0.72rem] font-bold ${selectedSizeIndex === idx ? 'text-[#B08A50]' : 'text-[#1C1B18]'}`}>
                                  {sz.size}
                                </span>
                                <span className="text-[0.8rem] font-bold">
                                  ₹{sz.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <span className={`text-[0.58rem] block ${selectedSizeIndex === idx ? 'text-white/60' : 'text-black/40'}`}>
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
              <div className="absolute bottom-0 left-0 right-0 bg-[#F7F3ED]/95 backdrop-blur-md border-t border-black/8 p-8 flex items-center justify-between gap-6 z-20">
                <div>
                  <span className="text-[0.62rem] uppercase tracking-wider text-black/40 block">Selected Option Price</span>
                  <span className="text-2xl font-semibold text-[#1C1B18] font-heading tracking-wide">
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
                      flex-1 px-6 py-4 rounded-none bg-[#1C1B18] text-white
                      hover:bg-[#B08A50] border border-[#1C1B18] hover:border-[#B08A50]
                      text-[0.74rem] font-bold tracking-widest uppercase shadow-sm
                      transition-all duration-300 hover:scale-102 flex items-center justify-center gap-2 cursor-pointer
                    "
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
      {/* Filter Drawer Panel Overlay */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="fixed inset-0 bg-black/35 backdrop-blur-sm z-50"
            />

            {/* Slide-over Filter Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 220 }}
              className="
                fixed top-0 bottom-0 right-0 w-full max-w-[380px] bg-[#FEFCF9] z-50
                shadow-2xl flex flex-col h-full border-l border-black/8
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-black/8">
                <span className="text-[0.68rem] font-bold tracking-[3px] uppercase text-[#1C1B18]">
                  Filter & Sort
                </span>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  aria-label="Close filters"
                  className="
                    group w-8 h-8 rounded-full bg-black/5 hover:bg-[#1C1B18]
                    flex items-center justify-center text-[#1C1B18] hover:text-white
                    transition-all duration-300 cursor-pointer
                  "
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Sort Section */}
                <div>
                  <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-3">
                    Sort By
                  </h4>
                  <div className="space-y-2">
                    {[
                      { id: 'recommended', label: 'Recommended' },
                      { id: 'price-low', label: 'Price: Low to High' },
                      { id: 'price-high', label: 'Price: High to Low' },
                    ].map((option) => {
                      const isSelected = sortBy === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setSortBy(option.id)}
                          className={`
                            w-full text-left py-2.5 px-4 text-xs font-normal tracking-wide transition-all duration-200 cursor-pointer border
                            ${isSelected
                              ? 'bg-[#1C1B18] border-[#1C1B18] text-[#FEFCF9]'
                              : 'bg-white border-black/8 text-[#1C1B18] hover:bg-[#EFE8DD]'
                            }
                          `}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Brand Filter Section */}
                <div>
                  <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-3">
                    Filter by Brand
                  </h4>
                  <div className="max-h-[160px] overflow-y-auto pr-2 space-y-2 border border-black/5 p-3 bg-white">
                    {uniqueBrands.map((brand) => {
                      const isChecked = selectedBrands.includes(brand);
                      return (
                        <label key={brand} className="flex items-center gap-2.5 text-xs text-[#1C1B18] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedBrands(prev =>
                                isChecked
                                  ? prev.filter(b => b !== brand)
                                  : [...prev, brand]
                              );
                            }}
                            className="w-3.5 h-3.5 accent-[#1C1B18]"
                          />
                          <span>{brand}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Family Filter Section */}
                <div>
                  <h4 className="text-[0.68rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-3">
                    Filter by Family
                  </h4>
                  <div className="max-h-[160px] overflow-y-auto pr-2 space-y-2 border border-black/5 p-3 bg-white">
                    {uniqueFamilies.map((family) => {
                      const isChecked = selectedFamilies.includes(family);
                      return (
                        <label key={family} className="flex items-center gap-2.5 text-xs text-[#1C1B18] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedFamilies(prev =>
                                isChecked
                                  ? prev.filter(f => f !== family)
                                  : [...prev, family]
                              );
                            }}
                            className="w-3.5 h-3.5 accent-[#1C1B18]"
                          />
                          <span>{family}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-black/8 bg-[#F7F3ED]/50 flex gap-3">
                {(selectedBrands.length > 0 || selectedFamilies.length > 0 || sortBy !== 'recommended') && (
                  <button
                    onClick={() => {
                      setSelectedBrands([]);
                      setSelectedFamilies([]);
                      setSortBy('recommended');
                      setIsFilterDrawerOpen(false);
                    }}
                    className="flex-1 py-3 text-center border border-[#1C1B18] text-[#1C1B18] hover:bg-[#1C1B18] hover:text-white text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex-1 py-3 text-center bg-[#1C1B18] border border-[#1C1B18] text-white hover:bg-[#B08A50] hover:border-[#B08A50] text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
