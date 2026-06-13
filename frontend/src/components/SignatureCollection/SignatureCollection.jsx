import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collectionsData } from './CollectionData';

/**
 * Custom SVG Icon Components
 */
const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

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
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(1); // Default to 5ml Travel Spray
  
  const [localCategory, setLocalCategory] = useState('all');
  const currentCategory = onSelectCategory ? activeCategory : localCategory;
  const setCategory = onSelectCategory ? onSelectCategory : setLocalCategory;

  // Filter products based on selected category tag
  const filteredItems = useMemo(() => {
    if (currentCategory === 'all') return collectionsData;
    return collectionsData.filter(item => item.tags && item.tags.includes(currentCategory));
  }, [currentCategory]);

  const [currentIndex, setCurrentIndex] = useState(filteredItems.length);
  const [disableTransition, setDisableTransition] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const containerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  
  const [slideWidth, setSlideWidth] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(4);
  const gap = 24;

  // 3x extended array to support smooth infinite loop scrolling
  const extendedItems = useMemo(() => {
    return [...filteredItems, ...filteredItems, ...filteredItems];
  }, [filteredItems]);

  // Update slide dimensions dynamically based on responsiveness breakpoints
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      let views = 4;
      if (window.innerWidth < 640) views = 1;
      else if (window.innerWidth < 1024) views = 2;
      else if (window.innerWidth < 1280) views = 3;

      // Ensure views does not exceed total items to prevent layout gaps
      const L = filteredItems.length;
      if (L > 0 && views > L) {
        views = L;
      }

      setSlidesPerView(views);
      const calculatedWidth = (containerWidth - (views - 1) * gap) / views;
      setSlideWidth(calculatedWidth);
    }
  }, [filteredItems.length]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const timeout = setTimeout(updateDimensions, 150);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeout);
    };
  }, [updateDimensions]);

  // Reset index to start of middle clone whenever list changes
  useEffect(() => {
    setCurrentIndex(filteredItems.length);
    setIsTransitioning(false);
    setDisableTransition(true);
  }, [filteredItems.length]);

  // Handle loop resets after transition animation completes
  const handleAnimationComplete = () => {
    setIsTransitioning(false);
    
    // Jump instantly (no animation) to middle range once out of bounds
    const L = filteredItems.length;
    if (L === 0) return;
    if (currentIndex >= 2 * L) {
      setDisableTransition(true);
      setCurrentIndex(currentIndex - L);
    } else if (currentIndex < L) {
      setDisableTransition(true);
      setCurrentIndex(currentIndex + L);
    }
  };

  // Turn transitions back on after jumping
  useEffect(() => {
    if (disableTransition) {
      const raf = requestAnimationFrame(() => {
        setDisableTransition(false);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [disableTransition]);

  // Autoplay functionality (pauses when drawer is open, list is short, or user hovers)
  useEffect(() => {
    if (isHovered || selectedItem || filteredItems.length <= 1) return;

    const timer = setInterval(() => {
      if (!isTransitioning && !disableTransition) {
        setDisableTransition(false);
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev + 1);
      }
    }, 4500);

    return () => clearInterval(timer);
  }, [isHovered, selectedItem, isTransitioning, disableTransition, filteredItems.length]);

  // Slide navigation
  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    setDisableTransition(false);
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  }, [isTransitioning]);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setDisableTransition(false);
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  }, [isTransitioning]);

  const goToSlide = (dotIndex) => {
    if (isTransitioning) return;
    const L = filteredItems.length;
    if (L === 0) return;
    setDisableTransition(false);
    setIsTransitioning(true);
    setCurrentIndex(dotIndex + L);
  };

  // Touch handlers for mobile swipe gesture support
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Open & Close Concierge drawer
  const openQuickView = (item) => {
    setSelectedItem(item);
    setSelectedSizeIndex(1); // Reset default to 5ml Travel Spray
    document.body.style.overflow = 'hidden';
  };

  const closeQuickView = () => {
    setSelectedItem(null);
    document.body.style.overflow = '';
  };

  // Math to map the current active dot index
  const activeDot = useMemo(() => {
    const L = filteredItems.length;
    if (L === 0) return 0;
    return ((currentIndex - L) % L + L) % L;
  }, [currentIndex, filteredItems.length]);

  return (
    <section 
      className="relative bg-[#FFF8E7] py-20 lg:py-28 overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background visual graphics */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #E2C275 1px, transparent 1px), linear-gradient(to bottom, #E2C275 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(226,194,117,0.05)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(15,61,62,0.03)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 lg:mb-16">
          <div className="max-w-xl">
            <span className="text-[0.65rem] font-bold tracking-[5px] uppercase text-[#C4A85A] block mb-3">
              Curated Masterpieces
            </span>
            <h2 className="font-heading text-4xl lg:text-5xl font-bold text-[#072227] tracking-wide leading-tight">
              Our Signature Collection
            </h2>
            <div className="mt-4 h-0.5 w-16 bg-gradient-to-r from-[#E2C275] to-transparent" />
            <p className="mt-4 text-[0.92rem] lg:text-[0.96rem] text-[#2C2C2C]/75 leading-relaxed font-body font-normal">
              Indulge in our collection of hand-selected, high-character luxury decants. Pure, original formulations sourced from the world’s most elite perfumery houses.
            </p>
          </div>

          {/* Luxury Arrow buttons */}
          <div className="flex items-center gap-3 mt-6 md:mt-0">
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              className="group w-12 h-12 rounded-full border border-[#E2C275]/25 flex items-center justify-center text-[#0F3D3E] hover:text-[#FFF8E7] bg-white/40 hover:bg-[#0F3D3E] transition-all duration-300 hover:scale-105 hover:border-[#0F3D3E] cursor-pointer"
            >
              <ChevronLeftIcon className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-300" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              className="group w-12 h-12 rounded-full border border-[#E2C275]/25 flex items-center justify-center text-[#0F3D3E] hover:text-[#FFF8E7] bg-white/40 hover:bg-[#0F3D3E] transition-all duration-300 hover:scale-105 hover:border-[#0F3D3E] cursor-pointer"
            >
              <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs (Horizontal scroll bar matching luxury styling) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-5 mb-10 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'summer', label: 'Summer Perfumes' },
            { id: 'winter', label: 'Winter Perfumes' },
            { id: 'office', label: 'Office Perfumes' },
            { id: 'gym', label: 'Gym Perfumes' },
            { id: 'datenight', label: 'Date Night Perfumes' },
            { id: 'party', label: 'Party Perfumes' },
            { id: 'her', label: 'For Her' },
            { id: 'him', label: 'For Him' },
          ].map((tab) => {
            const isActive = currentCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={`
                  px-5 py-2.5 rounded-full text-[0.72rem] font-bold tracking-widest uppercase
                  transition-all duration-300 ease-out whitespace-nowrap cursor-pointer border
                  ${isActive
                    ? 'bg-[#0F3D3E] border-[#0F3D3E] text-[#FFF8E7] shadow-md shadow-[#0F3D3E]/15 hover:scale-102'
                    : 'bg-white/60 border-[#E2C275]/15 text-[#0F3D3E] hover:bg-[#E2C275]/10 hover:border-[#E2C275]/35'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Carousel Track Container */}
        <div 
          ref={containerRef}
          className="relative overflow-visible cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            className="flex"
            style={{ gap: `${gap}px` }}
            animate={{ x: -currentIndex * (slideWidth + gap) }}
            transition={
              disableTransition 
                ? { duration: 0 } 
                : { type: 'tween', ease: [0.25, 1, 0.5, 1], duration: 0.65 }
            }
            onAnimationComplete={handleAnimationComplete}
          >
            {extendedItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                style={{ width: slideWidth, flexShrink: 0 }}
                className="h-auto pb-6"
              >
                <div 
                  className="
                    group h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-3xl
                    border border-[#E2C275]/12 shadow-md hover:shadow-xl shadow-[#0F3D3E]/[0.02] hover:shadow-[#0F3D3E]/[0.06]
                    transition-all duration-500 ease-out hover:-translate-y-1.5 overflow-hidden
                  "
                >
                  {/* Fragrance Image Frame */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#FFF8E7]/30 border-b border-[#E2C275]/10">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    {/* Category Label Overlay */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="text-[0.62rem] font-bold tracking-widest uppercase bg-[#0F3D3E]/90 backdrop-blur-sm text-[#FFF8E7] px-3 py-1.5 rounded-full border border-[#E2C275]/20 shadow-sm">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Card Info Body */}
                  <div className="p-6 lg:p-7 flex flex-col flex-1">
                    {/* Notes tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.notes.slice(0, 2).map((note, noteIdx) => (
                        <span key={noteIdx} className="text-[0.65rem] font-medium text-[#9B8A47] bg-[#9B8A47]/[0.06] px-2.5 py-1 rounded-md">
                          {note}
                        </span>
                      ))}
                    </div>

                    <h3 className="font-heading text-lg lg:text-xl font-bold text-[#0F3D3E] mb-2 tracking-wide leading-tight group-hover:text-[#9B8A47] transition-colors duration-300">
                      {item.name}
                    </h3>
                    
                    <p className="text-[0.8rem] lg:text-[0.84rem] text-[#2C2C2C]/70 leading-relaxed font-body font-normal mb-5 flex-1 line-clamp-3">
                      {item.description}
                    </p>

                    {/* Bottom strip details */}
                    <div className="pt-4 border-t border-[#E2C275]/10 flex items-center justify-between">
                      <div>
                        <span className="text-[0.62rem] uppercase tracking-wider text-[#2C2C2C]/50 block font-body">Decants from</span>
                        <span className="text-[1.1rem] font-bold text-[#0F3D3E] font-body">
                          ₹{item.sizes[0].price}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => openQuickView(item)}
                        className="
                          relative overflow-hidden group/btn px-4 py-2.5 rounded-xl
                          bg-[#0F3D3E] hover:bg-[#E2C275] border border-[#0F3D3E] hover:border-[#E2C275]
                          text-[#FFF8E7] hover:text-[#0F3D3E] text-[0.72rem] font-bold tracking-widest uppercase
                          transition-all duration-300 ease-out hover:scale-102 flex items-center gap-1.5 cursor-pointer
                        "
                      >
                        <span>Explore</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform duration-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Carousel indicator dots */}
        <div className="mt-10 flex justify-center items-center gap-2.5">
          {filteredItems.map((_, idx) => {
            const isActive = activeDot === idx;
            return (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`
                  h-1.5 rounded-full transition-all duration-300 cursor-pointer
                  ${isActive 
                    ? 'w-6 bg-[#0F3D3E]' 
                    : 'w-1.5 bg-[#E2C275]/40 hover:bg-[#E2C275]'
                  }
                `}
              />
            );
          })}
        </div>
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
                    <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-[#FFF8E7]/30 border border-[#E2C275]/15 shadow-md">
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
                          <p className="text-[0.68rem] font-semibold text-[#0F3D3E] uppercase tracking-wider">Authenticity Promise</p>
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
                        {selectedItem.category}
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
                          Select Decant Size
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
                                  ₹{sz.price}
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
                  <span className="text-[0.62rem] uppercase tracking-wider text-[#2C2C2C]/50 block">Selected Decant Price</span>
                  <span className="text-2xl font-bold text-[#0F3D3E] font-heading tracking-wide">
                    ₹{selectedItem.sizes[selectedSizeIndex].price}
                  </span>
                </div>

                <div className="flex gap-2.5 flex-1 max-w-xs justify-end">
                  <button
                    onClick={() => {
                      alert(`Concierge: Selected ${selectedItem.name} (${selectedItem.sizes[selectedSizeIndex].size}) for ₹${selectedItem.sizes[selectedSizeIndex].price}`);
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
                    <span>Purchase Decant</span>
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
