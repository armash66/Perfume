import { useState, useEffect, useMemo } from 'react';
import { addToCart } from '../utils/cartHelper';

export default function ProductPage({ product, onBackToShop }) {
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [selectedBottle, setSelectedBottle] = useState('classic');
  const [isAdding, setIsAdding] = useState(false);

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedSizeIndex(0);
  }, [product]);

  // Selected option details
  const selectedOption = useMemo(() => {
    if (!product || !product.sizes || product.sizes.length === 0) return null;
    return product.sizes[selectedSizeIndex] || product.sizes[0];
  }, [product, selectedSizeIndex]);

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

  // Competitor equivalents for different sizes
  const competitorPriceForSize = useMemo(() => {
    if (!selectedOption) return 0;
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

  const savingsAmount = competitorPriceForSize - selectedSizePrice;
  const savingsPercent = Math.round((savingsAmount / competitorPriceForSize) * 100);


  return (
    <div className="relative bg-[#F7F3ED] min-h-screen pb-20 font-body select-none">
      <div className="max-w-[1440px] mx-auto px-[clamp(1.5rem,4vw,3.5rem)] pt-8">
        
        {/* Breadcrumbs */}
        <div className="text-[0.6rem] font-bold tracking-[3px] text-[#B08A50] uppercase mb-8">
          <span className="cursor-pointer text-[#B08A50]/60 hover:text-[#1C1B18] transition-colors" onClick={onBackToShop}>HOME</span>
          <span className="mx-2 text-[#B08A50]/40">&gt;</span>
          <span className="cursor-pointer text-[#B08A50]/60 hover:text-[#1C1B18] transition-colors" onClick={onBackToShop}>SHOP</span>
          <span className="mx-2 text-[#B08A50]/40">&gt;</span>
          <span className="text-[#1C1B18]">{product.name.toUpperCase()}</span>
        </div>

        {/* Dynamic Sticky Column Split Container */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 items-start mb-16">
          
          {/* LEFT: Sticky Images (stacked vertically) */}
          <div className="lg:sticky lg:top-[100px] flex flex-col gap-6 self-start w-full">
            {product.images && product.images.length > 0 ? (
              product.images.slice(0, 1).map((imgUrl, idx) => (
                <div key={idx} className="rounded-none bg-white border border-black/5 shadow-sm p-6 flex items-center justify-center transition-all duration-500 hover:shadow-md">
                  <img
                    src={imgUrl}
                    alt={`${product.name} shot ${idx + 1}`}
                    className="w-full h-auto max-h-[480px] object-contain transition-transform duration-500 hover:scale-102"
                  />
                </div>
              ))
            ) : (
              <div className="rounded-none bg-white border border-black/5 shadow-sm p-6 flex items-center justify-center">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-auto max-h-[480px] object-contain"
                />
              </div>
            )}
          </div>

          {/* RIGHT: Product Buy Box */}
          <div className="flex flex-col gap-5 lg:pl-6">
            
            {/* Brand and Title */}
            <div>
              <span className="text-[0.65rem] font-bold tracking-[3px] text-black/40 uppercase block mb-1">
                {product.brand.toUpperCase()}
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl font-light text-[#1C1B18] tracking-wide leading-tight">
                {product.name}
              </h1>
              {selectedOption && (
                <span className="text-[0.65rem] font-bold tracking-[2px] text-black/40 block mt-2.5 uppercase">
                  {selectedOption.size}
                </span>
              )}
            </div>

            {/* Rating Stars and Authenticated Check */}
            <div className="flex items-center gap-4 py-2 border-y border-black/6">
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
            <div>
              <div className="text-2xl font-semibold text-[#1C1B18] tracking-wide">
                ₹{selectedSizePrice.toLocaleString('en-IN')}
              </div>
              <span className="text-[0.58rem] font-bold tracking-wider text-black/40 uppercase block mt-1">
                TAX INCLUDED. SHIPPING CALCULATED AT CHECKOUT.
              </span>
            </div>

            {/* Size Selector */}
            <div>
              <h4 className="text-[0.65rem] font-bold tracking-widest text-[#1C1B18] uppercase mb-3">
                Select Size (ML)
              </h4>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sz, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSizeIndex(idx)}
                    className={`
                      px-4 py-2.5 rounded-none text-[0.68rem] font-bold tracking-widest uppercase cursor-pointer border transition-all duration-300 min-h-[44px] flex items-center justify-center
                      ${selectedSizeIndex === idx
                        ? 'bg-[#1C1B18] border-[#1C1B18] text-[#FEFCF9] shadow-sm'
                        : 'bg-[#FEFCF9] border-black/8 text-[#1C1B18] hover:border-black/20'
                      }
                    `}
                  >
                    {sz.size.replace(' Decant', '').replace(' Sample', '').replace(' Luxury Atomizer', '').replace(' Discovery Set', '').replace(' Retail Bottle', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Choose Your Bottle */}
            {product.category === 'decants' && (
              <div>
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
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="
                w-full mt-3 py-4 rounded-none bg-[#1C1B18] text-white
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
                <h4 className="text-[0.75rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-4 pb-2 border-b border-black/5 font-heading">
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
                  <h4 className="text-[0.75rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-4 pb-2 border-b border-black/5 font-heading">
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

      </div>
    </div>
  );
}
