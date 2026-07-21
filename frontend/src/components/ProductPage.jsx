import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import { addToCart, getCart, updateQuantity } from '../utils/cartHelper';
import { showToast } from '../utils/toast';
import { collectionsData } from './SignatureCollection/CollectionData';
import { WishlistStore, CartStore } from '../utils/store.js';
import { API_BASE_URL, sanitizeImageUrl } from '../utils/config.js';
import { SALE_START_DATE, SALE_END_DATE, computeDisplayMrp, getCampaignPhase, CAMPAIGN_PHASE } from '../utils/launchPricing.js';
import { useLaunchCountdown } from '../hooks/useLaunchCountdown.js';
import { getBottleCatalog, preloadBottleQueue } from '../utils/bottleService.js';

// Dynamic bottle options managed via central bottle catalog service

// ── PriceBlock ───────────────────────────────────────────────────────────────
// Defined at module level (outside ProductPage) so it is a stable reference
// and never re-created on parent re-renders.
//
// Campaign window (both from env vars):
//   Before SALE_START_DATE  → normal price only
//   start ≤ now < SALE_END_DATE → Launch Collection Pricing + countdown
//   After SALE_END_DATE     → normal price only (automatic, no redeploy)
//
// The fade-in animation fires once on mount (CSS animation-fill-mode: both).
// Countdown digit updates do NOT replay the animation.
function PriceBlock({ selectedSizePrice }) {
  const { phase, remaining } = useLaunchCountdown(SALE_START_DATE, SALE_END_DATE);

  const displayMrp = phase === CAMPAIGN_PHASE.LIVE_LAUNCH ? computeDisplayMrp(selectedSizePrice) : null;

  // Format countdown: show days if > 0, otherwise show hh:mm:ss
  const countdownString = (() => {
    if (!remaining || remaining.expired) return '';
    const { days, hours, minutes, seconds } = remaining;
    const pad = (n) => String(n).padStart(2, '0');
    if (days > 0) {
      return `${days}d : ${pad(hours)}h : ${pad(minutes)}m`;
    }
    return `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
  })();

  if (phase === CAMPAIGN_PHASE.PRE_LAUNCH) {
    return (
      <div className="pdp-price-block">
        {/* Pre-launch label */}
        <span className="pdp-launch-label">Launch Collection</span>

        {/* Selling price only */}
        <div
          className="pdp-launch-price-prelaunch"
          aria-label={`Price: ${selectedSizePrice.toLocaleString('en-IN')} rupees`}
        >
          ₹{selectedSizePrice.toLocaleString('en-IN')}
        </div>

        {/* Short divider */}
        <div className="pdp-launch-divider" aria-hidden="true" />

        {/* Countdown to launch */}
        <div
          className="pdp-launch-countdown"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Launching in ${countdownString}`}
        >
          <span className="pdp-launch-countdown-label">Launching In</span>
          <span className="pdp-launch-countdown-time">{countdownString}</span>
        </div>

        {/* Editorial message */}
        <p className="pdp-launch-prelaunch-note">
          Our launch collection becomes available on Sunday at 2:00 PM IST.
        </p>

        <span className="pdp-price-note">Tax included · Shipping calculated at checkout</span>
      </div>
    );
  }

  if (phase === CAMPAIGN_PHASE.LIVE_LAUNCH) {
    return (
      <div className="pdp-price-block">
        {/* Campaign label */}
        <span className="pdp-launch-label">Launch Collection Pricing</span>

        {/* Struck-through MRP — tight to the label */}
        <span
          className="pdp-launch-mrp"
          aria-label={`Market retail price ${displayMrp.toLocaleString('en-IN')} rupees`}
        >
          ₹{displayMrp.toLocaleString('en-IN')}
        </span>

        {/* Selling price — visual anchor */}
        <div
          className="pdp-launch-price"
          aria-label={`Price: ${selectedSizePrice.toLocaleString('en-IN')} rupees`}
        >
          ₹{selectedSizePrice.toLocaleString('en-IN')}
        </div>

        {/* Short editorial divider */}
        <div className="pdp-launch-divider" aria-hidden="true" />

        {/* Countdown */}
        <div
          className="pdp-launch-countdown"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`Launch pricing ends in ${countdownString}`}
        >
          <span className="pdp-launch-countdown-label">Launch Pricing Ends In</span>
          <span className="pdp-launch-countdown-time">{countdownString}</span>
        </div>

        <span className="pdp-price-note">Tax included · Shipping calculated at checkout</span>
      </div>
    );
  }

  // POST_LAUNCH or fallback (no campaign)
  return (
    <div className="pdp-price-block">
      <div
        className="pdp-price-amount"
        aria-label={`Price: ${selectedSizePrice.toLocaleString('en-IN')} rupees`}
      >
        ₹{selectedSizePrice.toLocaleString('en-IN')}
      </div>
      <span className="pdp-price-note">Tax included · Shipping calculated at checkout</span>
    </div>
  );
}

