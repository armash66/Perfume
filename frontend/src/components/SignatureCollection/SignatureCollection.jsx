import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collectionsData } from './CollectionData';
import { addToCart } from '../../utils/cartHelper';

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

export default function SignatureCollection({ activeCategory = 'all', onSelectCategory }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recommended');

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

  const handleCardAddToCart = (item, sizeOption, e) => {
    e.stopPropagation();
    setAddingItemId(item.id);
    
    // Add to unified cart helper
    addToCart(item, sizeOption);

    setTimeout(() => {
      setAddingItemId(null);
      alert(`Added ${item.name} (${sizeOption.size}) to your cart!`);
    }, 500);
  };

  const [localCategory, setLocalCategory] = useState('all');
  const currentCategory = onSelectCategory ? activeCategory : localCategory;
  const setCategory = onSelectCategory ? onSelectCategory : setLocalCategory;

  const handleProductClick = (id) => {
    window.location.hash = `product-${id}`;
  };

  // Intercept category mapping for special items (e.g. from navbar clicks)
  const categoryPillsMap = {
    all: 'All',
    sets: 'Sets',
    decants: 'Decants',
    fullbottles: 'Full Bottles'
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
    setCategory('all');
    setSearchQuery('');
    setSortBy('recommended');
  };

  // Olfactory filtering & search & sorting logic
  const filteredAndSortedItems = useMemo(() => {
    let items = [...collectionsData];

    // 1. Filter by category
    if (currentCategory !== 'all') {
      if (currentCategory === 'decants') {
        items = items.filter(item => item.category === 'decants');
      } else if (currentCategory === 'fullbottles') {
        items = items.filter(item => item.category === 'fullbottles');
      } else if (currentCategory === 'sets') {
        items = items.filter(item => item.category === 'sets');
      } else if (currentCategory === 'newarrivals') {
        items = items.filter(item => item.tags && item.tags.includes('new-arrival'));
      } else {
        // Tag filters (summer, winter, him, her, etc.)
        items = items.filter(item => item.tags && item.tags.includes(currentCategory));
      }
    }

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
  }, [currentCategory, searchQuery, sortBy]);

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
        {/* Category Banner or normal breadcrumbs */}
        {(() => {
          const activeBanner = categoryBanners[currentCategory];
          if (activeBanner) {
            return (
              <div 
                className="w-full relative overflow-hidden mb-12 rounded-3xl h-[180px] md:h-[220px] lg:h-[240px] xl:h-[280px] shadow-sm border border-black/5"
              >
                {/* Background image filling container */}
                <img 
                  src={activeBanner.image} 
                  alt={activeBanner.title} 
                  className="absolute inset-0 w-full h-full object-cover object-center z-0"
                />

                {/* Dark premium linear gradient overlay */}
                <div 
                  className="absolute inset-0 z-10" 
                  style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.75), rgba(0,0,0,0.45), rgba(0,0,0,0.20))' }}
                />
                
                {/* Responsive content positioning */}
                <div className="absolute inset-0 flex items-center px-4 sm:px-6 md:px-10 lg:px-14 z-20">
                  <div className="max-w-[700px] text-left">
                    {/* <div className="text-[0.65rem] sm:text-xs font-medium tracking-[0.25em] text-white/90 drop-shadow-md uppercase mb-3">
                      HOME / CATEGORIES / {activeBanner.title.toUpperCase()}
                    </div> */}
                    <h2 
                      className="font-heading text-3xl md:text-5xl lg:text-6xl font-medium text-white mb-3 leading-tight tracking-wide drop-shadow-lg"
                      style={{
                        color: '#FFFFFF',
                        fontWeight: 500,
                        textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)'
                      }}
                    >
                      {activeBanner.title}
                    </h2>
                    <p 
                      className="text-xs sm:text-sm text-white/95 max-w-2xl leading-relaxed"
                      style={{
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)'
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
            <div className="text-[0.6rem] font-bold tracking-[3px] text-[#B08A50] uppercase mb-3 text-left">
              HOME / {breadcrumbText}
            </div>
          );
        })()}

        {/* Title Row */}
        {!categoryBanners[currentCategory] && (
          <div className="mb-8 text-left">
            <h2 className="font-heading text-3xl lg:text-4xl font-light text-[#1C1B18] tracking-wide">
              Fragrance Collection
            </h2>
            <div className="mt-3 h-px w-16 bg-[#B08A50]" />
          </div>
        )}

        {/* Unified Control Bar (Filters on Left, Search + Sort on Right) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-black/8 mb-10">
          {/* Left: Filter Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'sets', label: 'Sets' },
              { id: 'decants', label: 'Decants' },
              { id: 'fullbottles', label: 'Full Bottles' },
            ].map((pill) => {
              const isActive = activePillId === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setCategory(pill.id)}
                  className={`
                    px-5 py-2.5 rounded-full text-[0.65rem] font-bold tracking-wider uppercase
                    transition-all duration-300 ease-out whitespace-nowrap cursor-pointer border min-h-[44px] flex items-center justify-center
                    ${isActive
                      ? 'bg-[#1C1B18] border-[#1C1B18] text-[#FEFCF9] shadow-sm'
                      : 'bg-transparent border-black/8 text-[#1C1B18] hover:bg-[#EFE8DD] hover:border-[#1C1B18]/50'
                    }
                  `}
                >
                  {pill.label}
                </button>
              );
            })}

            {/* Clear filters */}
            {(currentCategory !== 'all' || searchQuery !== '' || sortBy !== 'recommended') && (
              <button
                onClick={handleClearFilters}
                className="ml-3 text-[0.65rem] font-bold tracking-widest text-[#1C1B18] hover:text-[#B08A50] transition-colors duration-300 underline underline-offset-4 uppercase cursor-pointer min-h-[44px] flex items-center"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Right: Search + Sort controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search input container */}
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search fragrances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-4 pr-10 py-3 rounded-xl border border-black/8 bg-white/60 focus:bg-white focus:border-[#1C1B18] outline-none text-xs text-[#1C1B18] transition-all duration-300 shadow-sm min-h-[44px]"
              />
              <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-[#1C1B18]/40 text-xs pointer-events-none"></i>
            </div>

            {/* Sort selector container */}
            <div className="flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto bg-[#FEFCF9] border border-black/8 rounded-xl px-4 py-2.5 text-[0.68rem] font-bold text-[#1C1B18] outline-none focus:border-[#1C1B18] cursor-pointer shadow-sm uppercase tracking-wider min-h-[44px]"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Products Grid */}
        {filteredAndSortedItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredAndSortedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleProductClick(item.id)}
                className="
                  group h-full flex flex-col bg-white rounded-3xl
                  border border-black/6 shadow-sm hover:shadow-2xl
                  transition-all duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.03] overflow-hidden cursor-pointer
                "
              >
                {/* Product Image and Badges */}
                <div className="relative aspect-[4/5] overflow-hidden bg-[#F7F3ED]/30 border-b border-black/5">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
                  />

                  {/* Premium gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

                  {/* Overlays Badges */}
                  <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-1 pointer-events-none items-start">
                    {item.tags && item.tags.includes('featured') && (
                      <span className="text-[0.45rem] font-bold tracking-widest uppercase bg-[#B08A50] text-[#FEFCF9] px-2.5 py-1 rounded-md shadow-sm">
                        FEATURED
                      </span>
                    )}
                    {item.tags && item.tags.includes('new-arrival') && (
                      <span className="text-[0.45rem] font-bold tracking-widest uppercase bg-[#1C1B18] text-[#FEFCF9] px-2.5 py-1 rounded-md shadow-sm border border-white/10">
                        NEW ARRIVAL
                      </span>
                    )}
                    {item.tags && item.tags.includes('out-of-stock') && (
                      <span className="text-[0.45rem] font-bold tracking-widest uppercase bg-[#FF003C] text-white px-2.5 py-1 rounded-md shadow-sm">
                        OUT OF STOCK
                      </span>
                    )}
                  </div>
                </div>

                {/* Info block */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Brand / Category Badge */}
                  <span className="text-[0.55rem] font-bold tracking-[2px] text-black/40 block mb-1.5 uppercase text-left">
                    {item.category === 'sets' ? 'CURATED SET' : (item.brand || 'FRAGRANCE')}
                  </span>

                  {/* Product Title */}
                  <h3 className="font-heading text-base font-normal text-[#1C1B18] mb-1.5 tracking-wide leading-tight group-hover:text-[#B08A50] transition-colors duration-300 line-clamp-2 min-h-[2.5rem] text-left">
                    {item.name}
                  </h3>

                  {/* Selected size price */}
                  <div className="text-xs font-semibold text-[#B08A50] mb-3 text-left">
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
                              <span className={`transition-colors duration-300 ${
                                isSelected
                                  ? 'text-[#1C1B18] font-medium'
                                  : 'text-[#737373] hover:text-[#1C1B18]'
                              }`}>
                                {sizeLabel}
                              </span>
                              {isSelected && (
                                <motion.div
                                  layoutId={`activeCardSizeUnderline-${item.id}`}
                                  className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#1C1B18]"
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

                  {/* Add to Cart / Sold Out Button */}
                  {(() => {
                    const isOutOfStock = item.tags && item.tags.includes('out-of-stock');
                    const isAdding = addingItemId === item.id;
                    const sizeIdx = getCardSizeIndex(item.id);
                    const selectedOption = item.sizes && item.sizes[sizeIdx] ? item.sizes[sizeIdx] : { size: 'Default' };
                    
                    if (isOutOfStock) {
                      return (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl border border-black/5 bg-black/5 text-black/30 text-[0.65rem] font-bold tracking-widest uppercase text-center cursor-not-allowed mt-auto min-h-[44px]"
                        >
                          SOLD OUT
                        </button>
                      );
                    }
                    
                    return (
                      <button
                        onClick={(e) => handleCardAddToCart(item, selectedOption, e)}
                        disabled={isAdding}
                        className={`
                          w-full py-2.5 rounded-xl border text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-300 mt-auto cursor-pointer min-h-[44px]
                          ${isAdding
                            ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                            : 'bg-transparent border-[#1C1B18] text-[#1C1B18] hover:bg-[#1C1B18] hover:text-white'
                          }
                        `}
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
        ) : (
          <div className="text-center py-24 bg-white/40 border border-black/5 rounded-none p-10 shadow-sm">
            <i className="fas fa-search text-black/10 text-5xl mb-4"></i>
            <h4 className="font-heading text-xl font-light text-[#1C1B18] mb-2">No Scents Found</h4>
            <p className="text-xs text-black/40 font-body">
              Try adjusting your filters, search term, or sorting option.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-6 px-6 py-3 rounded-none bg-[#1C1B18] text-white hover:bg-[#B08A50] text-[0.7rem] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-sm"
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
                    onClick={() => {
                      alert(`Concierge: Selected ${selectedItem.name} (${selectedItem.sizes[selectedSizeIndex]?.size}) for ₹${selectedItem.sizes[selectedSizeIndex]?.price.toLocaleString('en-IN')}`);
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
    </section>
  );
}
