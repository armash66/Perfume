import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addToCart } from '../utils/cartHelper';

export default function ProductPage({ product, onBackToShop }) {
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [selectedBottle, setSelectedBottle] = useState('classic');
  const [isAdding, setIsAdding] = useState(false);
  const [detectedAspect, setDetectedAspect] = useState('aspect-[1/1]');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedSizeIndex(0);
    setActiveImageIndex(0);
    setDetectedAspect('aspect-[1/1]');
    setImageErrors({});
    setIsLightboxOpen(false);
    setIsZoomed(false);
    setIsImageLoading(true);
  }, [product]);

  // Set image loading state to true on active image change
  useEffect(() => {
    setIsImageLoading(true);
  }, [activeImageIndex]);

  // Selected option details
  const selectedOption = useMemo(() => {
    if (!product || !product.sizes || product.sizes.length === 0) return null;
    return product.sizes[selectedSizeIndex] || product.sizes[0];
  }, [product, selectedSizeIndex]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) {
      return product.images;
    }
    return [product.image];
  }, [product]);

  const handleNextImage = () => {
    if (galleryImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
    setIsZoomed(false);
  };

  const handlePrevImage = () => {
    if (galleryImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    setIsZoomed(false);
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, galleryImages]);

  // Touch handlers for Lightbox swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNextImage();
    } else if (isRightSwipe) {
      handlePrevImage();
    }
  };

  // Competitor equivalents for different sizes
  const competitorPriceForSize = useMemo(() => {
    if (!product || !selectedOption) return 0;
    // Extract size number
    const sizeMl = parseInt(selectedOption.size) || 2;
    if (product.id === 'baccarat-rouge-540' && sizeMl === 2) {
      return 1750;
    }
    const baseCompetitor = product.competitorPrice || Math.round(product.price * 1.18);
    // Scale competitor price based on ml (traditional decants charge more per ml for smaller sizes)
    const ratio = sizeMl / 2;
    // Apply a sliding scale for larger sizes
    const scaleFactor = ratio > 1 ? Math.pow(ratio, 0.9) : ratio;
    return Math.round((baseCompetitor * scaleFactor) / 10) * 10;
  }, [product, selectedOption]);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center font-body">
        <h3 className="font-heading text-2xl font-bold text-[#0F3D3E] mb-2">Scents Not Loaded</h3>
        <button onClick={onBackToShop} className="px-6 py-2.5 bg-[#0F3D3E] text-white rounded-full text-xs font-bold uppercase tracking-wider">
          Return to Shop
        </button>
      </div>
    );
  }

  // Handle Add to Cart
  const handleAddToCart = () => {
    setIsAdding(true);
    
    // Add to unified cart helper
    addToCart(product, selectedOption);

    setTimeout(() => {
      setIsAdding(false);
      alert(`Added ${product.name} (${selectedOption.size}) to your cart!`);
    }, 500);
  };

  // Pricing calculations
  const bottleRetailPrice = product.retailPrice || (product.price * 20);
  const selectedSizePrice = selectedOption ? selectedOption.price : product.price;

  const savingsAmount = competitorPriceForSize - selectedSizePrice;
  const savingsPercent = Math.round((savingsAmount / competitorPriceForSize) * 100);

  const renderDescriptionAndPricing = () => (
    <>
      {/* Divider line */}
      <div className="h-px w-full bg-black/8 mb-16" />

      {/* SECTION 3: Fragrance Description */}
      <div className="mb-16">
        <h3 className="font-heading text-lg font-light text-[#1C1B18] uppercase tracking-[3px] mb-8 pb-3 border-b border-black/8">
          Fragrance Description
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-12 items-start">
          {/* Left: description text */}
          <div className="flex flex-col gap-5">
            {product.description.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="text-[0.82rem] text-black/70 leading-relaxed font-body font-normal">
                {paragraph}
              </p>
            ))}

            <div className="mt-4">
              <h4 className="text-[0.72rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-3">
                Why you'll love it:
              </h4>
              <ul className="list-disc pl-5 text-[0.78rem] text-black/65 leading-relaxed space-y-2">
                <li>Sourced from genuine batch-tracked original retail stock.</li>
                <li>Hand-poured and sealed to order in pristine conditions.</li>
                <li>Exceptional longevity and silage suitable for distinguished tastes.</li>
                <li>Perfect travel size option to experience luxury without high bottle commitments.</li>
              </ul>
            </div>
          </div>

          {/* Right: Olfactory pyramid & Characteristics */}
          <div className="flex flex-col gap-6">
            {/* Olfactory pyramid */}
            <div className="bg-[#FEFCF9] border border-black/6 rounded-none p-6 shadow-sm">
              <h4 className="text-[0.75rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-4 pb-2 border-b border-black/5 font-heading font-normal">
                Olfactory Pyramid
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-[95px_1fr] text-[0.76rem] leading-normal">
                  <span className="font-bold text-[#B08A50] uppercase tracking-wide font-body">Top notes:</span>
                  <span className="text-black/85">{product.pyramid.top}</span>
                </div>
                <div className="grid grid-cols-[95px_1fr] text-[0.76rem] leading-normal">
                  <span className="font-bold text-[#B08A50] uppercase tracking-wide font-body">Heart notes:</span>
                  <span className="text-black/85">{product.pyramid.heart}</span>
                </div>
                <div className="grid grid-cols-[95px_1fr] text-[0.76rem] leading-normal">
                  <span className="font-bold text-[#B08A50] uppercase tracking-wide font-body">Base notes:</span>
                  <span className="text-black/85">{product.pyramid.base}</span>
                </div>
              </div>
            </div>

            {/* Scent Characteristics Card */}
            {product.characteristics && (
              <div className="bg-[#FEFCF9] border border-black/6 rounded-none p-6 shadow-sm">
                <h4 className="text-[0.75rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-4 pb-2 border-b border-black/5 font-heading font-normal">
                  Scent Characteristics
                </h4>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center text-[0.75rem]">
                    <span className="font-bold text-[#B08A50] uppercase tracking-wide">Longevity:</span>
                    <span className="text-black/80 font-semibold">{product.characteristics.longevity}</span>
                  </div>
                  <div className="flex justify-between items-center text-[0.75rem]">
                    <span className="font-bold text-[#B08A50] uppercase tracking-wide">Sillage:</span>
                    <span className="text-black/80 font-semibold">{product.characteristics.sillage}</span>
                  </div>
                  <div className="flex justify-between items-center text-[0.75rem]">
                    <span className="font-bold text-[#B08A50] uppercase tracking-wide">Gender Profile:</span>
                    <span className="text-black/80 font-semibold">{product.characteristics.gender}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: Fair Pricing Block */}
      <div className="bg-[#1C1B18] text-[#F7F3ED] rounded-none p-8 md:p-12 mb-12 shadow-md relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(176,138,80,0.05)_0%,transparent_70%)] rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <span className="text-[0.62rem] font-bold tracking-[3px] text-[#B08A50] uppercase block mb-3">
              FAIR PRICING
            </span>
            <h3 className="font-heading text-3xl font-light tracking-wide leading-tight mb-2 text-white">
              Transparent Pricing Table
            </h3>
            <p className="text-[0.85rem] text-white/70">
              Compare our decant prices and original retail counterparts. Know exactly how much you save.
            </p>
          </div>

          {/* Savings Comparison Table */}
          <div className="overflow-x-auto bg-white/[0.02] border border-white/5 rounded-none p-4 shadow-sm mb-6">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[#B08A50] font-bold uppercase tracking-wider text-[0.68rem]">
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4 text-center">Our Price</th>
                  <th className="py-3.5 px-4 text-center">Traditional Decanters</th>
                  <th className="py-3.5 px-4 text-right">You Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {product.sizes.map((sz, idx) => {
                  const sizeMl = parseInt(sz.size) || 2;
                  const baseComp = product.competitorPrice || Math.round(product.price * 1.18);
                  const ratio = sizeMl / 2;
                  const scaleFactor = ratio > 1 ? Math.pow(ratio, 0.9) : ratio;
                  const compPrice = Math.round((baseComp * scaleFactor) / 10) * 10;
                  const saveAmt = compPrice - sz.price;
                  const savePct = Math.round((saveAmt / compPrice) * 100);

                  return (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors text-white/90">
                      <td className="py-4 px-4 font-bold">{sz.size}</td>
                      <td className="py-4 px-4 text-center font-bold text-[#B08A50]">₹{sz.price.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-center text-white/50 line-through">₹{compPrice.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-bold text-[#B08A50]">+₹{saveAmt.toLocaleString('en-IN')} ({savePct}%)</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[0.75rem] text-white/50 text-center mb-4 leading-relaxed">
            Transparent margins directly calculated from original retail bottle values. No hidden markups.
          </p>
          <div className="text-center">
            <a href="#fairpricing" onClick={(e) => { e.preventDefault(); alert("We slice costs by avoiding traditional designer branding and distributor markups."); }} className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-[#B08A50] hover:text-white transition-colors uppercase border-b border-[#B08A50]/20 pb-0.5">
              Explore Our DTC Model <i className="fas fa-arrow-right text-[10px]"></i>
            </a>
          </div>
        </div>
      </div>

      {/* SECTION 5: Genuine Pricing Block */}
      <div className="bg-[#FEFCF9] border border-black/6 rounded-none p-8 md:p-12 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-12">
        {/* Left info */}
        <div className="flex-1 max-w-xl">
          <span className="inline-block text-[0.55rem] font-bold tracking-widest uppercase bg-[#B08A50]/8 text-[#B08A50] px-3 py-1 rounded-none shadow-sm mb-4">
            GENUINE PRICING
          </span>
          <h3 className="font-heading text-2xl font-light text-[#1C1B18] tracking-wide mb-3 leading-tight">
            No fake markups. No "coupon drama."
          </h3>
          <p className="text-xs sm:text-[0.82rem] text-black/60 leading-relaxed mt-2">
            Some stores inflate the price just to "slash" it at checkout with mock coupons. We don't do that. Our pricing is the real price — fair from the start. Here is a clear visual breakdown of what you pay for in traditional retail versus the raw liquid truth:
          </p>

          {/* Interactive Markup Cost Visual Chart */}
          <div className="mt-6 space-y-4 max-w-md">
            <div>
              <div className="flex justify-between text-[0.72rem] font-bold text-[#1C1B18] mb-1.5 uppercase tracking-wider">
                <span>Fragrance Liquid & Bottle Sourcing</span>
                <span>75%</span>
              </div>
              <div className="h-2 w-full bg-black/5 rounded-none overflow-hidden">
                <div className="h-full bg-[#1C1B18]" style={{ width: '75%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[0.72rem] font-bold text-[#1C1B18] mb-1.5 uppercase tracking-wider">
                <span>Sterile Siphoning & Packaging Labor</span>
                <span>15%</span>
              </div>
              <div className="h-2 w-full bg-black/5 rounded-none overflow-hidden">
                <div className="h-full bg-[#B08A50]" style={{ width: '15%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[0.72rem] font-bold text-[#1C1B18] mb-1.5 uppercase tracking-wider">
                <span>Raw Operations & Logistics</span>
                <span>10%</span>
              </div>
              <div className="h-2 w-full bg-black/5 rounded-none overflow-hidden">
                <div className="h-full bg-black/40" style={{ width: '10%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Price Truth Box */}
        <div className="bg-[#EFE8DD] text-[#1C1B18] border border-black/5 rounded-none p-6 w-full md:w-[360px] shadow-sm flex flex-col justify-between h-[200px]">
          <span className="text-[0.62rem] font-bold tracking-[3px] text-[#B08A50] uppercase block mb-1">
            PRICE TRUTH
          </span>
          
          <div className="flex justify-between items-center text-[0.68rem] font-bold tracking-wide uppercase border-b border-black/8 pb-3 mb-2 text-black/55">
            <span>Other Sites</span>
            <span className="italic">Marked up + coupon bait</span>
          </div>

          <div className="flex justify-between items-center bg-[#FEFCF9] border border-black/8 rounded-none px-4 py-3">
            <span className="text-[0.62rem] font-bold tracking-[2px] text-[#B08A50] uppercase font-body">DECUME</span>
            <span className="text-lg font-semibold text-[#B08A50]">
              ₹{selectedSizePrice.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="text-[0.55rem] font-bold text-[#B08A50] text-center tracking-[1.5px] uppercase mt-2">
            The price you see is the price you pay.
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative bg-[#F7F3ED] min-h-screen pb-20 font-body select-none">
      <div className="max-w-[1440px] xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 pt-8 lg:pt-16">
        
        {/* Breadcrumbs */}
        <div className="text-[0.6rem] font-bold tracking-[3px] text-[#B08A50] uppercase mb-8">
          <span className="cursor-pointer text-[#B08A50]/60 hover:text-[#1C1B18] transition-colors" onClick={onBackToShop}>HOME</span>
          <span className="mx-2 text-[#B08A50]/40">&gt;</span>
          <span className="cursor-pointer text-[#B08A50]/60 hover:text-[#1C1B18] transition-colors" onClick={onBackToShop}>SHOP</span>
          <span className="mx-2 text-[#B08A50]/40">&gt;</span>
          <span className="text-[#1C1B18]">{product.name.toUpperCase()}</span>
        </div>

        {/* Dynamic Sticky 3-Column Split Container */}
        <div className={`grid grid-cols-1 gap-10 xl:gap-12 items-start mb-16 ${
          galleryImages.length > 1
            ? 'lg:grid-cols-[120px_minmax(0,1fr)_480px]'
            : 'lg:grid-cols-[minmax(0,1fr)_480px]'
        }`}>
          
          {/* Column 1: Desktop Thumbnail Rail (hidden on mobile/tablet) */}
          {galleryImages.length > 1 && (
            <div className="hidden lg:flex flex-col gap-5 w-[110px] xl:w-[120px] select-none">
              {galleryImages.map((imgUrl, idx) => {
                const isActive = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setIsZoomed(false);
                    }}
                    className={`relative overflow-hidden rounded-2xl border aspect-square w-full bg-white flex items-center justify-center cursor-pointer shadow-sm transition-all duration-300 ${
                      isActive
                        ? 'ring-2 ring-amber-500 shadow-lg scale-[1.03] border-transparent'
                        : 'border-neutral-200 hover:scale-105 hover:-translate-y-1 hover:shadow-xl hover:border-neutral-300'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* Column 2: Main Image Column (with Description & Pricing underneath on desktop) */}
          <div className="flex flex-col gap-6 w-full">
            {/* Main Hero Image Wrapper */}
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              className={`relative w-full overflow-hidden rounded-[32px] bg-white border border-neutral-200 shadow-sm transition-all duration-500 hover:shadow-lg min-h-[420px] lg:min-h-[650px] xl:min-h-[750px] ${detectedAspect}`}
            >
              {imageErrors[activeImageIndex] ? (
                /* Premium Placeholder Fallback */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F7F3ED] text-black/40 p-6 text-center select-none z-10">
                  <svg className="w-16 h-16 text-[#B08A50] mb-4 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6v2H9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 6h2v3h-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9h12v11a2 2 0 01-2 2H8a2 2 0 01-2-2V9z" />
                    <rect x="9" y="12" width="6" height="5" rx="0.5" stroke="currentColor" strokeWidth={1} strokeDasharray="2 2" />
                  </svg>
                  <span className="text-[0.62rem] font-bold tracking-[3px] text-[#B08A50] uppercase mb-1">{product.brand}</span>
                  <span className="text-[0.8rem] font-light font-heading text-[#1C1B18]/70 max-w-[200px]">{product.name}</span>
                </div>
              ) : (
                <>
                  {/* Luxury Loading Pulse Skeleton */}
                  {isImageLoading && (
                    <div className="absolute inset-0 bg-neutral-50 animate-pulse z-10 flex items-center justify-center">
                      <div className="w-12 h-16 border border-neutral-200/50 opacity-20 relative overflow-hidden" />
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeImageIndex}
                      src={galleryImages[activeImageIndex]}
                      alt={product.name}
                      loading={activeImageIndex === 0 ? "eager" : "lazy"}
                      decoding="async"
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105 cursor-zoom-in z-0"
                      onClick={() => setIsLightboxOpen(true)}
                      onError={() => {
                        setImageErrors((prev) => ({ ...prev, [activeImageIndex]: true }));
                      }}
                      onLoad={(e) => {
                        setIsImageLoading(false);
                        const { naturalWidth, naturalHeight } = e.target;
                        if (naturalWidth && naturalHeight) {
                          const ratio = naturalWidth / naturalHeight;
                          if (ratio > 1.1) {
                            setDetectedAspect('aspect-[4/3]');
                          } else if (ratio < 0.9) {
                            setDetectedAspect('aspect-[4/5]');
                          } else {
                            setDetectedAspect('aspect-[1/1]');
                          }
                        }
                      }}
                    />
                  </AnimatePresence>
                </>
              )}

              {/* Floating elegant navigation buttons */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full backdrop-blur-md bg-white/90 shadow-lg border border-black/5 hover:scale-110 active:scale-95 transition-all text-[#1C1B18] flex items-center justify-center cursor-pointer select-none z-20"
                    aria-label="Previous image"
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full backdrop-blur-md bg-white/90 shadow-lg border border-black/5 hover:scale-110 active:scale-95 transition-all text-[#1C1B18] flex items-center justify-center cursor-pointer select-none z-20"
                    aria-label="Next image"
                  >
                    <i className="fas fa-chevron-right text-xs"></i>
                  </button>
                </>
              )}
            </div>

            {/* Tablet Experience: Horizontal Scrollable Thumbnail Rail (hidden on mobile/desktop) */}
            {galleryImages.length > 1 && (
              <div className="hidden md:flex lg:hidden flex-row gap-4 overflow-x-auto py-2 scrollbar-hide select-none w-full" style={{ scrollbarWidth: 'none' }}>
                {galleryImages.map((imgUrl, idx) => {
                  const isActive = activeImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setIsZoomed(false);
                      }}
                      className={`relative overflow-hidden rounded-2xl border aspect-square w-[96px] bg-white flex-shrink-0 flex items-center justify-center cursor-pointer shadow-sm transition-all duration-300 ${
                        isActive
                          ? 'ring-2 ring-amber-500 shadow-lg scale-[1.03] border-transparent'
                          : 'border-neutral-200 hover:scale-105 hover:-translate-y-1 hover:shadow-xl hover:border-neutral-300'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mobile Slider indicators (Dots below main container, hidden on tablet/desktop) */}
            {galleryImages.length > 1 && (
              <div className="flex md:hidden justify-center items-center gap-2 mt-2 select-none">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setIsZoomed(false);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      activeImageIndex === idx ? 'bg-[#1C1B18] w-5' : 'bg-black/20'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Desktop only: Description and pricing inside left column to extend grid height */}
            <div className="hidden lg:block w-full">
              {renderDescriptionAndPricing()}
            </div>
          </div>

          {/* Column 3: Product Buy Box */}
          <div className="lg:sticky lg:top-28 flex flex-col self-start w-full lg:pl-6">
            
            {/* Brand and Title */}
            <div className="mb-5">
              <span className="text-[0.65rem] font-bold tracking-[3px] text-black/40 uppercase block mb-2">
                {product.brand.toUpperCase()}
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl font-light text-[#1C1B18] tracking-wide leading-tight">
                {product.name}
                {selectedOption && (
                  <span className="text-[0.65rem] font-bold tracking-[2px] text-black/40 block mt-1.5 uppercase font-body">
                    {selectedOption.size}
                  </span>
                )}
              </h1>
            </div>

            {/* Rating Stars and Authenticated Check */}
            <div className="flex items-center gap-4 py-2 border-y border-black/6 mb-6">
              <div className="flex items-center gap-1 text-[#B08A50] text-xs">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
              <span className="text-black/10">|</span>
              <span className="flex items-center gap-1.5 text-[0.68rem] font-bold tracking-wider text-[#B08A50] uppercase">
                <i className="fas fa-circle-check"></i> Authenticated Fragrance
              </span>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="text-2xl font-semibold text-[#1C1B18] tracking-wide">
                ₹{selectedSizePrice.toLocaleString('en-IN')}
              </div>
              <span className="text-[0.58rem] font-bold tracking-wider text-black/40 uppercase block mt-1">
                TAX INCLUDED. SHIPPING CALCULATED AT CHECKOUT.
              </span>
            </div>

            {/* Size Selector */}
            <div className="overflow-visible mb-8">
              <h4 className="text-[0.65rem] font-bold tracking-widest text-[#1C1B18] uppercase mb-3">
                Select Size (ML)
              </h4>
              <div className="flex flex-wrap gap-7 py-1 items-center overflow-visible">
                {product.sizes.map((sz, idx) => {
                  const isSelected = selectedSizeIndex === idx;
                  const sizeLabel = sz.size
                    .replace(' Decant', '')
                    .replace(' Sample', '')
                    .replace(' Luxury Atomizer', '')
                    .replace(' Discovery Set', '')
                    .replace(' Retail Bottle', '')
                    .toUpperCase();
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedSizeIndex(idx)}
                      className="relative py-1.5 text-[0.68rem] tracking-widest uppercase cursor-pointer select-none focus:outline-none transition-colors duration-300 min-h-[40px] flex items-center justify-center focus-visible:ring-1 focus-visible:ring-black/10"
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
                          layoutId="activeSizeUnderlineProduct"
                          className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#1C1B18]"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Choose Your Bottle */}
            {product.category === 'decants' && (
              <div className="mb-8">
                <h4 className="text-[0.65rem] font-bold tracking-widest text-[#1C1B18] uppercase mb-3">
                  Choose Your Bottle
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  <div
                    onClick={() => setSelectedBottle('classic')}
                    className={`
                      p-4 rounded-none border text-left cursor-pointer transition-all duration-300 bg-white
                      ${selectedBottle === 'classic'
                        ? 'border-[#1C1B18] bg-black/[0.01]'
                        : 'border-black/8 hover:border-black/20'
                      }
                    `}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-[#1C1B18]">
                        Classic Micro Spray
                      </span>
                      <span className="text-[0.68rem] font-bold text-[#B08A50]">
                        +₹0
                      </span>
                    </div>
                    <span className="text-[0.58rem] block text-black/50">
                      Pure atomizer vial. Hand poured and sealed.
                    </span>
                  </div>
                </div>
                <a href="#bottles" onClick={(e) => { e.preventDefault(); alert("We decant using clean, medical-grade glass atomizers."); }} className="inline-block mt-3 text-[0.68rem] font-semibold text-[#B08A50] hover:underline">
                  Want to know more about our bottles? <strong className="font-bold underline">View bottles</strong>
                </a>
              </div>
            )}

            {/* Add to Cart Button */}
            <div className="mb-10">
              <button
                onClick={handleAddToCart}
                disabled={isAdding}
                className="
                  w-full py-4 rounded-none bg-[#1C1B18] text-white
                  hover:bg-[#B08A50] border border-[#1C1B18] hover:border-[#B08A50]
                  text-[0.68rem] font-bold tracking-widest uppercase shadow-sm
                  transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]
                "
              >
                {isAdding ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i>
                    <span>ADDING TO CART...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-shopping-bag"></i>
                    <span>ADD TO CART</span>
                  </>
                )}
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="bg-[#FEFCF9] border border-black/6 rounded-none p-3.5 flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <i className="fas fa-truck text-[#1C1B18] text-sm"></i>
                <div>
                  <h5 className="text-[0.65rem] font-bold text-[#1C1B18] uppercase tracking-wider">Fast Shipping</h5>
                  <p className="text-[0.55rem] text-black/40 mt-0.5">Dispatched within 24 hours.</p>
                </div>
              </div>
              <div className="bg-[#FEFCF9] border border-black/6 rounded-none p-3.5 flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <i className="fas fa-shield-halved text-[#1C1B18] text-sm"></i>
                <div>
                  <h5 className="text-[0.65rem] font-bold text-[#1C1B18] uppercase tracking-wider">Secure Payment</h5>
                  <p className="text-[0.55rem] text-black/40 mt-0.5">SSL certified checkout protection.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile only: Description and pricing below the grid */}
        <div className="block lg:hidden w-full">
          {renderDescriptionAndPricing()}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 md:p-8 select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Header / Controls */}
            <div className="flex items-center justify-between w-full text-white/70 z-10">
              <div className="text-xs font-bold tracking-widest uppercase">
                {activeImageIndex + 1} {"/"} {galleryImages.length}
              </div>
              <button
                onClick={() => {
                  setIsLightboxOpen(false);
                  setIsZoomed(false);
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close fullscreen gallery"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            {/* Main Interactive Screen */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden w-full h-full">
              {/* Back button */}
              {galleryImages.length > 1 && (
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors z-20"
                  aria-label="Previous image"
                >
                  <i className="fas fa-chevron-left text-sm"></i>
                </button>
              )}

              {/* Lightbox Image Container */}
              <div className="relative max-w-[90%] max-h-[75vh] flex items-center justify-center overflow-hidden">
                {imageErrors[activeImageIndex] ? (
                  <div className="flex flex-col items-center justify-center text-white/50 p-6 text-center select-none font-body">
                    <svg className="w-16 h-16 text-[#B08A50] mb-4 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6v2H9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 6h2v3h-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9h12v11a2 2 0 01-2 2H8a2 2 0 01-2-2V9z" />
                      <rect x="9" y="12" width="6" height="5" rx="0.5" stroke="currentColor" strokeWidth={1} strokeDasharray="2 2" />
                    </svg>
                    <span className="text-[0.62rem] font-bold tracking-[3px] text-[#B08A50] uppercase mb-1">{product.brand}</span>
                    <span className="text-[0.8rem] font-light font-heading text-white/70 max-w-[200px]">{product.name}</span>
                  </div>
                ) : (
                  <motion.img
                    key={activeImageIndex}
                    src={galleryImages[activeImageIndex]}
                    alt={product.name}
                    decoding="async"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setIsZoomed((prev) => !prev)}
                    className={`max-w-full max-h-[75vh] object-contain transition-transform duration-300 ease-out z-10 select-none ${
                      isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
                    }`}
                  />
                )}
              </div>

              {/* Next button */}
              {galleryImages.length > 1 && (
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors z-20"
                  aria-label="Next image"
                >
                  <i className="fas fa-chevron-right text-sm"></i>
                </button>
              )}
            </div>

            {/* Bottom Slider / Navigation Thumbnails inside Lightbox */}
            {galleryImages.length > 1 && (
              <div className="flex justify-center gap-3 overflow-x-auto py-4 z-10 max-w-full select-none scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setIsZoomed(false);
                    }}
                    className={`relative overflow-hidden rounded-md border w-12 h-15 md:w-14 md:h-18 flex-shrink-0 transition-all duration-300 bg-black flex items-center justify-center cursor-pointer ${
                      activeImageIndex === idx ? 'border-white ring-1 ring-white' : 'border-white/10 opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Lightbox thumbnail ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
