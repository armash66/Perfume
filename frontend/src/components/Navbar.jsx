import { useState, useEffect, useRef, useMemo } from 'react';
import { SignedIn, SignedOut, SignInButton, SignOutButton } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Navbar.css';

const ShoppingBagIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const collectionsMenuItems = [
  { id: 'all', label: 'All Collections', type: 'categories', filter: 'categories' },
  { id: 'summer', label: 'Summer', type: 'collection', filter: 'summer' },
  { id: 'winter', label: 'Winter', type: 'collection', filter: 'winter' },
  // { id: 'office', label: 'Office', type: 'collection', filter: 'office' },
  // { id: 'datenight', label: 'Date Night', type: 'collection', filter: 'datenight' },
  { id: 'her', label: 'For Her', type: 'collection', filter: 'her' },
  { id: 'him', label: 'For Him', type: 'collection', filter: 'him' }
];

const shopMenuItems = [
  { id: 'all', label: 'Shop All', filter: 'all' },
  { id: 'decants', label: 'Decants', filter: 'decants' },
  { id: 'fullbottles', label: 'Full Bottles', filter: 'fullbottles' },
  { id: 'newarrivals', label: 'New Arrivals', filter: 'newarrivals' },
  { id: 'bestsellers', label: 'Best Sellers', filter: 'bestsellers' }
];

const collectionDescriptions = {
  all: { title: "Curated Journeys", text: "Explore our entire catalogue of niche decants and premium designer fragrances." },
  summer: { title: "Summer Fields", text: "Bright, fresh, and aquatic scents crafted for warm sunny days and outdoor freshness." },
  winter: { title: "Winter Solstice", text: "Warm, spicy, and boozy fragrances perfect for cozy cold nights and seasonal gatherings." },
  office: { title: "Office Confidence", text: "Clean, professional, and sophisticated scents that project quiet confidence." },
  datenight: { title: "Midnight Romance", text: "Seductive, mysterious, and magnetic perfumes designed to make a memorable impression." },
  her: { title: "For Her", text: "Comforting, sweet, and floral creations tailored for modern elegance." },
  him: { title: "For Him", text: "Bold, woody, and aromatic statements designed for the refined gentleman." }
};

const shopDescriptions = {
  all: { title: "Curated Catalogue", text: "Browse our entire curated inventory of fragrances, decants, and discovery sets." },
  decants: { title: "Decants & Atomizers", text: "Try before you buy. Elegant travel-sized atomizers of elite luxury scents." },
  fullbottles: { title: "Retail Editions", text: "Invest in a signature scent. Complete factory-sealed retail presentations." },
  newarrivals: { title: "New Releases", text: "Experience the latest releases added fresh to our fragrance collection." },
  bestsellers: { title: "Elite Favorites", text: "Our most coveted, highest-rated fragrances requested by connoisseurs." }
};

