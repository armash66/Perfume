"use client";

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
    <section className="relative bg-[#FFF8E7] py-10 lg:py-16 overflow-hidden select-none">
      {/* Background visual graphics */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #E2C275 1px, transparent 1px), linear-gradient(to bottom, #E2C275 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(226,194,117,0.05)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(15,61,62,0.03)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Category Banner or normal breadcrumbs */}
        {(() => {
          const activeBanner = categoryBanners[currentCategory];
          if (activeBanner) {
            return (
              <div 
                className="w-full relative overflow-hidden mb-8 rounded-2xl bg-cover bg-center h-[180px] sm:h-[200px] md:h-[220px] flex items-center shadow-md border border-[#E2C275]/15"
                style={{ backgroundImage: `url(${activeBanner.image})` }}
              >
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-0" />
                
                {/* Content */}
                <div className="relative z-10 px-6 sm:px-10 max-w-4xl text-left font-body">
                  <div className="text-[0.6rem] font-bold tracking-[3px] text-white/70 uppercase mb-2">
                    HOME / CATEGORIES / {activeBanner.title.toUpperCase()}
                  </div>
                  <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight tracking-wide">
                    {activeBanner.title}
                  </h2>
                  <p className="text-[0.72rem] sm:text-xs text-white/85 max-w-xl leading-relaxed font-normal">
                    {activeBanner.desc}
                  </p>
                </div>
              </div>
            );
          }
          
          return (
            /* Normal Breadcrumbs */
            <div className="text-[0.6rem] font-bold tracking-[3px] text-[#C4A85A] uppercase mb-1 font-body">
              HOME / {breadcrumbText}
            </div>
          );
        })()}

        {/* Title and Search Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            {!categoryBanners[currentCategory] && (
              <>
                <h2 className="font-heading text-2xl lg:text-3xl font-extrabold text-[#072227] tracking-wide">
                  Fragrance Collection
                </h2>
                <div className="mt-2 h-0.5 w-16 bg-gradient-to-r from-[#E2C275] to-transparent" />
              </>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search fragrances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pl-4 pr-10 py-2.5 rounded-full border border-[#E2C275]/25 bg-white/60 focus:bg-white focus:border-[#0F3D3E] outline-none text-xs font-body text-[#0F3D3E] transition-all duration-300 shadow-sm"
            />
            <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-[#0F3D3E]/40 text-xs"></i>
          </div>
        </div>

        {/* Filter pills & Sort selector row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2C275]/15 mb-6">
          {/* Left: pills */}
          <div className="flex flex-wrap items-center gap-2">
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
                    px-4 py-1.5 rounded-full text-[0.62rem] font-bold tracking-wider uppercase
                    transition-all duration-300 ease-out whitespace-nowrap cursor-pointer border
                    ${isActive
                      ? 'bg-[#0F3D3E] border-[#0F3D3E] text-[#FFF8E7] shadow-md shadow-[#0F3D3E]/10 hover:scale-102'
                      : 'bg-white/60 border-[#E2C275]/15 text-[#0F3D3E] hover:bg-[#E2C275]/10 hover:border-[#E2C275]/35'
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
                className="ml-2 text-[0.7rem] font-bold tracking-widest text-[#0F3D3E] hover:text-[#9B8A47] transition-colors duration-300 underline underline-offset-4 uppercase cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Right: sorting */}
          <div className="flex items-center gap-2.5">
            <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[#2C2C2C]/50 font-body">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/60 border border-[#E2C275]/15 rounded-lg px-3.5 py-2 text-[0.7rem] font-bold text-[#0F3D3E] outline-none focus:border-[#0F3D3E] cursor-pointer font-body shadow-sm uppercase tracking-wider"
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Dynamic Products Grid */}
        {filteredAndSortedItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAndSortedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleProductClick(item.id)}
                className="
                  group h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-xl
                  border border-[#E2C275]/12 shadow-sm hover:shadow-lg shadow-[#0F3D3E]/[0.01] hover:shadow-[#0F3D3E]/[0.05]
                  transition-all duration-500 ease-out hover:-translate-y-1 overflow-hidden cursor-pointer
                "
              >
                {/* Product Image and Badges */}
                <div className="relative aspect-square overflow-hidden bg-[#FFF8E7]/30 border-b border-[#E2C275]/10">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Overlays Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-col gap-1 pointer-events-none items-start">
                    {item.tags && item.tags.includes('featured') && (
                      <span className="text-[0.45rem] font-extrabold tracking-widest uppercase bg-[#033B31] text-white px-2 py-0.5 rounded-full shadow-sm">
                        FEATURED
                      </span>
                    )}
                    {item.tags && item.tags.includes('new-arrival') && (
                      <span className="text-[0.45rem] font-extrabold tracking-widest uppercase bg-[#0F3D3E] text-[#FFF8E7] px-2 py-0.5 rounded-full shadow-sm border border-[#E2C275]/20">
                        NEW ARRIVAL
                      </span>
                    )}
                    {item.tags && item.tags.includes('out-of-stock') && (
                      <span className="text-[0.45rem] font-extrabold tracking-widest uppercase bg-[#FF003C] text-white px-2 py-0.5 rounded-full shadow-sm">
                        OUT OF STOCK
                      </span>
                    )}
                  </div>
                </div>

                {/* Info block */}
                <div className="p-3 font-body flex flex-col flex-1">
                  {/* Brand / Category Badge */}
                  <span className="text-[0.52rem] font-extrabold tracking-[1.5px] text-[#2C2C2C]/50 block mb-0.5 uppercase">
                    {item.category === 'sets' ? 'CURATED SET' : (item.brand || 'FRAGRANCE')}
                  </span>

                  {/* Product Title */}
                  <h3 className="font-heading text-xs font-extrabold text-[#0F3D3E] mb-1 tracking-wide leading-tight group-hover:text-[#9B8A47] transition-colors duration-300 truncate">
                    {item.name}
                  </h3>

                  {/* Selected size price */}
                  <div className="text-xs font-bold text-[#0F3D3E] mb-2 font-body">
                    ₹{(() => {
                      const idx = getCardSizeIndex(item.id);
                      const priceVal = item.sizes && item.sizes[idx] ? item.sizes[idx].price : item.price;
                      return priceVal.toLocaleString('en-IN');
                    })()}
                  </div>

                  {/* Size selectors */}
                  {item.sizes && item.sizes.length > 0 && (
                    <div className="flex flex-nowrap gap-1 mb-2.5 overflow-x-auto scrollbar-hide py-0.5 whitespace-nowrap">
                      {item.sizes.map((sz, idx) => {
                        const isSelected = getCardSizeIndex(item.id) === idx;
                        const sizeLabel = sz.size.split(' ')[0].toUpperCase();
                        const isOutOfStock = item.tags && item.tags.includes('out-of-stock');
                        
                        if (isOutOfStock) {
                          return (
                            <button
                              key={idx}
                              disabled
                              className={`
                                px-2 py-1 rounded border text-[0.6rem] font-medium select-none cursor-not-allowed transition-all duration-200
                                ${isSelected 
                                  ? 'border-[#0F3D3E] text-gray-400 bg-gray-50' 
                                  : 'border-gray-200 text-gray-300 bg-gray-50/50'
                                }
                              `}
                              style={{ textDecoration: 'line-through' }}
                            >
                              {sizeLabel} (Out)
                            </button>
                          );
                        }
                        
                        return (
                          <button
                            key={idx}
                            onClick={(e) => handleSelectCardSize(item.id, idx, e)}
                            className={`
                              px-2 py-1 rounded text-[0.6rem] font-bold uppercase transition-all duration-200 cursor-pointer select-none border
                              ${isSelected
                                ? 'bg-[#0F3D3E] border-[#0F3D3E] text-white shadow-sm font-black'
                                : 'bg-white border-gray-200 text-[#0F3D3E] hover:bg-[#E2C275]/15 hover:border-[#E2C275]/40'
                              }
                            `}
                          >
                            {sizeLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}

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
                          className="w-full py-1.5 rounded border border-gray-200 bg-gray-50 text-gray-300 text-[0.65rem] font-bold tracking-widest uppercase text-center cursor-not-allowed mt-auto"
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
                          w-full py-1.5 rounded border border-[#0F3D3E] text-[0.65rem] font-bold tracking-widest uppercase transition-all duration-300 mt-auto cursor-pointer
                          ${isAdding
                            ? 'bg-[#0F3D3E] text-[#FFF8E7] border-[#0F3D3E]'
                            : 'bg-white text-[#0F3D3E] hover:bg-[#0F3D3E] hover:text-[#FFF8E7]'
                          }
                        `}
                      >
                        {isAdding ? (
                          <span className="flex items-center justify-center gap-1">
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
          <div className="text-center py-16 bg-white/40 border border-[#E2C275]/12 rounded-3xl p-8 shadow-sm">
            <i className="fas fa-search text-[#0F3D3E]/20 text-4xl mb-4"></i>
            <h4 className="font-heading text-lg font-bold text-[#0F3D3E] mb-1">No Scents Found</h4>
            <p className="text-xs text-[#2C2C2C]/50 font-body">
              Try adjusting your filters, search term, or sorting option.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-4 px-5 py-2.5 rounded-full bg-[#0F3D3E] text-[#FFF8E7] hover:bg-[#E2C275] hover:text-[#0F3D3E] text-[0.7rem] font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer shadow-sm"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end justify-center lg:justify-end"
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="
                fixed top-0 bottom-0 right-0 w-full lg:max-w-2xl bg-[#FFF8E7] z-50
                shadow-2xl flex flex-col h-full border-l border-[#E2C275]/15
              "
            >
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-6 sm:p-8 lg:p-10 pb-32">
                {/* Header panel controls */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E2C275]/15">
                  <span className="text-[0.62rem] font-bold tracking-[4px] uppercase text-[#C4A85A]">
                    Interactive Concierge Sizing
                  </span>
                  <button
                    onClick={closeQuickView}
                    aria-label="Close panel"
                    className="
                      group w-9 h-9 rounded-full bg-[#0F3D3E]/5 hover:bg-[#0F3D3E]
                      flex items-center justify-center text-[#0F3D3E] hover:text-[#FFF8E7]
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
                    <div className="aspect-square rounded-2xl overflow-hidden bg-[#FFF8E7]/30 border border-[#E2C275]/15 shadow-md">
                      <img
                        src={selectedItem.image}
                        alt={selectedItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Sourcing certificate box */}
                    <div className="mt-5 p-4 rounded-xl bg-[#0F3D3E]/[0.03] border border-[#E2C275]/10">
                      <div className="flex gap-2 items-start">
                        <ShieldCheckIcon className="w-4 h-4 text-[#C4A85A] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[0.68rem] font-semibold text-[#0F3D3E] uppercase tracking-wider">
                            Authenticity Promise
                          </p>
                          <p className="text-[0.65rem] text-[#0F3D3E]/60 leading-relaxed mt-1 font-body">
                            Sourced directly from batch-tracked original retail bottles. Hand-decanted to order.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Descriptions, Pyramids, and Size Selector */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="text-[0.62rem] font-bold tracking-widest uppercase text-[#9B8A47] bg-[#9B8A47]/[0.06] px-2.5 py-1 rounded-md inline-block mb-3">
                        {selectedItem.category === 'decants' ? 'Decant Scent' : selectedItem.category === 'sets' ? 'Collection Set' : 'Retail Bottle'}
                      </span>
                      <h3 className="font-heading text-2xl lg:text-3xl font-bold text-[#0F3D3E] mb-2 tracking-wide leading-tight">
                        {selectedItem.name}
                      </h3>
                      <p className="text-[0.78rem] text-[#9B8A47] italic tracking-wide mb-4">
                        {selectedItem.tagline}
                      </p>
                      <p className="text-[0.85rem] text-[#2C2C2C]/80 leading-relaxed font-body font-normal mb-6">
                        {selectedItem.description}
                      </p>

                      {/* Olfactory Pyramid Accordion */}
                      <div className="mb-8 p-5 rounded-2xl bg-white/70 border border-[#E2C275]/12 shadow-sm">
                        <h4 className="text-[0.72rem] font-bold uppercase tracking-wider text-[#0F3D3E] mb-4 pb-2 border-b border-[#E2C275]/10">
                          Olfactory Pyramid
                        </h4>
                        <div className="space-y-3">
                          <div className="grid grid-cols-[80px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold text-[#9B8A47] uppercase tracking-wide">Top notes:</span>
                            <span className="text-[#2C2C2C]">{selectedItem.pyramid.top}</span>
                          </div>
                          <div className="grid grid-cols-[80px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold text-[#9B8A47] uppercase tracking-wide">Heart notes:</span>
                            <span className="text-[#2C2C2C]">{selectedItem.pyramid.heart}</span>
                          </div>
                          <div className="grid grid-cols-[80px_1fr] text-[0.72rem] leading-normal font-body">
                            <span className="font-bold text-[#9B8A47] uppercase tracking-wide">Base notes:</span>
                            <span className="text-[#2C2C2C]">{selectedItem.pyramid.base}</span>
                          </div>
                        </div>
                      </div>

                      {/* Size Selector */}
                      <div className="mb-6">
                        <h4 className="text-[0.72rem] font-bold uppercase tracking-wider text-[#0F3D3E] mb-3">
                          Select Product Option
                        </h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          {selectedItem.sizes.map((sz, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSizeIndex(idx)}
                              className={`
                                p-3 rounded-xl border text-left cursor-pointer transition-all duration-300
                                ${selectedSizeIndex === idx
                                  ? 'bg-[#0F3D3E] border-[#0F3D3E] text-[#FFF8E7] shadow-md shadow-[#0F3D3E]/10'
                                  : 'bg-white/50 border-[#E2C275]/15 text-[#2C2C2C] hover:bg-[#F5ECD7]/40 hover:border-[#E2C275]/30'
                                }
                              `}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[0.72rem] font-semibold ${selectedSizeIndex === idx ? 'text-[#E2C275]' : 'text-[#0F3D3E]'}`}>
                                  {sz.size}
                                </span>
                                <span className="text-[0.8rem] font-bold">
                                  ₹{sz.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <span className={`text-[0.58rem] block ${selectedSizeIndex === idx ? 'text-[#ECD9A3]/80' : 'text-[#2C2C2C]/50'}`}>
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
              <div className="absolute bottom-0 left-0 right-0 bg-[#FFF8E7]/90 backdrop-blur-md border-t border-[#E2C275]/15 p-6 sm:p-8 flex items-center justify-between gap-6 z-20">
                <div>
                  <span className="text-[0.62rem] uppercase tracking-wider text-[#2C2C2C]/50 block">Selected Option Price</span>
                  <span className="text-2xl font-bold text-[#0F3D3E] font-heading tracking-wide">
                    ₹{selectedItem.sizes[selectedSizeIndex]?.price.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex gap-2.5 flex-1 max-w-xs justify-end">
                  <button
                    onClick={() => {
                      alert(`Concierge: Selected ${selectedItem.name} (${selectedItem.sizes[selectedSizeIndex]?.size}) for ₹${selectedItem.sizes[selectedSizeIndex]?.price.toLocaleString('en-IN')}`);
                      closeQuickView();
                    }}
                    className="
                      flex-1 px-6 py-3.5 rounded-xl bg-[#0F3D3E] text-[#FFF8E7]
                      hover:bg-[#E2C275] hover:text-[#0F3D3E] border border-[#0F3D3E] hover:border-[#E2C275]
                      text-[0.76rem] font-bold tracking-widest uppercase shadow-md hover:shadow-lg
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
