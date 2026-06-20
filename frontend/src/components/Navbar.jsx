import { useState, useEffect, useRef, useMemo } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collectionsData } from './SignatureCollection/CollectionData';
import './Navbar.css';

const ShoppingBagIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
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
  // { id: 'divider-1', isDivider: true },
  // { id: 'brands', label: 'Brands', filter: 'brands' },
  // { id: 'newarrivals', label: 'New Arrivals', filter: 'newarrivals' },
  { id: 'families', label: 'Best Sellers', filter: 'families' },
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
  brands: { title: "Luxury Houses", text: "Discover fragrances by house, from Parisian ateliers to modern niche creators." },
  families: { title: "Aroma Families", text: "Sort by scent profile: from fresh citruses to deep warm ouds." },
  newarrivals: { title: "New Releases", text: "Experience the latest releases added fresh to our fragrance collection." }
};

export default function Navbar({ onNavigate, activePage, onSelectCategory, activeCategory }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileShopOpen, setIsMobileShopOpen] = useState(false);
  const [isMobileCollectionsOpen, setIsMobileCollectionsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);

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
    if (isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSearchOpen]);

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
      const count = parseInt(localStorage.getItem('cartCount') || '0');
      setCartCount(count);
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
    window.location.hash = `product-${product.id}`;
  };

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase().trim();
    return collectionsData.filter(product =>
      product.name.toLowerCase().includes(q) ||
      (product.brand && product.brand.toLowerCase().includes(q)) ||
      product.category.toLowerCase().includes(q) ||
      (product.notes && product.notes.some(n => n.toLowerCase().includes(q))) ||
      (product.tags && product.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [debouncedQuery]);

  const matchingBrands = useMemo(() => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase().trim();
    const brandsSet = new Set();
    collectionsData.forEach(p => {
      if (p.brand && p.brand.toLowerCase().includes(q)) {
        brandsSet.add(p.brand);
      }
    });
    return Array.from(brandsSet).slice(0, 5);
  }, [debouncedQuery]);

  const matchingCategories = useMemo(() => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase().trim();
    const catsSet = new Set();
    const popularCats = ['Fresh', 'Woody', 'Floral', 'Spicy', 'Sweet', 'Citrus', 'Amber', 'Warm'];
    popularCats.forEach(c => {
      if (c.toLowerCase().includes(q)) {
        catsSet.add(c);
      }
    });
    collectionsData.forEach(p => {
      if (p.category && p.category.toLowerCase().includes(q)) {
        catsSet.add(p.category.charAt(0).toUpperCase() + p.category.slice(1));
      }
      if (p.tags) {
        p.tags.forEach(t => {
          if (t.toLowerCase().includes(q)) {
            catsSet.add(t.charAt(0).toUpperCase() + t.slice(1));
          }
        });
      }
    });
    return Array.from(catsSet).slice(0, 5);
  }, [debouncedQuery]);

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

              <li className="nav-item">
                <a href="#collection" className="nav-link" onClick={(e) => handleCategoryClick(e, 'sets')}>Discovery Sets</a>
              </li>
            </ul>
          </div>

          {/* Center: Brand Logo */}
          <div className="logo-container" onClick={(e) => handleLinkClick(e, '')}>
            <span className="brand-name">DECANT ATELIER</span>
          </div>

          {/* Right: Action icons */}
          <div className="nav-right">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="nav-icon-btn" title="Login" aria-label="Login">
                  <i className="far fa-user-circle" />
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>

            <div className="nav-icons">
              <button className="nav-icon-btn" onClick={() => setIsSearchOpen(true)} title="Search" aria-label="Search">
                <i className="fas fa-search" />
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
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'brands')}>Brands</a></li>
              <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'newarrivals')}>New Arrivals</a></li>
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
          <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'sets')}>Discovery Sets</a></li>
          <li><a href="#about" onClick={(e) => handleLinkClick(e, 'about')}>About</a></li>
          <li><a href="#reviews" onClick={(e) => handleLinkClick(e, 'reviews')}>Reviews</a></li>
          <li><a href="#contact" onClick={(e) => handleLinkClick(e, 'contact')}>Contact</a></li>
        </ul>
      </div>

      {/* Search Overlay */}
      <div 
        className={`search-overlay ${isSearchOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search fragrances"
      >
        <button 
          className="search-close" 
          onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
          aria-label="Close search"
        >
          <i className="fas fa-times" />
        </button>

        <div 
          className="search-container" 
          ref={searchContainerRef} 
          onKeyDown={handleSearchKeyDown}
        >
          <div className="search-header border-b border-neutral-300 focus-within:border-amber-500 transition-colors duration-300 flex items-center gap-4 py-2">
            <i className="fas fa-search text-neutral-400 text-2xl" />
            <input
              ref={searchInputRef}
              type="text"
              className="w-full bg-transparent border-none outline-none font-heading font-light tracking-wide text-neutral-800 h-[56px] text-lg lg:h-[72px] lg:text-3xl"
              placeholder="Search fragrances..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addRecentSearch(searchQuery);
                }
              }}
              autoFocus={isSearchOpen}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer bg-transparent border-none p-0"
                aria-label="Clear search query"
              >
                <i className="fas fa-times-circle text-lg" />
              </button>
            )}
          </div>
          
          <div className="search-body">
            {searchQuery.trim() === '' ? (
              /* Discovery State when Query is Empty */
              <div className="space-y-10">
                {recentSearches.length > 0 && (
                  <div className="search-section">
                    <h4 className="search-section-title">Recent Searches</h4>
                    <div className="search-pills">
                      {recentSearches.map(term => (
                        <button key={term} className="search-pill rounded-full px-4 py-2 hover:bg-black hover:text-white transition-all duration-300" onClick={() => handleTermClick(term)}>{term}</button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="search-section">
                  <h4 className="search-section-title">Trending Searches</h4>
                  <div className="search-pills">
                    {['Bleu de Chanel', 'Yara', 'Khamrah', 'Spicebomb', 'Baccarat Rouge'].map(term => (
                      <button key={term} className="search-pill rounded-full px-4 py-2 hover:bg-black hover:text-white transition-all duration-300" onClick={() => handleTermClick(term)}>{term}</button>
                    ))}
                  </div>
                </div>

                <div className="search-section">
                  <h4 className="search-section-title">Popular Categories</h4>
                  <div className="search-pills">
                    {['Fresh', 'Floral', 'Woody', 'Warm', 'Spicy', 'Citrus', 'Sweet', 'Amber'].map(cat => (
                      <button key={cat} className="search-pill rounded-full px-4 py-2 hover:bg-black hover:text-white transition-all duration-300" onClick={() => handleTermClick(cat)}>{cat}</button>
                    ))}
                  </div>
                </div>

                <div className="search-section">
                  <h4 className="search-section-title">Featured Fragrances</h4>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5 xl:gap-8 w-full">
                    {collectionsData.filter(p => p.tags && p.tags.includes('featured')).slice(0, 10).map(product => (
                      <div
                        key={product.id}
                        className="group rounded-3xl overflow-hidden bg-white border border-neutral-100 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer flex flex-col h-full min-w-[160px]"
                        onClick={() => {
                          handleSearchProductClick(product);
                          addRecentSearch(product.name);
                        }}
                      >
                        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#faf8f5] w-full">
                          <img
                            src={product.image}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover object-center transition-all duration-700 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-4 flex flex-col justify-between flex-1">
                          <div>
                            <span className="text-xs tracking-[0.25em] uppercase text-neutral-400 block mb-1">
                              {product.brand.toUpperCase()}
                            </span>
                            <h5 className="line-clamp-2 font-medium text-neutral-800 text-sm group-hover:text-[#B89563] transition-colors duration-300">
                              {product.name}
                            </h5>
                          </div>
                          <div className="font-semibold text-amber-700 mt-2">
                            ₹ {(parseFloat(product.price) * 20).toLocaleString('en-IN')}.00
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Autocomplete and Search Results when Query is Active */
              <div>
                {/* Autocomplete / Match Previews */}
                {(matchingBrands.length > 0 || matchingCategories.length > 0) && (
                  <div className="flex flex-wrap gap-6 mb-8 p-4 bg-white/50 rounded-2xl border border-neutral-200/50 backdrop-blur-sm">
                    {matchingBrands.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[0.62rem] font-bold tracking-[2px] text-neutral-400 uppercase">Brands:</span>
                        <div className="flex gap-2">
                          {matchingBrands.map(b => (
                            <button
                              key={b}
                              onClick={() => handleTermClick(b)}
                              className="text-xs font-bold text-neutral-800 hover:text-[#B89563] underline decoration-[#B89563]/30 hover:decoration-[#B89563] transition-all cursor-pointer bg-transparent border-none p-0"
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {matchingBrands.length > 0 && matchingCategories.length > 0 && (
                      <div className="text-neutral-300 px-1">|</div>
                    )}
                    {matchingCategories.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[0.62rem] font-bold tracking-[2px] text-neutral-400 uppercase">Categories:</span>
                        <div className="flex gap-2">
                          {matchingCategories.map(c => (
                            <button
                              key={c}
                              onClick={() => handleTermClick(c)}
                              className="text-xs font-bold text-neutral-800 hover:text-[#B89563] underline decoration-[#B89563]/30 hover:decoration-[#B89563] transition-all cursor-pointer bg-transparent border-none p-0"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Results Grid or Empty State */}
                {filteredProducts.length > 0 ? (
                  <div className="search-section">
                    <h4 className="search-section-title">Matching Products ({filteredProducts.length})</h4>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5 xl:gap-8 w-full">
                      {filteredProducts.map(product => (
                        <div
                          key={product.id}
                          className="group rounded-3xl overflow-hidden bg-white border border-neutral-100 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer flex flex-col h-full min-w-[160px]"
                          onClick={() => {
                            handleSearchProductClick(product);
                            addRecentSearch(product.name);
                          }}
                        >
                          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#faf8f5] w-full">
                            <img
                              src={product.image}
                              alt={product.name}
                              loading="lazy"
                              className="w-full h-full object-cover object-center transition-all duration-700 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-4 flex flex-col justify-between flex-1">
                            <div>
                              <span className="text-xs tracking-[0.25em] uppercase text-neutral-400 block mb-1">
                                {product.brand.toUpperCase()}
                              </span>
                              <h5 className="line-clamp-2 font-medium text-neutral-800 text-sm group-hover:text-[#B89563] transition-colors duration-300">
                                {product.name}
                              </h5>
                            </div>
                            <div className="font-semibold text-amber-700 mt-2">
                              ₹ {(parseFloat(product.price) * 20).toLocaleString('en-IN')}.00
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Elegant Empty State */
                  <div className="py-16 text-center">
                    <i className="fas fa-search-minus text-neutral-300 text-5xl mb-4 block" />
                    <p className="font-heading text-xl font-light text-neutral-700 mb-6">
                      No fragrances found.
                    </p>
                    <div>
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-3">Try:</span>
                      <div className="flex flex-wrap justify-center gap-3">
                        {['Chanel', 'Yara', 'Khamrah', 'Spicebomb'].map(term => (
                          <button
                            key={term}
                            onClick={() => handleTermClick(term)}
                            className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-full hover:bg-black hover:text-white hover:border-black transition-all duration-300 cursor-pointer"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