export default function Navbar({ onNavigate, activePage, onSelectCategory, activeCategory, products = [] }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileShopOpen, setIsMobileShopOpen] = useState(false);
  const [isMobileCollectionsOpen, setIsMobileCollectionsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isMarqueeVisible, setIsMarqueeVisible] = useState(() => {
    return localStorage.getItem('marquee-dismissed') !== 'true';
  });

  useEffect(() => {
    if (!isMarqueeVisible) {
      document.body.classList.add('marquee-hidden');
    } else {
      document.body.classList.remove('marquee-hidden');
    }
  }, [isMarqueeVisible]);

  // Luxury Shop Dropdown States & Handlers
  const [isShopHovered, setIsShopHovered] = useState(false);
  const [hoveredShopIndex, setHoveredShopIndex] = useState(null);
  const [focusedShopIndex, setFocusedShopIndex] = useState(-1);

  // Luxury Collections Dropdown States & Handlers
  const [isCollectionsHovered, setIsCollectionsHovered] = useState(false);
  const [hoveredCollectionIndex, setHoveredCollectionIndex] = useState(null);
  const [focusedCollectionIndex, setFocusedCollectionIndex] = useState(-1);

  // Global Search Overlay States, Refs, and Effects
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (isSearchOpen) {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (e) {
          setRecentSearches([]);
        }
      }
    }
  }, [isSearchOpen]);

  const addRecentSearch = (term) => {
    if (!term || term.trim() === '') return;
    const cleanTerm = term.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t.toLowerCase() !== cleanTerm.toLowerCase());
      const updated = [cleanTerm, ...filtered].slice(0, 5); // Keep last 5
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleTermClick = (term) => {
    setSearchQuery(term);
    addRecentSearch(term);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen || isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSearchOpen, isMobileMenuOpen]);

  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [activePage]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (isSearchOpen && e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSearchOpen]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Tab') {
      const focusableEls = searchContainerRef.current?.querySelectorAll(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
      );
      if (!focusableEls || focusableEls.length === 0) return;
      
      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];
      
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          lastEl.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastEl) {
          firstEl.focus();
          e.preventDefault();
        }
      }
    }
  };

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleCollectionsKeyDown = (e) => {
    if (!isCollectionsHovered) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsCollectionsHovered(true);
        setFocusedCollectionIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedCollectionIndex((prev) => (prev + 1) % collectionsMenuItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedCollectionIndex((prev) => (prev - 1 + collectionsMenuItems.length) % collectionsMenuItems.length);
        break;
      case 'Escape':
        e.preventDefault();
        setIsCollectionsHovered(false);
        setFocusedCollectionIndex(-1);
        document.getElementById('nav-collections-trigger')?.focus();
        break;
      case 'Tab':
        setIsCollectionsHovered(false);
        setFocusedCollectionIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleShopKeyDown = (e) => {
    if (!isShopHovered) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsShopHovered(true);
        setFocusedShopIndex(0);
      }
      return;
    }

    const nextIndex = (current, direction) => {
      let next = current;
      const len = shopMenuItems.length;
      do {
        next = (next + direction + len) % len;
      } while (shopMenuItems[next].isDivider && next !== current);
      return next;
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedShopIndex((prev) => nextIndex(prev, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedShopIndex((prev) => nextIndex(prev, -1));
        break;
      case 'Escape':
        e.preventDefault();
        setIsShopHovered(false);
        setFocusedShopIndex(-1);
        document.getElementById('nav-shop-trigger')?.focus();
        break;
      case 'Tab':
        setIsShopHovered(false);
        setFocusedShopIndex(-1);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (focusedShopIndex >= 0 && isShopHovered) {
      const el = document.querySelector(`.lux-shop-item[data-index="${focusedShopIndex}"]`);
      if (el) el.focus();
    }
  }, [focusedShopIndex, isShopHovered]);

  useEffect(() => {
    if (focusedCollectionIndex >= 0 && isCollectionsHovered) {
      const el = document.querySelector(`.lux-dropdown-item[data-index="${focusedCollectionIndex}"]`);
      if (el) el.focus();
    }
  }, [focusedCollectionIndex, isCollectionsHovered]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const syncCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('cartItems') || '[]');
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
      } catch (e) {
        console.error('Failed to parse cartItems in Navbar:', e);
        setCartCount(0);
      }
    };
    syncCart();
    window.addEventListener('cart-updated', syncCart);
    return () => window.removeEventListener('cart-updated', syncCart);
  }, []);

  const handleLinkClick = (e, hash) => {
    if (e) e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    const policies = ['authenticity', 'about', 'shipping', 'returns', 'terms', 'privacy', 'reviews'];
    if (hash === 'cart') {
      window.location.hash = 'cart';
      if (onNavigate) onNavigate('cart');
    } else if (hash === 'categories') {
      window.location.hash = 'categories';
      if (onNavigate) onNavigate('categories');
    } else if (hash === 'gifting') {
      window.location.hash = 'gifting';
      if (onNavigate) onNavigate('gifting');
    } else if (policies.includes(hash)) {
      window.location.hash = hash;
      if (onNavigate) onNavigate('policies');
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } else {
      window.location.hash = hash;
      if (onNavigate) {
        if (hash === 'collection' || hash === 'shop') onNavigate('shop');
        else onNavigate('home');
      }
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else if (hash === '') window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleCategoryClick = (e, filterKey) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    if (onSelectCategory) onSelectCategory(filterKey);
    if (onNavigate) onNavigate('shop');
    window.location.hash = 'collection';
    setTimeout(() => {
      const el = document.getElementById('collection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSearchProductClick = (product) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    window.location.hash = `product-${product.slug || product.id}`;
  };

  // Smart client-side search: matches name, brand, family, notes, tags/occasions
  const filteredProducts = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    if (!q) return [];
    return products.filter(p => {
      if (p.name && p.name.toLowerCase().includes(q)) return true;
      if (p.brand && p.brand.toLowerCase().includes(q)) return true;
      if (p.family && p.family.toLowerCase().includes(q)) return true;
      if (p.tagline && p.tagline.toLowerCase().includes(q)) return true;
      if (Array.isArray(p.notes) && p.notes.some(n => n.toLowerCase().includes(q))) return true;
      if (Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(q))) return true;
      if (p.description && p.description.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [debouncedQuery, products]);

  const handleViewAllResults = () => {
    setIsSearchOpen(false);
    const encoded = encodeURIComponent(searchQuery.trim());
    window.location.hash = encoded ? `shop?search=${encoded}` : 'shop';
    setSearchQuery('');
  };


  const activeShopInfo = useMemo(() => {
    return hoveredShopIndex !== null && hoveredShopIndex >= 0 && !shopMenuItems[hoveredShopIndex].isDivider
      ? shopDescriptions[shopMenuItems[hoveredShopIndex].id]
      : shopDescriptions['all'];
  }, [hoveredShopIndex]);

  const activeCollectionInfo = useMemo(() => {
    return hoveredCollectionIndex !== null && hoveredCollectionIndex >= 0
      ? collectionDescriptions[collectionsMenuItems[hoveredCollectionIndex].id]
      : collectionDescriptions['all'];
  }, [hoveredCollectionIndex]);

  return (
    <header className={`navbar-wrapper ${activePage === 'home' ? 'on-home' : ''} ${isScrolled ? 'scrolled' : ''} ${isSearchOpen ? 'search-active' : ''}`}>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="nav-container">

          {/* Left: Hamburger (mobile) + Desktop menu */}
          <div className="nav-left">
            <button
              className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span /><span /><span />
            </button>

            <ul className="nav-menu">
              <li 
                className="nav-item dropdown"
                onMouseEnter={() => setIsShopHovered(true)}
                onMouseLeave={() => { setIsShopHovered(false); setFocusedShopIndex(-1); }}
                onKeyDown={handleShopKeyDown}
              >
                <a 
                  id="nav-shop-trigger"
                  href="#collection" 
                  className="nav-link" 
                  onClick={(e) => handleLinkClick(e, 'shop')}
                  aria-haspopup="true"
                  aria-expanded={isShopHovered}
                >
                  Shop <i className="fas fa-chevron-down nav-chevron" />
                </a>
                
                <AnimatePresence>
                  {isShopHovered && (
                    <motion.div
                      className="lux-dropdown"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      onPointerMove={handlePointerMove}
                      role="menu"
                      aria-label="Shop Submenu"
                    >
                      <div className="lux-dropdown-inner">
                        <div className="lux-gold-line" />
                        <div className="lux-dropdown-list">
                          <span className="lux-dropdown-title">Shop</span>
                          <div className="lux-dropdown-items">
                            {shopMenuItems.map((item, idx) => {
                              if (item.isDivider) {
                                return <div key={item.id} className="lux-dropdown-divider" />;
                              }
                              const isHovered = hoveredShopIndex === idx;
                              return (
                                <a
                                  key={item.id}
                                  href="#collection"
                                  data-index={idx}
                                  className={`lux-dropdown-item lux-shop-item ${isHovered ? 'hovered' : ''}`}
                                  onClick={(e) => {
                                    handleCategoryClick(e, item.filter);
                                    setIsShopHovered(false);
                                  }}
                                  onMouseEnter={() => {
                                    setHoveredShopIndex(idx);
                                    setFocusedShopIndex(idx);
                                  }}
                                  onMouseLeave={() => setHoveredShopIndex(null)}
                                  role="menuitem"
                                >
                                  <span className="item-label">{item.label}</span>
                                  <span className="item-arrow">→</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                        <div className="lux-dropdown-preview">
                          <span className="preview-subtitle">Discover</span>
                          <h5 className="preview-title">{activeShopInfo.title}</h5>
                          <p className="preview-text">{activeShopInfo.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>

              <li 
                className="nav-item dropdown"
                onMouseEnter={() => setIsCollectionsHovered(true)}
                onMouseLeave={() => { setIsCollectionsHovered(false); setFocusedCollectionIndex(-1); }}
                onKeyDown={handleCollectionsKeyDown}
              >
                <a 
                  id="nav-collections-trigger"
                  href="#categories" 
                  className="nav-link" 
                  onClick={(e) => handleLinkClick(e, 'categories')}
                  aria-haspopup="true"
                  aria-expanded={isCollectionsHovered}
                >
                  Collections <i className="fas fa-chevron-down nav-chevron" />
                </a>
                
                <AnimatePresence>
                  {isCollectionsHovered && (
                    <motion.div
                      className="lux-dropdown"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      onPointerMove={handlePointerMove}
                      role="menu"
                      aria-label="Collections Submenu"
                    >
                      <div className="lux-dropdown-inner">
                        {/* Signature gold accent line */}
                        <div className="lux-gold-line" />

                        {/* Left column: categories list */}
                        <div className="lux-dropdown-list">
                          <span className="lux-dropdown-title">Collections</span>
                          <div className="lux-dropdown-items">
                            {collectionsMenuItems.map((item, idx) => {
                              const isHovered = hoveredCollectionIndex === idx;
                              return (
                                <a
                                  key={item.id}
                                  href={`#${item.filter}`}
                                  data-index={idx}
                                  className={`lux-dropdown-item ${isHovered ? 'hovered' : ''}`}
                                  onClick={(e) => {
                                    if (item.type === 'categories') {
                                      handleLinkClick(e, 'categories');
                                    } else {
                                      handleCategoryClick(e, item.filter);
                                    }
                                    setIsCollectionsHovered(false);
                                  }}
                                  onMouseEnter={() => {
                                    setHoveredCollectionIndex(idx);
                                    setFocusedCollectionIndex(idx);
                                  }}
                                  onMouseLeave={() => setHoveredCollectionIndex(null)}
                                  role="menuitem"
                                >
                                  <span className="item-label">{item.label}</span>
                                  <span className="item-arrow">→</span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                        <div className="lux-dropdown-preview">
                          <span className="preview-subtitle">Curated Journeys</span>
                          <h5 className="preview-title">{activeCollectionInfo.title}</h5>
                          <p className="preview-text">{activeCollectionInfo.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>

              <li className="nav-item">
                <a href="#gifting" className="nav-link" onClick={(e) => handleLinkClick(e, 'gifting')}>Gifting</a>
              </li>

            </ul>
          </div>

          {/* Center: Brand Logo */}
          <div className="logo-container" onClick={(e) => handleLinkClick(e, '')}>
            <span className="brand-name">DECANT ATELIER</span>
          </div>

          {/* Right: Action icons */}
          <div className="nav-right">
            <div className="nav-icons">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="nav-icon-btn nav-profile-btn" title="Login" aria-label="Login">
                    <UserIcon className="nav-profile-svg" />
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <a href="#profile" onClick={(e) => handleLinkClick(e, 'profile')} className="nav-icon-btn nav-profile-btn" title="My Profile" aria-label="My Profile" style={{ display: 'flex', alignItems: 'center' }}>
                  <UserIcon className="nav-profile-svg" />
                </a>
              </SignedIn>

              <button className="nav-icon-btn" onClick={() => setIsSearchOpen(true)} title="Search" aria-label="Search">
                <SearchIcon className="nav-search-svg" />
              </button>

              <a href="#cart" className="nav-icon-btn cart-icon" onClick={(e) => handleLinkClick(e, 'cart')} aria-label="Cart">
                <ShoppingBagIcon className="nav-bag-icon" />
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen drawer */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span className="brand-name">DECANT ATELIER</span>
          <button className="mobile-close" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
            <i className="fas fa-times" />
          </button>
        </div>

        <ul className="mobile-nav-list">
          <li>
            <button className={`mobile-accordion ${isMobileShopOpen ? 'expanded' : ''}`} onClick={() => setIsMobileShopOpen(!isMobileShopOpen)}>
              Shop <i className="fas fa-chevron-down" />
            </button>
            <ul className={`mobile-sub ${isMobileShopOpen ? 'open' : ''}`}>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'all')}>Shop All</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'decants')}>Decants</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'fullbottles')}>Full Bottles</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'newarrivals')}>New Arrivals</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'bestsellers')}>Best Sellers</a></li>
            </ul>
          </li>
          <li>
            <button className={`mobile-accordion ${isMobileCollectionsOpen ? 'expanded' : ''}`} onClick={() => setIsMobileCollectionsOpen(!isMobileCollectionsOpen)}>
              Collections <i className="fas fa-chevron-down" />
            </button>
            <ul className={`mobile-sub ${isMobileCollectionsOpen ? 'open' : ''}`}>
              <li><a href="#categories" onClick={(e) => handleLinkClick(e, 'categories')}>All Collections</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'summer')}>Summer</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'winter')}>Winter</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'office')}>Office</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'datenight')}>Date Night</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'her')}>For Her</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'him')}>For Him</a></li>
            </ul>
          </li>
          <li><a href="#gifting" onClick={(e) => handleLinkClick(e, 'gifting')}>Gifting</a></li>
          <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'bestsellers')}>Best Sellers</a></li>
          <li><a href="#about" onClick={(e) => handleLinkClick(e, 'about')}>About</a></li>
          <li><a href="#shop?category=wishlist" onClick={(e) => { setIsMobileMenuOpen(false); window.location.hash = 'shop?category=wishlist'; }}>My Wishlist</a></li>
          
          <SignedIn>
            <div className="mobile-drawer-divider" />
            <span className="mobile-drawer-section-title">My Account</span>
            <li><a href="#profile?tab=profile" onClick={(e) => handleLinkClick(e, 'profile')}>Profile Details</a></li>
            <li><a href="#profile?tab=orders" onClick={(e) => handleLinkClick(e, 'profile')}>My Orders</a></li>
            <li><a href="#profile?tab=addresses" onClick={(e) => handleLinkClick(e, 'profile')}>Manage Addresses</a></li>
            <li><a href="#profile?tab=security" onClick={(e) => handleLinkClick(e, 'profile')}>Account Security</a></li>
            <li>
              <SignOutButton redirectUrl="/">
                <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }}>Log Out</a>
              </SignOutButton>
            </li>
          </SignedIn>
          <SignedOut>
            <div className="mobile-drawer-divider" />
            <li>
              <SignInButton mode="modal">
                <a href="#" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }}>Log In</a>
              </SignInButton>
            </li>
          </SignedOut>
        </ul>
      </div>

      {/* ─── Search Overlay — Spotlight / Raycast Style ─── */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            className="search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label="Search fragrances"
            onClick={(e) => {
              if (e.target.classList.contains('search-overlay')) {
                setIsSearchOpen(false);
                setSearchQuery('');
              }
            }}
          >
            <motion.div
              className="search-container"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              ref={searchContainerRef}
              onKeyDown={handleSearchKeyDown}
            >

              {/* ── Panel Header: search input ── */}
              <div className="search-header-container">
                <svg className="search-input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                <input
                  ref={searchInputRef}
                  id="search-input-field"
                  type="text"
                  className="search-input-field"
                  placeholder="Search fragrances, notes, occasions…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      addRecentSearch(searchQuery);
                      handleViewAllResults();
                    }
                  }}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />

                {searchQuery && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}

                <button
                  className="search-close-panel-btn"
                  onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                  aria-label="Close search"
                >
                  ESC
                </button>
              </div>

              {/* ── Panel Body ── */}
              <div className="search-panel-body">

                {searchQuery.trim() === '' ? (
                  /* ── Empty state: Popular Searches + Browse by Family ── */
                  <>
                    {/* Recent searches (if any) */}
                    {recentSearches.length > 0 && (
                      <div style={{ marginBottom: '1.75rem' }}>
                        <span className="search-panel-section-title">Recent</span>
                        <div className="search-pills-list">
                          {recentSearches.map(term => (
                            <button
                              key={term}
                              className="search-pill-item"
                              onClick={() => handleTermClick(term)}
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular searches */}
                    <div style={{ marginBottom: '1.75rem' }}>
                      <span className="search-panel-section-title">Popular Searches</span>
                      <div className="search-pills-list">
                        {['Baccarat Rouge 540', 'Hawas', 'Khamrah', 'Bleu de Chanel', '9PM'].map(term => (
                          <button
                            key={term}
                            className="search-pill-item"
                            onClick={() => handleTermClick(term)}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Browse by Family */}
                    <div>
                      <span className="search-panel-section-title">Browse by Family</span>
                      <div className="search-family-grid">
                        {[
                          { name: 'Woody', sub: 'Warm & Grounded' },
                          { name: 'Amber', sub: 'Rich & Sensual' },
                          { name: 'Fresh', sub: 'Clean & Bright' },
                          { name: 'Citrus', sub: 'Zesty & Uplifting' },
                          { name: 'Gourmand', sub: 'Sweet & Edible' },
                          { name: 'Floral', sub: 'Delicate & Romantic' },
                        ].map(({ name, sub }) => (
                          <button
                            key={name}
                            className="search-family-card"
                            onClick={() => handleTermClick(name)}
                          >
                            <span className="search-family-name">{name}</span>
                            <span className="search-family-sub">{sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── Active query: live result rows ── */
                  <>
                    {filteredProducts.length > 0 ? (
                      <div className="search-results-list">
                        {filteredProducts.slice(0, 6).map((product) => (
                          <motion.div
                            key={product.id}
                            className="search-result-row"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              addRecentSearch(product.name);
                              handleSearchProductClick(product);
                            }}
                          >
                            <img
                              className="search-result-img"
                              src={product.image || '/images/perfume_placeholder.jpeg'}
                              alt={product.name}
                              loading="lazy"
                            />
                            <div className="search-result-meta">
                              <span className="search-result-title">{product.name}</span>
                              {product.family && (
                                <span className="search-result-category">{product.family}</span>
                              )}
                              <span className="search-result-desc">
                                {product.tagline ||
                                  (Array.isArray(product.notes) && product.notes.slice(0, 3).join(' · ')) ||
                                  (product.brand || '')}
                              </span>
                            </div>
                            <span className="search-result-price">
                              ₹{parseFloat(product.price).toLocaleString('en-IN')}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      /* No results */
                      <div className="search-no-results">
                        <p className="no-results-title">No fragrances found</p>
                        <p className="no-results-text">Try "vanilla", "office", or "woody amber"</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── Panel Footer: View All Results ── */}
              <div className="search-footer-action">
                <span className="search-action-hint">
                  {searchQuery.trim()
                    ? `${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} found`
                    : 'Start typing to discover'}
                </span>
                <button
                  className="search-action-btn-main"
                  onClick={() => {
                    if (searchQuery.trim()) addRecentSearch(searchQuery);
                    handleViewAllResults();
                  }}
                >
                  View All Results
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
