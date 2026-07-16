import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart } from '../utils/cartHelper';
import { CartStore } from '../utils/store.js';
import { sanitizeImageUrl } from '../utils/config.js';
import './MiniBag.css';

export default function MiniBag({ products = [], onCloseMiniBag }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [addedItem, setAddedItem] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  
  const drawerRef = useRef(null);
  const triggerElementRef = useRef(null);

  // Sync cart items helper
  const syncCart = () => {
    setCartItems(CartStore.getState());
  };

  useEffect(() => {
    const unsubscribe = CartStore.subscribe(setCartItems);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Listen to custom open event
    const handleOpenMiniBag = (e) => {
      // Store trigger element to restore focus on close
      triggerElementRef.current = document.activeElement;
      
      setAddedItem(e.detail);
      syncCart();
      setIsOpen(true);
      
      // Calculate Recommendations
      const addedProduct = products.find(p => p.id === e.detail.productId);
      if (addedProduct) {
        // Priority recommendation filter:
        // 1. Same Brand (excluding current)
        // 2. Same Fragrance Family (excluding current)
        // 3. Same Category (excluding current)
        // 4. Featured / All other products (fallback)
        let pool = products.filter(p => p.id !== addedProduct.id);
        
        let matches = pool.filter(p => p.brand === addedProduct.brand);
        
        if (matches.length < 3) {
          const familyMatches = pool.filter(p => p.family === addedProduct.family && !matches.includes(p));
          matches = [...matches, ...familyMatches];
        }
        
        if (matches.length < 3) {
          const categoryMatches = pool.filter(p => p.category === addedProduct.category && !matches.includes(p));
          matches = [...matches, ...categoryMatches];
        }
        
        if (matches.length < 3) {
          const featuredMatches = pool.filter(p => p.featured && !matches.includes(p));
          matches = [...matches, ...featuredMatches];
        }
        
        if (matches.length < 3) {
          const generalMatches = pool.filter(p => !matches.includes(p));
          matches = [...matches, ...generalMatches];
        }
        
        setRecommendations(matches.slice(0, 3));
      } else {
        // General fallback if added product details not fully found in catalog
        const fallbackList = products.slice(0, 3);
        setRecommendations(fallbackList);
      }
    };

    window.addEventListener('open-mini-bag', handleOpenMiniBag);

    return () => {
      window.removeEventListener('open-mini-bag', handleOpenMiniBag);
    };
  }, [products]);

  // Handle click outside & escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    };
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeDrawer = () => {
    setIsOpen(false);
    if (onCloseMiniBag) onCloseMiniBag();
    
    // Restore focus to triggering element
    if (triggerElementRef.current) {
      triggerElementRef.current.focus();
    }
  };

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen) return;

    const focusableElementsString = 'button, [href], input, select, textarea, [tabindex="0"]';
    const firstFocusableElement = drawerRef.current?.querySelector(focusableElementsString);
    const focusableContent = drawerRef.current?.querySelectorAll(focusableElementsString);
    const lastFocusableElement = focusableContent ? focusableContent[focusableContent.length - 1] : null;

    const handleFocusTrap = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusableElement) {
            lastFocusableElement?.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastFocusableElement) {
            firstFocusableElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleFocusTrap);
    firstFocusableElement?.focus();

    return () => {
      window.removeEventListener('keydown', handleFocusTrap);
    };
  }, [isOpen]);

  const handleCheckoutClick = () => {
    closeDrawer();
    navigate('/cart');
    
    // Dispatch analytics checkout started hook
    window.dispatchEvent(new CustomEvent('checkout_started', {
      detail: { cartCount: cartItems.length }
    }));
  };

  const handleRecClick = (product) => {
    closeDrawer();
    navigate(`/product/${product.slug || product.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="mini-bag-overlay" onClick={closeDrawer} role="presentation">
      <div 
        className="mini-bag-drawer" 
        onClick={(e) => e.stopPropagation()} 
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag Summary"
      >
        {/* Header */}
        <div className="mini-bag-header">
          <div className="mini-bag-title-area">
            <span className="success-checkmark">✓</span>
            <span className="mini-bag-header-title">Added to Bag</span>
          </div>
          <button className="mini-bag-close-btn" onClick={closeDrawer} aria-label="Close Shopping Bag Summary">
            ✕
          </button>
        </div>

        {/* Added Product Card */}
        {addedItem && (
          <div className="added-item-card">
            <div className="added-item-img-wrapper">
              <img src={sanitizeImageUrl(addedItem.image)} alt={addedItem.name} className="added-item-img" />
            </div>
            <div className="added-item-details">
              <span className="added-item-brand">{addedItem.brand}</span>
              <h4 className="added-item-name">{addedItem.name}</h4>
              {(() => {
                let size = addedItem.size || '';
                let bottleName = addedItem.bottleName || addedItem.bottleType || '';
                let bottleColor = addedItem.bottleColor || '';
                let bottlePriceAdj = Number(addedItem.bottlePrice || addedItem.bottlePriceAdjustment || 0);
                let bottleText = bottleName ? `${bottleName}${bottleColor ? ` (${bottleColor})` : ''}` : '';
                
                return (
                  <>
                    <span className="added-item-variant">Size: {size}</span>
                    {bottleText && (
                      <span className="added-item-variant mt-0.5 block font-semibold text-[#8B672F]">
                        Bottle: {bottleText}
                      </span>
                    )}
                    {bottlePriceAdj > 0 && (
                      <span className="added-item-variant text-[0.62rem] font-bold text-[#8B672F] uppercase block mt-0.5">
                        Bottle Upgrade: +₹{bottlePriceAdj.toLocaleString('en-IN')}
                      </span>
                    )}
                  </>
                );
              })()}
              <div className="added-item-pricing">
                <span className="added-item-qty">Qty: {addedItem.quantity}</span>
                <span className="added-item-price">₹{addedItem.price}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bag Totals & CTAs */}
        <div className="mini-bag-subtotal-section">
          <div className="subtotal-row">
            <span>Bag Subtotal</span>
            <span className="subtotal-amount">
              ₹{cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
            </span>
          </div>
          <div className="mini-bag-actions">
            <button className="btn-secondary-luxury" onClick={closeDrawer}>
              Continue Shopping
            </button>
            <button className="btn-primary-luxury" onClick={handleCheckoutClick}>
              Proceed to Checkout
            </button>
          </div>
        </div>

        {/* You May Also Like */}
        <div className="mini-bag-recommendations">
          <h3 className="rec-section-title">You May Also Like</h3>
          <div className="rec-items-grid">
            {recommendations.length > 0 ? (
              recommendations.map(product => (
                <div 
                  key={product.id} 
                  className="rec-item-card" 
                  onClick={() => handleRecClick(product)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleRecClick(product)}
                  aria-label={`View ${product.name}`}
                >
                  <div className="rec-img-wrapper">
                    <img src={sanitizeImageUrl(product.image || (product.images && product.images[0]?.imageUrl))} alt={product.name} />
                  </div>
                  <div className="rec-item-meta">
                    <span className="rec-item-brand">{product.brand}</span>
                    <span className="rec-item-name">{product.name}</span>
                    <span className="rec-item-price">From ₹{product.price}</span>
                  </div>
                </div>
              ))
            ) : (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rec-item-card" style={{ pointerEvents: 'none' }}>
                  <div className="rec-img-wrapper shimmer-bg" />
                  <div className="rec-item-meta flex-1 space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="skeleton-text short shimmer-bg" />
                    <div className="skeleton-text title shimmer-bg" />
                    <div className="skeleton-text shimmer-bg" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