export default function ProductPage({ product: initialProduct, products = [], onBackToShop }) {

  const { isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!!slug && !initialProduct);

  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const [availableBottles, setAvailableBottles] = useState([]);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [cartItems, setCartItems] = useState(() => getCart());
  const [mutatingItems, setMutatingItems] = useState(new Set());
  const [detectedAspect, setDetectedAspect] = useState('aspect-[1/1]');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState('story');
  const [imageErrors, setImageErrors] = useState({});

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const imageRef = useRef(null);

  // Reviews submission state variables
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Wishlist state initialized from WishlistStore subscription
  const [wishlist, setWishlist] = useState([]);

  const toggleWishlist = () => {
    if (!product || !product.id) return;
    const added = WishlistStore.toggle(product.id);
    if (added) {
      showToast('Added to your collection wishlist.', 'success');
    } else {
      showToast('Removed from your wishlist', 'success');
    }
  };

  const fetchProductDetails = async (productSlug) => {
    if (!productSlug) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productSlug}`);
      if (res.ok) {
        const dbProduct = await res.json();

        // Normalize images: the single-product API returns ProductImage objects
        // [{id, productId, imageUrl, altText, position}], but the list API returns
        // plain URL strings. We normalize here so galleryImages always gets strings.
        const normalizedImages = Array.isArray(dbProduct.images)
          ? dbProduct.images.map(img =>
            typeof img === 'string' ? img : (img.imageUrl || img.url || '')
          ).filter(Boolean)
          : [];
        const normalizedImage = normalizedImages[0] || dbProduct.image || null;

        const staticProd = collectionsData.find(sp => sp.id === dbProduct.slug || sp.id === dbProduct.id);

        let merged = {};
        if (staticProd) {
          merged = {
            ...staticProd,
            ...dbProduct,
            // Always use normalized images; fall back to static if DB has none
            image: normalizedImage || staticProd.image,
            images: normalizedImages.length > 0 ? normalizedImages : staticProd.images,
            sizes: dbProduct.variants && dbProduct.variants.length > 0
              ? dbProduct.variants.map(v => ({
                size: v.size,
                price: parseFloat(v.price),
                label: v.size.includes('5ml') ? 'Travel friendly' :
                  v.size.includes('10ml') ? 'Best value' :
                    v.size.includes('20ml') ? 'Premium decant' : 'Collector size',
                stock: v.stock,
                sku: v.sku,
                variantId: v.id
              }))
              : staticProd.sizes
          };
        } else {
          merged = {
            tagline: dbProduct.brand || 'Premium Fragrance',
            notes: [],
            tags: dbProduct.featured ? ['featured'] : [],
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
            retailPrice: parseFloat(dbProduct.price) * 1.5,
            competitorPrice: parseFloat(dbProduct.price) * 1.25,
            ...dbProduct,
            image: normalizedImage,
            images: normalizedImages,
            sizes: dbProduct.variants ? dbProduct.variants.map(v => ({
              size: v.size,
              price: parseFloat(v.price),
              label: v.size.includes('5ml') ? 'Travel friendly' :
                v.size.includes('10ml') ? 'Best value' :
                  v.size.includes('20ml') ? 'Premium decant' : 'Collector size',
              stock: v.stock,
              sku: v.sku,
              variantId: v.id
            })) : []
          };
        }
        setProduct(merged);
      } else {
        setProduct(null);
      }
    } catch (err) {
      console.error('Failed to fetch product details:', err);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  // Single robust effect to sync initialProduct or fetch by slug (supporting trailing slashes)
  useEffect(() => {
    let cleanSlug = slug;
    if (cleanSlug && cleanSlug.endsWith('/')) {
      cleanSlug = cleanSlug.slice(0, -1);
    }

    if (initialProduct && (initialProduct.slug === cleanSlug || initialProduct.id === cleanSlug)) {
      setProduct(initialProduct);
      setLoading(false);
    } else if (cleanSlug) {
      fetchProductDetails(cleanSlug);
    }
  }, [slug, initialProduct]);

  // Sync cart, mutating locks, and wishlist dynamically
  useEffect(() => {
    const unsubscribeCart = CartStore.subscribe((items) => {
      setCartItems(items);
    });
    const unsubscribeMutating = CartStore.subscribeMutating((set) => {
      setMutatingItems(set);
    });
    const unsubscribeWishlist = WishlistStore.subscribe((list) => {
      setWishlist(list);
    });
    return () => {
      unsubscribeCart();
      unsubscribeMutating();
      unsubscribeWishlist();
    };
  }, []);

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedSizeIndex(0);
    setActiveImageIndex(0);
    setDetectedAspect('1 / 1');
    setImageErrors({});
    setIsLightboxOpen(false);
    setIsZoomed(false);
    setIsImageLoading(true);
    setSelectedBottle(null);
  }, [product]);

  // Set image loading state to true on active image change, but check if already complete/cached
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      setIsImageLoading(false);
    } else {
      setIsImageLoading(true);
    }
  }, [activeImageIndex, product]);

  // Selected option details
  const selectedOption = useMemo(() => {
    if (!product || !product.sizes || product.sizes.length === 0) return null;
    return product.sizes[selectedSizeIndex] || product.sizes[0];
  }, [product, selectedSizeIndex]);

  // Fetch dynamic bottle catalog options whenever selected size or product changes (only for 5ml and 10ml)
  useEffect(() => {
    let isMounted = true;
    async function loadBottles() {
      if (!selectedOption) {
        if (isMounted) { setAvailableBottles([]); setSelectedBottle(null); }
        return;
      }
      const sz = (selectedOption.size || '').toLowerCase();
      const isCustomPackagingSize = sz.includes('5ml') || sz.includes('10ml');
      if (!isCustomPackagingSize) {
        if (isMounted) { setAvailableBottles([]); setSelectedBottle(null); }
        return;
      }

      const bottles = await getBottleCatalog(product?.id, selectedOption.size);
      if (isMounted) {
        setAvailableBottles(bottles);
        if (bottles.length > 0) {
          const defaultBtl = bottles.find(b => b.isDefault) || bottles[0];
          setSelectedBottle(defaultBtl.id);
          preloadBottleQueue(bottles, defaultBtl.id);
        } else {
          setSelectedBottle(null);
        }
      }
    }
    loadBottles();
    return () => { isMounted = false; };
  }, [selectedOption, product?.id]);

  // Preload selected + next 2 visible bottle images on selection change
  useEffect(() => {
    if (availableBottles.length > 0 && selectedBottle) {
      preloadBottleQueue(availableBottles, selectedBottle);
    }
  }, [selectedBottle, availableBottles]);

  // Currently selected bottle object
  const selectedBottleObj = useMemo(() => {
    if (!selectedBottle || availableBottles.length === 0) return null;
    return availableBottles.find(b => b.id === selectedBottle) || null;
  }, [availableBottles, selectedBottle]);

  // Additional price from chosen bottle
  const bottleAdditionalPrice = useMemo(() => {
    return selectedBottleObj ? selectedBottleObj.priceAdjustment : 0;
  }, [selectedBottleObj]);

  const existingCartItem = useMemo(() => {
    if (!product || !selectedOption) return null;
    const sizeLabel = selectedOption.size || 'Default Size';
    const currentBottleName = selectedBottleObj ? selectedBottleObj.name : null;
    const currentBottleId = selectedBottleObj ? selectedBottleObj.id : null;
    return cartItems.find(item => {
      const matchVariant = (item.variantId && selectedOption.variantId && item.variantId === selectedOption.variantId) ||
        ((item.productId || item.id) === (product.id || product.productId) && item.size === sizeLabel);
      if (!matchVariant) return false;
      const itemBottleId = item.bottleId || (item.bottle && item.bottle.id) || null;
      if (currentBottleId || itemBottleId) return itemBottleId === currentBottleId;
      const itemBottleName = item.bottleName || (item.bottle && item.bottle.name) || null;
      return itemBottleName === currentBottleName;
    });
  }, [cartItems, product, selectedOption, selectedBottleObj]);

  const cartQuantity = useMemo(() => {
    return existingCartItem ? existingCartItem.quantity : 0;
  }, [existingCartItem]);

  const isItemMutating = useMemo(() => {
    if (!product || !selectedOption) return false;
    const itemKey = selectedOption.variantId || (product.id + (selectedOption.size ? '_' + selectedOption.size : ''));
    return mutatingItems.has(itemKey);
  }, [product, selectedOption, mutatingItems]);

  const [selectedQty, setSelectedQty] = useState(1);

  useEffect(() => {
    if (cartQuantity > 0) {
      setSelectedQty(cartQuantity);
    } else {
      setSelectedQty(1);
    }
  }, [cartQuantity, product, selectedSizeIndex]);

  const handleDecrease = () => {
    setSelectedQty(prev => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    if (selectedOption && selectedQty >= selectedOption.stock) {
      showToast("Cannot exceed available stock.", "warning");
      return;
    }
    setSelectedQty(prev => prev + 1);
  };

  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) {
      return product.images;
    }
    return [product.image];
  }, [product]);

  // Compute product reviews and average rating
  const reviews = useMemo(() => {
    return product?.reviews || [];
  }, [product]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return parseFloat((total / reviews.length).toFixed(1));
  }, [reviews]);

  const getLongevityRating = (val = '') => {
    const text = String(val).toLowerCase();
    if (text.includes('12+') || text.includes('eternal')) return 5;
    if (text.includes('10+')) return 5;
    if (text.includes('9+') || text.includes('8+')) return 4;
    if (text.includes('6+')) return 3;
    if (text.includes('4+')) return 2;
    return 3;
  };

  const getSillageRating = (val = '') => {
    const text = String(val).toLowerCase();
    if (text.includes('heavy') || text.includes('strong')) return 5;
    if (text.includes('moderate')) return 3;
    if (text.includes('soft') || text.includes('intimate')) return 2;
    return 3;
  };

  const bundleProduct = useMemo(() => {
    if (!product || products.length === 0) return null;
    const sameGender = products.filter(p => p.id !== product.id && p.category === 'decants');
    return sameGender[0] || products.find(p => p.id !== product.id);
  }, [product, products]);

  const similarProducts = useMemo(() => {
    if (!product || products.length === 0) return [];
    return products
      .filter(p => p.id !== product.id && (p.category === product.category || p.brand === product.brand || (p.tags && p.tags.includes(product.tags[0]))))
      .slice(0, 5);
  }, [product, products]);

  // Review submission handler
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess(false);
    setIsSubmittingReview(true);

    try {
      const token = await getToken();
      if (!token) {
        setReviewError('You must be signed in to submit a review.');
        setIsSubmittingReview(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment
        })
      });

      if (res.ok) {
        setReviewSuccess(true);
        setReviewTitle('');
        setReviewComment('');
        setReviewRating(5);
        fetchProductDetails();
      } else {
        const data = await res.json();
        setReviewError(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      setReviewError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
    const sizeMl = parseInt(selectedOption.size) || 5;
    const baseCompetitor = product.competitorPrice || Math.round(product.price * 1.18);
    // Scale competitor price based on ml (traditional decants charge more per ml for smaller sizes)
    const ratio = sizeMl / 5;
    // Apply a sliding scale for larger sizes
    const scaleFactor = ratio > 1 ? Math.pow(ratio, 0.9) : ratio;
    return Math.round((baseCompetitor * scaleFactor) / 10) * 10;
  }, [product, selectedOption]);

  if (loading) {
    return (
      <div className="pdp-shell">
        <div className="pdp-loading" role="status" aria-label="Loading fragrance">
          <div className="pdp-spinner" />
          <span className="pdp-loading-label">Loading fragrance...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pdp-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', padding: '5rem 1rem', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.75rem', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1C1B18' }}>Scents Not Loaded</h3>
        <button onClick={onBackToShop} className="pdp-add-to-bag" style={{ width: 'auto', padding: '0.875rem 2rem', minHeight: '48px' }}>
          Return to Shop
        </button>
      </div>
    );
  }

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (isAdding) return;

    if (selectedQty <= 0) {
      showToast('Please select at least one item.', 'error');
      return;
    }

    if (selectedOption && selectedQty > selectedOption.stock) {
      showToast(`Cannot exceed available stock. Only ${selectedOption.stock} available.`, "warning");
      return;
    }

    // If a size with bottles is selected, require a bottle choice
    if (bottleKey && !selectedBottle) {
      showToast('Please choose your bottle type.', 'warning');
      return;
    }

    setIsAdding(true);
    try {
      const token = isSignedIn ? await getToken() : null;
      let result;

      const variantPrice = selectedOption ? selectedOption.price : product.price;
      const unitPrice = variantPrice + bottleAdditionalPrice;

      // Build the sizeOption with bottle metadata baked in
      const sizeOptionWithBottle = selectedOption
        ? {
          ...selectedOption,
          variantPrice: variantPrice,
          unitPrice: unitPrice,
          price: unitPrice,
          bottleId: selectedBottleObj ? selectedBottleObj.id : null,
          bottleName: selectedBottleObj ? selectedBottleObj.name : null,
          bottleColor: selectedBottleObj ? selectedBottleObj.finish : null,
          bottleImage: selectedBottleObj ? selectedBottleObj.imageUrl : null,
          bottlePrice: bottleAdditionalPrice,
          bottlePriceAdjustment: bottleAdditionalPrice,
          bottleSku: selectedBottleObj ? selectedBottleObj.sku : null,
          bottleCategory: selectedBottleObj ? selectedBottleObj.category : null,
          bottle: selectedBottleObj ? {
            id: selectedBottleObj.id,
            name: selectedBottleObj.name,
            finish: selectedBottleObj.finish,
            category: selectedBottleObj.category,
            image: selectedBottleObj.imageUrl,
            priceAdjustment: bottleAdditionalPrice,
            sku: selectedBottleObj.sku
          } : null
        }
        : selectedOption;

      // If quantity matches existing, no need to update
      if (existingCartItem && existingCartItem.quantity === selectedQty) {
        result = { success: true, reason: 'NO_OP' };
      } else if (existingCartItem) {
        result = await updateQuantity(existingCartItem.variantId || existingCartItem.id, existingCartItem.size, selectedQty, token);
      } else {
        result = await addToCart(product, sizeOptionWithBottle, selectedQty, token);
      }

      if (result && (result.success || result.reason === 'NO_OP')) {
        // Deterministic flow: Add/Update -> Success -> Navigate to cart exactly once
        navigate('/cart');
      }
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Pricing calculations
  const bottleRetailPrice = product.retailPrice || (product.price * 20);
  // Total price = size base price + any bottle surcharge
  const selectedSizePrice = selectedOption ? selectedOption.price + bottleAdditionalPrice : product.price;

  const savingsAmount = competitorPriceForSize - selectedSizePrice;
  const savingsPercent = Math.round((savingsAmount / competitorPriceForSize) * 100);

  const renderTrustSection = () => {
    const trustItems = [
      { icon: 'fa-flask', title: 'Sterile Filling', desc: 'Medical-grade siphoning process.' },
      { icon: 'fa-microscope', title: 'Batch Verified', desc: 'Tracked to original retail source.' },
      { icon: 'fa-magnifying-glass', title: 'Hand Inspected', desc: 'Every bottle checked before dispatch.' },
      { icon: 'fa-shield-halved', title: 'Leak Tested', desc: 'Pressure-tested before shipment.' },
      { icon: 'fa-sun', title: 'UV Protected', desc: 'Amber glass preserves fragrance quality.' },
    ];
    return (
      <div style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid rgba(28,27,24,0.10)' }}>
        <div className="pdp-trust-grid">
          {trustItems.map((item) => (
            <div key={item.title} className="pdp-trust-card">
              <i className={`fa-solid ${item.icon} pdp-trust-icon`} aria-hidden="true" />
              <div>
                <p className="pdp-trust-title">{item.title}</p>
                <p className="pdp-trust-desc" style={{ marginTop: '0.25rem' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderReviewsSection = () => {
    // Rating distribution
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (counts[r.rating] !== undefined) counts[r.rating]++;
    });

    const distribution = Object.keys(counts).reverse().map(star => {
      const count = counts[star];
      const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
      return { star: parseInt(star), count, percentage };
    });

    return (
      <div className="mt-20 pt-16 border-t border-[#1C1B18]/12 text-[#1C1B18] font-body">
        <div className="text-center mb-12">
          <span className="text-[0.62rem] font-bold tracking-[3px] text-[#8B672F] uppercase block mb-2">
            COLLECTOR FEEDBACK
          </span>
          <h3 className="font-heading text-3xl font-light tracking-wide uppercase leading-tight mb-1">
            Product Reviews
          </h3>
          <p className="text-[0.76rem] text-[#1C1B18]/85 max-w-md mx-auto font-medium">
            Authentic ratings from verified fragrance collectors.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">
          {/* Left Column: Rating overview & stats */}
          <div className="lg:col-span-4 bg-[#FEFCF9] border border-[#1C1B18]/12 p-6 md:p-8">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-6 pb-2 border-b border-[#1C1B18]/12 font-heading font-normal">
              Satisfaction Overview
            </h4>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-5xl font-light font-heading tracking-tight text-[#1C1B18]">
                {avgRating > 0 ? avgRating : '0.0'}
              </span>
              <span className="text-[0.62rem] text-[#1C1B18]/85 uppercase tracking-widest font-bold">
                out of 5.0
              </span>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-2 text-[#8B672F] text-[13px] mb-6">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <i key={i} className={`fa-star ${i < Math.round(avgRating) ? 'fas' : 'far'}`} />
                ))}
              </div>
              <span className="text-[0.62rem] text-[#1C1B18]/85 ml-2 font-bold tracking-wider uppercase">
                ({reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'})
              </span>
            </div>

            {/* Distribution bars */}
            <div className="space-y-3.5 mb-8">
              {distribution.map(dist => (
                <div key={dist.star} className="flex items-center gap-3 text-[10px]">
                  <span className="w-10 font-bold uppercase text-[#1C1B18]/85 tracking-wider">
                    {dist.star} Star
                  </span>
                  <div className="flex-1 h-1 bg-[#1C1B18]/10 rounded-none overflow-hidden">
                    <div className="h-full bg-[#8B672F] transition-all duration-500" style={{ width: `${dist.percentage}%` }} />
                  </div>
                  <span className="w-6 text-right font-semibold text-[#1C1B18]/85">
                    {dist.count}
                  </span>
                </div>
              ))}
            </div>

            {/* Write a Review block */}
            <div className="border-t border-[#1C1B18]/12 pt-6">
              <h5 className="text-[0.68rem] font-bold uppercase tracking-wider text-[#8B672F] mb-3">
                Share Feedback
              </h5>

              {!isSignedIn ? (
                <div className="text-left">
                  <p className="text-[0.68rem] text-[#1C1B18]/75 mb-4 leading-relaxed">
                    Only verified purchasers of Decant Atelier items can submit reviews. Sign in to write a review.
                  </p>
                  <SignInButton mode="modal">
                    <button
                      className="w-full py-2.5 bg-[#1C1B18] text-white text-[0.62rem] font-bold tracking-widest uppercase hover:bg-[#8B672F] transition-colors cursor-pointer"
                      style={{ color: '#FEFCF9' }}
                    >
                      Authenticate Account
                    </button>
                  </SignInButton>
                </div>
              ) : reviewSuccess ? (
                <div className="bg-[#FEFCF9] border border-[#8B672F]/30 p-4 text-left">
                  <h6 className="text-[0.65rem] font-bold uppercase tracking-wider text-[#8B672F] mb-1">Feedback Submitted</h6>
                  <p className="text-[0.62rem] text-[#1C1B18]/75 leading-relaxed">
                    Thank you. Your review is queued in our moderation pipeline to trace verified purchase history and will display shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4 text-left">
                  {reviewError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-[10px] font-semibold leading-relaxed">
                      {reviewError}
                    </div>
                  )}

                  {/* Rating Selector */}
                  <div>
                    <label className="block text-[0.58rem] font-bold uppercase tracking-widest mb-1.5 text-[#1C1B18]/70">
                      Rating
                    </label>
                    <div className="flex items-center gap-1.5 text-xs text-[#8B672F]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setReviewRating(i + 1)}
                          className="cursor-pointer transition-transform hover:scale-110"
                          aria-label={`Rate ${i + 1} stars`}
                        >
                          <i className={`${i < reviewRating ? 'fas' : 'far'} fa-star`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Review Title */}
                  <div>
                    <label className="block text-[0.58rem] font-bold uppercase tracking-widest mb-1.5 text-[#1C1B18]/70">
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Masterful scent composition"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full bg-[#F7F3ED]/40 border border-[#1C1B18]/20 px-3 py-2 text-[11px] text-[#1C1B18] placeholder-black/45 focus:outline-none focus:border-[#8B672F]"
                    />
                  </div>

                  {/* Review Comments */}
                  <div>
                    <label className="block text-[0.58rem] font-bold uppercase tracking-widest mb-1.5 text-[#1C1B18]/70">
                      Your Comments
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Describe your olfactory experience..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full bg-[#F7F3ED]/40 border border-[#1C1B18]/20 px-3 py-2 text-[11px] text-[#1C1B18] placeholder-black/45 focus:outline-none focus:border-[#8B672F] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full py-2.5 bg-[#1C1B18] text-white text-[0.62rem] font-bold tracking-widest uppercase hover:bg-[#8B672F] transition-colors disabled:opacity-50"
                    style={{ color: '#FEFCF9' }}
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Approved Reviews List */}
          <div className="lg:col-span-8 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider pb-2 border-b border-[#1C1B18]/12 font-heading font-normal">
              Collector Feedback
            </h4>

            {reviews.length === 0 ? (
              <div className="text-center py-10 bg-white/20 border border-[#1C1B18]/12">
                <p className="text-xs text-[#1C1B18]/65 italic font-light">
                  No reviews yet.<br />Be the first to share your experience.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="review-card text-left">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[0.62rem] text-[#1C1B18]/70 font-bold uppercase tracking-wider block">
                          {rev.user?.name || 'Collector'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[0.55rem] text-[#8B672F] font-bold tracking-widest uppercase mt-0.5">
                          <i className="fas fa-circle-check text-[8px]"></i> Verified Purchase
                        </span>
                      </div>
                      <span className="text-[0.58rem] text-[#1C1B18]/60 font-semibold uppercase tracking-wider">
                        {new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 text-[#8B672F] text-[10px] my-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <i key={i} className={`fa-star ${i < rev.rating ? 'fas' : 'far'}`} />
                      ))}
                    </div>

                    <h5 className="text-[0.72rem] font-bold text-[#1C1B18] mt-1">{rev.title}</h5>
                    <p className="text-xs text-[#1C1B18]/80 leading-relaxed font-light mt-1">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pdp-shell select-none">
      <div className="pdp-inner">

        {/* Navigation Row */}
        <div className="pdp-nav-row">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={onBackToShop}
              aria-label="Back to collection"
              className="pdp-back-btn"
            >
              <i className="fas fa-arrow-left" style={{ fontSize: '0.65rem' }} aria-hidden="true" />
              <span>Back</span>
            </button>
            <button
              onClick={() => showToast('Provenance trace standard: authenticated retail stock only.', 'info')}
              aria-label="View verified provenance standard info"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.575rem',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#8B672F',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid rgba(139,103,47,0.35)',
                paddingBottom: '1px',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#1C1B18'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8B672F'; }}
            >
              Verified Provenance
            </button>
          </div>
        </div>

        {/* 2-Column Grid — gallery 56% / info 44%, single-col on mobile/tablet */}
        <div className="pdp-grid">

          {/* ── LEFT COLUMN: Gallery ── */}
          <div className="pdp-gallery-col">

            {/* Gallery Card */}
            <div
              className="pdp-gallery-card"
              style={{ aspectRatio: detectedAspect }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              role="img"
              aria-label={`${product.brand} ${product.name} product gallery`}
            >
              {/* Zoom Hint */}
              <div className="pdp-zoom-hint" aria-hidden="true">
                <i className="fa-solid fa-magnifying-glass-plus" />
              </div>

              {/* Image Error Fallback */}
              {imageErrors[activeImageIndex] ? (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', background: '#F7F3ED',
                  padding: '1.5rem', textAlign: 'center', zIndex: 10,
                }}>
                  <i className="fa-solid fa-flask" style={{ fontSize: '2rem', color: '#8B672F', opacity: 0.65, marginBottom: '0.75rem' }} />
                  <span style={{ fontSize: '0.575rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B672F', display: 'block', marginBottom: '0.25rem' }}>
                    {product.brand}
                  </span>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '0.95rem', fontWeight: 300, color: '#1C1B18' }}>
                    {product.name}
                  </span>
                </div>
              ) : (
                <>
                  {/* Skeleton shimmer while loading */}
                  {isImageLoading && (
                    <div className="pdp-img-skeleton" style={{ position: 'absolute', inset: 0, zIndex: 5 }} aria-hidden="true" />
                  )}

                  {/* Main Product Image */}
                  <AnimatePresence mode="wait">
                    <motion.img
                      ref={imageRef}
                      key={activeImageIndex}
                      src={galleryImages[activeImageIndex]}
                      alt={product.name}
                      loading={activeImageIndex === 0 ? "eager" : "lazy"}
                      decoding="async"
                      fetchpriority={activeImageIndex === 0 ? 'high' : 'auto'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.30, ease: [0.25, 0.1, 0.25, 1] }}
                      className="pdp-main-image"
                      style={{ zIndex: 10 }}
                      onClick={() => setIsLightboxOpen(true)}
                      onError={() => setImageErrors(prev => ({ ...prev, [activeImageIndex]: true }))}
                      onLoad={(e) => {
                        setIsImageLoading(false);
                        const { naturalWidth, naturalHeight } = e.target;
                        if (naturalWidth && naturalHeight) {
                          setDetectedAspect(`${naturalWidth} / ${naturalHeight}`);
                        }
                      }}
                    />
                  </AnimatePresence>
                </>
              )}

              {/* Gallery Navigation Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); handlePrevImage(); }}
                    className="pdp-gallery-arrow pdp-gallery-arrow--prev"
                    aria-label="Previous image"
                  >
                    <i className="fas fa-chevron-left" aria-hidden="true" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleNextImage(); }}
                    className="pdp-gallery-arrow pdp-gallery-arrow--next"
                    aria-label="Next image"
                  >
                    <i className="fas fa-chevron-right" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6 select-none overflow-x-auto py-2 scrollbar-none">
                {galleryImages.map((imgUrl, idx) => {
                  const isActive = activeImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setIsZoomed(false);
                      }}
                      className={`relative overflow-hidden rounded-[12px] border min-w-[56px] min-h-[56px] w-16 h-16 bg-white flex items-center justify-center cursor-pointer transition-all duration-300 ${isActive
                        ? 'border-[#B08A50] ring-1 ring-[#B08A50] scale-[1.02]'
                        : 'border-black/5 hover:border-black/20 hover:scale-102'
                        }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail preview ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover object-center"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Buy Box, Scent Pyramid, Specs Grid */}
          <div className="space-y-6 lg:space-y-8 text-left">

            {/* Header Product Details */}
            <div className="space-y-2">
              <span className="text-[0.62rem] font-bold tracking-[3px] text-black/45 uppercase block">
                {product.brand.toUpperCase()}
              </span>
              <div className="flex justify-between items-start gap-4">
                <h1
                  className="font-heading font-light text-[#1C1B18] tracking-wide uppercase leading-tight"
                  style={{
                    fontSize: 'clamp(1.75rem, 6vw, 3rem)',
                    wordBreak: 'normal',
                    overflowWrap: 'break-word',
                    maxWidth: '100%'
                  }}
                >
                  {product.name}
                </h1>

                <button
                  onClick={toggleWishlist}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 border rounded-full text-[0.62rem] font-bold tracking-wider uppercase hover:border-black/30 hover:bg-black/[0.02] transition-all select-none cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap"
                  style={{
                    color: wishlist.includes(product.id) ? '#FF003C' : '#2C2926',
                    borderColor: wishlist.includes(product.id) ? 'rgba(255, 0, 60, 0.3)' : 'rgba(0,0,0,0.08)',
                    backgroundColor: wishlist.includes(product.id) ? 'rgba(255, 0, 60, 0.04)' : 'transparent'
                  }}
                  aria-label="Toggle wishlist"
                >
                  <i className={wishlist.includes(product.id) ? 'fas fa-heart text-[#FF003C]' : 'far fa-heart'}></i> Wishlist
                </button>
              </div>

              {/* Verified Badge */}
              <div style={{ paddingTop: '0.25rem' }}>
                <span className="pdp-auth-badge">
                  <i className="fa-solid fa-circle-check" aria-hidden="true" style={{ fontSize: '0.6rem' }} />
                  Verified Authentic Fragrance
                </span>
              </div>

              {/* Star Rating */}
              <div className="pdp-rating-row" aria-label={`Rating: ${avgRating} out of 5`}>
                <div className="pdp-stars" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i key={i} className={`fa-star ${i < Math.round(avgRating) ? 'fas' : 'far'}`} />
                  ))}
                </div>
                <span className="pdp-rating-label">
                  {avgRating > 0 ? `${avgRating} · ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
                </span>
              </div>
            </div>

            {/* ── Price Block ── */}
            <PriceBlock selectedSizePrice={selectedSizePrice} />

            {/* ── Configuration Card ── */}
            <div className="pdp-config-card">

              {/* 1. Size Selector */}
              <div>
                <span className="pdp-field-label">1. Select Size</span>
                <div className="pdp-sizes-wrap" role="group" aria-label="Select fragrance size">
                  {product.sizes.map((sz, idx) => {
                    const isSelected = selectedSizeIndex === idx;
                    const isOutOfStock = sz.stock <= 0;
                    const sizeLabel = sz.size.replace(' Decant', '').replace(' Retail Bottle', '').toUpperCase();
                    return (
                      <button
                        key={idx}
                        onClick={() => !isOutOfStock && setSelectedSizeIndex(idx)}
                        disabled={isOutOfStock || isAdding || isItemMutating}
                        aria-label={`Size ${sizeLabel}${isOutOfStock ? ' — sold out' : ''}`}
                        aria-pressed={isSelected}
                        className={`pdp-size-btn${isSelected ? ' pdp-size-btn--active' : ''}`}
                      >
                        <span className="pdp-size-btn__label">{sizeLabel}</span>
                        <span className="pdp-size-btn__sub">₹{sz.price.toLocaleString('en-IN')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 2. Bottle Selector (5ml and 10ml) ── */}
              {availableBottles.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span className="pdp-field-label" style={{ margin: 0 }}>
                      2. Choose Your Bottle Packaging
                    </span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B672F', background: 'rgba(139,103,47,0.08)', padding: '2px 8px', borderRadius: '12px' }}>
                      Available Bottle Styles
                    </span>
                  </div>

                  <div
                    className="pdp-bottle-grid"
                    role="group"
                    aria-label={`Choose your ${selectedOption?.size} bottle`}
                    data-cols={Math.min(availableBottles.length, 4)}
                  >
                    {availableBottles.map((bottle) => {
                      const isActive = selectedBottle === bottle.id;
                      const isLimited = bottle.badge === 'Limited Edition';
                      return (
                        <button
                          key={bottle.id}
                          id={`bottle-option-${bottle.id}`}
                          onClick={() => setSelectedBottle(bottle.id)}
                          disabled={isAdding || isItemMutating}
                          aria-label={`${bottle.name} - ${bottle.finish}${bottle.priceAdjustment > 0 ? `, +₹${bottle.priceAdjustment}` : ', included'}`}
                          aria-pressed={isActive}
                          className={`pdp-bottle-card${isActive ? ' pdp-bottle-card--active' : ''}`}
                        >
                          {isActive && (
                            <span className="pdp-bottle-card__check">
                              <i className="fa-solid fa-check" />
                            </span>
                          )}
                          {isLimited && (
                            <span className="pdp-bottle-card__corner-badge">LIMITED</span>
                          )}
                          <div className="pdp-bottle-img-wrap" aria-hidden="true">
                            {bottle.imageUrl ? (
                              <img
                                src={bottle.imageUrl}
                                alt={`${bottle.name} ${bottle.finish}`}
                                loading="lazy"
                                className="pdp-bottle-img"
                                draggable={false}
                              />
                            ) : (
                              <div className="pdp-bottle-img-placeholder">
                                <i className="fa-solid fa-spray-can-sparkles" />
                              </div>
                            )}
                          </div>
                          <span className="pdp-bottle-card__name">{(bottle.name || '').replace(/Atomizer|Spray|\([^)]*\)/gi, '').trim() || bottle.name}</span>
                          <span className="pdp-bottle-card__finish">{bottle.finish}</span>
                          <span className="pdp-bottle-pill-badge">
                            {bottle.priceAdjustment > 0 ? `+ ₹${bottle.priceAdjustment}` : 'Included'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ background: '#F9F7F2', border: '1px solid rgba(28,27,24,0.08)', padding: '0.875rem 1rem', borderRadius: '8px' }}>
                  <span className="pdp-field-label" style={{ marginBottom: '0.25rem' }}>2. Packaging Info</span>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <i className="fa-solid fa-gem" style={{ color: '#8B672F', fontSize: '0.75rem' }} />
                    Premium glass atomizer packaging included with 20ml and 30ml decants.
                  </p>
                </div>
              )}

              {/* ── Compact Trust Chips Bar ── */}
              <div className="pdp-info-chips-bar">
                <div className="pdp-info-chip">
                  <i className="fa-solid fa-shield-halved" />
                  <span>Leak Proof</span>
                </div>
                <div className="pdp-info-chip">
                  <i className="fa-solid fa-plane-up" />
                  <span>Travel Friendly</span>
                </div>
                <div className="pdp-info-chip">
                  <i className="fa-solid fa-gem" />
                  <span>Premium Quality Glass</span>
                </div>
                <div className="pdp-info-chip">
                  <i className="fa-solid fa-heart" />
                  <span>Hand-Filled with Care</span>
                </div>
              </div>

              {/* ── 3. Quantity & Checkout Premium Purchase Card ── */}
              {(() => {
                const currentStock = selectedOption ? (selectedOption.stock || 0) : 0;
                const isOutOfStock = currentStock <= 0;
                const sizeLabel = selectedOption?.size?.replace(' Decant', '').replace(' Retail Bottle', '').toUpperCase() || '';
                const bottleFinish = selectedBottleObj ? selectedBottleObj.finish : '';
                const basePrice = selectedOption ? selectedOption.price : 0;
                const adjustment = bottleAdditionalPrice;
                const unitPrice = basePrice + adjustment;
                const totalPrice = unitPrice * selectedQty;

                return (
                  <div className="pdp-purchase-card">
                    <span className="pdp-field-label" style={{ margin: 0 }}>3. Quantity & Checkout</span>
                    
                    <div className="pdp-purchase-card-grid">
                      {/* Selection Summary */}
                      <div className="pdp-purchase-selection">
                        {selectedBottleObj?.imageUrl ? (
                          <img src={selectedBottleObj.imageUrl} alt={bottleFinish} className="pdp-purchase-thumb" />
                        ) : (
                          <div className="pdp-purchase-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-flask" style={{ color: '#8B672F', fontSize: '0.9rem' }} />
                          </div>
                        )}
                        <div className="pdp-purchase-meta">
                          <span className="pdp-purchase-meta__label">Selected</span>
                          <span className="pdp-purchase-meta__value">{sizeLabel}{bottleFinish ? ` • ${bottleFinish}` : ''}</span>
                        </div>
                      </div>

                      {/* Total Price & Upgrade Difference */}
                      <div className="pdp-purchase-price-block">
                        <span className="pdp-purchase-meta__label">Total Price</span>
                        <div className="pdp-purchase-price-main">
                          <span className="pdp-purchase-price-amount">₹{totalPrice.toLocaleString('en-IN')}</span>
                          {adjustment > 0 && (
                            <span className="pdp-purchase-price-upgrade">
                              (+₹{(adjustment * selectedQty).toLocaleString('en-IN')})
                            </span>
                          )}
                        </div>
                        <span className="pdp-purchase-price-caption">(Tax included)</span>
                      </div>

                      {/* Quantity Stepper */}
                      {!isOutOfStock && (
                        <div className="pdp-qty-group" style={{ margin: 0 }}>
                          <span className="pdp-purchase-meta__label">Quantity</span>
                          <div className="pdp-qty-stepper" style={{ height: '42px', width: '110px' }} role="group" aria-label="Quantity selector">
                            <button
                              onClick={handleDecrease}
                              disabled={selectedQty <= 1 || isAdding}
                              className="pdp-qty-btn"
                              aria-label="Decrease quantity"
                            >
                              <i className="fas fa-minus" style={{ fontSize: '0.65rem' }} />
                            </button>
                            <span className="pdp-qty-value" style={{ fontSize: '0.8rem' }}>
                              {selectedQty}
                            </span>
                            <button
                              onClick={handleIncrease}
                              disabled={isAdding || selectedQty >= currentStock}
                              className="pdp-qty-btn"
                              aria-label="Increase quantity"
                            >
                              <i className="fas fa-plus" style={{ fontSize: '0.65rem' }} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Add to Cart CTA */}
                      <button
                        onClick={handleAddToCart}
                        disabled={isAdding || !selectedOption || isOutOfStock}
                        className="pdp-add-to-bag"
                        style={{ minHeight: '46px', padding: '0.75rem 1.25rem' }}
                      >
                        {isAdding || isItemMutating ? (
                          <>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '0.8rem' }} />
                            <span>Adding…</span>
                          </>
                        ) : isOutOfStock ? (
                          <span>Out of Stock</span>
                        ) : (
                          <>
                            <i className="fa-solid fa-bag-shopping" style={{ fontSize: '0.8rem' }} />
                            <span>Add to Bag</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── Sticky Bottom Purchase Bar ── */}
            {selectedOption && (
              <div className="pdp-sticky-bar">
                <div className="pdp-sticky-bar__left">
                  {selectedBottleObj?.imageUrl && (
                    <img src={selectedBottleObj.imageUrl} alt="" style={{ width: '28px', height: '32px', objectFit: 'contain', background: '#F7F3ED', borderRadius: '4px', padding: '1px' }} />
                  )}
                  <div className="pdp-sticky-bar__info">
                    <span className="pdp-sticky-bar__title">
                      {selectedOption.size?.replace(' Decant', '').toUpperCase()} {selectedBottleObj?.finish ? `• ${selectedBottleObj.finish}` : ''}
                    </span>
                    <span className="pdp-sticky-bar__price">
                      ₹{((selectedOption.price + bottleAdditionalPrice) * selectedQty).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={isAdding || selectedOption.stock <= 0}
                  className="pdp-sticky-bar__cta"
                >
                  <i className="fa-solid fa-bag-shopping" />
                  <span>{isAdding ? 'Adding…' : 'Add to Bag'}</span>
                </button>
              </div>
            )}

            {/* ── Scent Profile Card ── */}
            {product.pyramid && (
              <div className="pdp-scent-card">
                <span className="pdp-card-heading">Olfactory Scent Profile</span>
                <div>
                  <div className="pdp-scent-row">
                    <span className="pdp-scent-note-label">Top Notes</span>
                    <span className="pdp-scent-note-value">{product.pyramid.top}</span>
                  </div>
                  <div className="pdp-scent-row">
                    <span className="pdp-scent-note-label">Heart Notes</span>
                    <span className="pdp-scent-note-value">{product.pyramid.heart}</span>
                  </div>
                  <div className="pdp-scent-row">
                    <span className="pdp-scent-note-label">Base Notes</span>
                    <span className="pdp-scent-note-value">{product.pyramid.base}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Scent Story / Description ── */}
            {product.description && (
              <div className="pdp-desc-card">
                <span className="pdp-card-heading">Scent Story</span>
                <p className="pdp-desc-text">{product.description}</p>
              </div>
            )}

          </div>

        </div>

        {/* Trust & Quality Pillars */}
        {renderTrustSection()}

        {/* Reviews */}
        {renderReviewsSection()}

        {/* SECTION 7: Unified discovery recommendations */}
        {similarProducts.length > 0 && (
          <div className="mt-20 pt-16 border-t border-black/6">
            <div className="mb-12 text-center">
              <span className="text-[0.62rem] font-bold tracking-[3px] text-[#B08A50] uppercase block mb-2">
                SCENT DISCOVERY
              </span>
              <h3 className="font-heading text-3xl font-light text-[#1C1B18] tracking-wide uppercase">
                Related Fragrances
              </h3>
              <p className="text-[0.76rem] text-black/45 leading-relaxed mt-1">
                Frequently collected with this scent or sharing similar olfactory notes.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {similarProducts.map((simProd) => (
                <div
                  key={simProd.id}
                  onClick={() => {
                    navigate(`/product/${simProd.slug || simProd.id}`);
                  }}
                  className="group h-full flex flex-col bg-white border border-black/5 hover:border-black/20 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 overflow-hidden cursor-pointer"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#F7F3ED]/30 border-b border-black/5">
                    <img
                      src={simProd.image}
                      alt={simProd.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-103"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const added = WishlistStore.toggle(simProd.id);
                        showToast(added ? 'Added to your collection wishlist.' : 'Removed from your wishlist', 'success');
                      }}
                      className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-black/5 flex items-center justify-center hover:text-[#FF003C] hover:bg-white transition-all duration-300 shadow-sm cursor-pointer text-[#2C2926]"
                      aria-label="Toggle wishlist"
                    >
                      <i className={`${wishlist.includes(simProd.id) ? 'fas fa-heart text-[#FF003C]' : 'far fa-heart'}`} />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col flex-1 text-left">
                    <span className="text-[0.55rem] font-bold tracking-[2px] text-black/40 block mb-1 uppercase">
                      {simProd.brand}
                    </span>
                    <h4 className="font-heading text-xs font-normal text-[#1C1B18] mb-1.5 tracking-wide leading-tight group-hover:text-[#B08A50] transition-colors duration-300 line-clamp-2 min-h-[2rem]">
                      {simProd.name}
                    </h4>
                    <div className="text-xs font-semibold text-[#B08A50] mt-auto">
                      ₹{simProd.price.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Premium Lightbox ── */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-[9999] select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Backdrop — click to close */}
            <div
              className="absolute inset-0"
              style={{
                background: 'rgba(10, 8, 6, 0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
              onClick={() => { setIsLightboxOpen(false); setIsZoomed(false); }}
            />

            {/* ── Top bar: product context + close ── */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-10 py-5">
              {/* Left: Brand + Name */}
              <div className="flex flex-col gap-0.5">
                <span
                  className="text-[0.52rem] font-bold tracking-[3.5px] uppercase"
                  style={{ color: '#8B672F' }}
                >
                  {product.brand}
                </span>
                <span
                  className="text-[0.78rem] font-light tracking-wide"
                  style={{ color: 'rgba(254,252,249,0.9)', fontFamily: 'var(--font-heading, serif)' }}
                >
                  {product.name}
                </span>
              </div>

              {/* Center: counter */}
              <span
                className="absolute left-1/2 -translate-x-1/2 text-[0.62rem] font-bold tracking-[3px] uppercase"
                style={{ color: 'rgba(254,252,249,0.75)' }}
              >
                {activeImageIndex + 1} / {galleryImages.length}
              </span>

              {/* Right: Close button */}
              <button
                onClick={() => { setIsLightboxOpen(false); setIsZoomed(false); }}
                aria-label="Close gallery"
                className="cursor-pointer transition-all duration-300 group"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  border: '1px solid rgba(254,252,249,0.25)',
                  background: 'rgba(254,252,249,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(254,252,249,0.85)',
                  fontSize: '0.9rem',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(139,103,47,0.18)';
                  e.currentTarget.style.borderColor = 'rgba(139,103,47,0.5)';
                  e.currentTarget.style.color = '#8B672F';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(254,252,249,0.07)';
                  e.currentTarget.style.borderColor = 'rgba(254,252,249,0.25)';
                  e.currentTarget.style.color = 'rgba(254,252,249,0.85)';
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* ── Central image area ── */}
            <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-16 md:px-24"
              style={{ paddingTop: '90px', paddingBottom: galleryImages.length > 1 ? '110px' : '60px' }}
            >
              {/* Prev arrow */}
              {galleryImages.length > 1 && (
                <button
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  className="absolute left-4 md:left-8 z-20 cursor-pointer transition-all duration-300"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid rgba(254,252,249,0.25)',
                    background: 'rgba(254,252,249,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(254,252,249,0.85)',
                    fontSize: '0.72rem',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(254,252,249,0.14)';
                    e.currentTarget.style.borderColor = 'rgba(254,252,249,0.4)';
                    e.currentTarget.style.color = 'rgba(254,252,249,0.95)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(254,252,249,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(254,252,249,0.25)';
                    e.currentTarget.style.color = 'rgba(254,252,249,0.85)';
                  }}
                >
                  <i className="fas fa-chevron-left" />
                </button>
              )}

              {/* Image */}
              <div className="relative flex items-center justify-center w-full h-full overflow-hidden">
                {imageErrors[activeImageIndex] ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <i className="fa-solid fa-flask text-3xl" style={{ color: '#8B672F', opacity: 0.75 }} />
                    <span className="text-[0.62rem] font-bold tracking-[3px] uppercase" style={{ color: '#8B672F' }}>
                      {product.brand}
                    </span>
                    <span className="text-[0.88rem] font-light" style={{ color: 'rgba(254,252,249,0.85)', fontFamily: 'var(--font-heading,serif)' }}>
                      {product.name}
                    </span>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeImageIndex}
                      src={sanitizeImageUrl(galleryImages[activeImageIndex])}
                      alt={`${product.name} — view ${activeImageIndex + 1}`}
                      decoding="async"
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
                      onClick={() => setIsZoomed(prev => !prev)}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        cursor: isZoomed ? 'zoom-out' : 'zoom-in',
                        transform: isZoomed ? 'scale(1.55)' : 'scale(1)',
                        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        borderRadius: 4,
                        userSelect: 'none',
                      }}
                    />
                  </AnimatePresence>
                )}
              </div>

              {/* Next arrow */}
              {galleryImages.length > 1 && (
                <button
                  onClick={handleNextImage}
                  aria-label="Next image"
                  className="absolute right-4 md:right-8 z-20 cursor-pointer transition-all duration-300"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid rgba(254,252,249,0.25)',
                    background: 'rgba(254,252,249,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(254,252,249,0.85)',
                    fontSize: '0.72rem',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(254,252,249,0.14)';
                    e.currentTarget.style.borderColor = 'rgba(254,252,249,0.4)';
                    e.currentTarget.style.color = 'rgba(254,252,249,0.95)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(254,252,249,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(254,252,249,0.25)';
                    e.currentTarget.style.color = 'rgba(254,252,249,0.85)';
                  }}
                >
                  <i className="fas fa-chevron-right" />
                </button>
              )}
            </div>

            {/* ── Bottom thumbnail rail ── */}
            {galleryImages.length > 1 && (
              <div
                className="absolute bottom-0 left-0 right-0 z-20 flex justify-center items-center gap-2.5 px-6 py-5 overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
                onClick={e => e.stopPropagation()}
              >
                {galleryImages.map((imgUrl, idx) => {
                  const isActive = activeImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => { setActiveImageIndex(idx); setIsZoomed(false); }}
                      aria-label={`View image ${idx + 1}`}
                      className="cursor-pointer flex-shrink-0 transition-all duration-300 overflow-hidden"
                      style={{
                        width: isActive ? 56 : 48,
                        height: isActive ? 56 : 48,
                        borderRadius: 6,
                        border: isActive
                          ? '1.5px solid #8B672F'
                          : '1.5px solid rgba(254,252,249,0.1)',
                        opacity: isActive ? 1 : 0.45,
                        outline: isActive ? '2px solid rgba(176,138,80,0.25)' : 'none',
                        outlineOffset: 2,
                        background: '#111',
                        transform: isActive ? 'scale(1)' : 'scale(0.95)',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.opacity = '0.85';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.opacity = '0.45';
                          e.currentTarget.style.transform = 'scale(0.95)';
                        }
                      }}
                    >
                      <img
                        src={sanitizeImageUrl(imgUrl)}
                        alt={`Thumbnail ${idx + 1}`}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
