import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { collectionsData } from './SignatureCollection/CollectionData';
import './Navbar.css';

const ShoppingBagIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export default function Navbar({ onNavigate, activePage, onSelectCategory, activeCategory }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileShopOpen, setIsMobileShopOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);

  // Sync theme with HTML body attribute
  useEffect(() => {
    document.body.setAttribute('data-theme', isThemeDark ? 'dark' : 'light');
  }, [isThemeDark]);

  const handleLinkClick = (e, hash) => {
    if (e) e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    
    const policies = ['authenticity', 'about', 'shipping', 'returns', 'terms', 'privacy', 'reviews'];
    if (policies.includes(hash)) {
      window.location.hash = hash;
      if (onNavigate) onNavigate('policies');
      // Scroll to policy section
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.location.hash = hash;
      if (onNavigate) onNavigate('home');
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        } else if (hash === '') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleCategoryClick = (e, filterKey) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    
    if (onSelectCategory) {
      onSelectCategory(filterKey);
    }
    
    if (onNavigate) {
      onNavigate('home');
    }
    window.location.hash = 'collection';

    setTimeout(() => {
      const element = document.getElementById('collection');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSearchProductClick = (product) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    
    // We can select the tag of the product to filter, or just show 'all' and scroll to it
    if (onSelectCategory) {
      // Find a matching tag or just select 'all'
      onSelectCategory('all');
    }
    
    if (onNavigate) {
      onNavigate('home');
    }
    window.location.hash = 'collection';

    setTimeout(() => {
      const element = document.getElementById('collection');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Filter products based on search input
  const filteredProducts = collectionsData.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.notes.some(note => note.toLowerCase().includes(query))
    );
  });

  return (
    <header className="navbar-wrapper">
      {/* Top Banner (Lavender in light theme, Deep in dark theme) */}
      <div className="announcement-banner">
        <span>FATHER'S DAY SPECIAL — EXTRA 10% OFF ON ALL DECANTS. USE CODE: <strong>FRESH10</strong></span>
      </div>

      {/* Secondary Top Bar */}
      <div className="secondary-top-bar">
        <div className="top-bar-left">
          <a href="#about" onClick={(e) => handleLinkClick(e, 'about')}>About</a>
          <span className="top-bar-divider">|</span>
          <a href="#reviews" onClick={(e) => handleLinkClick(e, 'reviews')}>Reviews</a>
        </div>
        <div className="top-bar-right">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="top-bar-social" title="Instagram">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="top-bar-social" title="TikTok">
            <i className="fab fa-tiktok"></i>
          </a>
          <span className="top-bar-divider">|</span>
          <a href="#gifting" onClick={(e) => handleLinkClick(e, 'gifting')} className="gifting-link">Gifting</a>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          {/* Left Menu (Shop, Categories, Track Order) */}
          <ul className="nav-menu">
            <li className="nav-item dropdown">
              <a href="#collection" className="nav-link">
                SHOP <i className="fas fa-chevron-down nav-chevron"></i>
              </a>
              <ul className="dropdown-menu">
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'all')}>Shop All</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'decants')}>Decants</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'fullbottles')}>Full Bottles</a></li>
                <li className="dropdown-divider-item"></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'brands')}>Brands</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'families')}>Fragrance Families</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'newarrivals')}>New Arrivals</a></li>
              </ul>
            </li>

            <li className="nav-item dropdown">
              <a href="#collection" className="nav-link">
                CATEGORIES <i className="fas fa-chevron-down nav-chevron"></i>
              </a>
              <ul className="dropdown-menu">
                <li className="all-categories-link">
                  <a href="#collection" onClick={(e) => handleCategoryClick(e, 'all')}>All Categories</a>
                </li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'summer')}>Summer Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'winter')}>Winter Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'office')}>Office Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'gym')}>Gym Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'datenight')}>Date Night Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'party')}>Party Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'her')}>For Her</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'him')}>For Him</a></li>
              </ul>
            </li>

            <li className="nav-item">
              <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')} className="nav-link">
                TRACK ORDER
              </a>
            </li>
          </ul>

          {/* Centered Brand Logo */}
          <div className="logo-container" onClick={(e) => handleLinkClick(e, '')}>
            <span className="brand-name">DECANT ATELIER</span>
          </div>

          {/* Right Action Icons (Profile, Search Trigger, Shopping Bag, Theme Toggle) */}
          <div className="nav-right">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="nav-profile-btn" title="Login">
                  <i className="far fa-user"></i>
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>

            <button className="nav-icon-btn search-trigger-btn" onClick={() => setIsSearchOpen(true)} title="Search">
              <i className="fas fa-search"></i>
            </button>
            
            <a href="#" className="nav-icon cart-icon" onClick={(e) => e.preventDefault()}>
              <ShoppingBagIcon className="nav-bag-icon" />
              <span className="cart-count">1</span>
            </a>

            <button 
              className="theme-toggle" 
              onClick={() => setIsThemeDark(!isThemeDark)} 
              title="Toggle theme"
            >
              <i className={isThemeDark ? "fas fa-sun" : "fas fa-moon"}></i>
            </button>
          </div>

          {/* Hamburger Icon for Mobile */}
          <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        {/* Mobile Accordion Menu Drawer */}
        <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-header">
            <span className="brand-name">DECANT ATELIER</span>
            <button className="mobile-menu-close" onClick={() => setIsMobileMenuOpen(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <ul className="mobile-nav-list">
            <li className="mobile-nav-item">
              <button 
                className={`mobile-accordion-trigger ${isMobileShopOpen ? 'expanded' : ''}`} 
                onClick={() => setIsMobileShopOpen(!isMobileShopOpen)}
              >
                SHOP <i className="fas fa-chevron-down"></i>
              </button>
              <ul className={`mobile-accordion-content ${isMobileShopOpen ? 'open' : ''}`}>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'all')}>Shop All</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'decants')}>Decants</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'fullbottles')}>Full Bottles</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'brands')}>Brands</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'families')}>Fragrance Families</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'newarrivals')}>New Arrivals</a></li>
              </ul>
            </li>

            <li className="mobile-nav-item">
              <button 
                className={`mobile-accordion-trigger ${isMobileCategoriesOpen ? 'expanded' : ''}`} 
                onClick={() => setIsMobileCategoriesOpen(!isMobileCategoriesOpen)}
              >
                CATEGORIES <i className="fas fa-chevron-down"></i>
              </button>
              <ul className={`mobile-accordion-content ${isMobileCategoriesOpen ? 'open' : ''}`}>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'all')}>All Categories</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'summer')}>Summer Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'winter')}>Winter Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'office')}>Office Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'gym')}>Gym Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'datenight')}>Date Night Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'party')}>Party Perfumes</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'her')}>For Her</a></li>
                <li><a href="#collection" onClick={(e) => handleCategoryClick(e, 'him')}>For Him</a></li>
              </ul>
            </li>

            <li>
              <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>TRACK ORDER</a>
            </li>
            <li>
              <a href="#about" onClick={(e) => handleLinkClick(e, 'about')}>ABOUT</a>
            </li>
            <li>
              <a href="#reviews" onClick={(e) => handleLinkClick(e, 'reviews')}>REVIEWS</a>
            </li>
            <li>
              <a href="#gifting" onClick={(e) => handleLinkClick(e, 'gifting')}>GIFTING</a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Full-Width Search Drawer Overlay */}
      <div className={`search-overlay-drawer ${isSearchOpen ? 'open' : ''}`}>
        <div className="search-drawer-container">
          <div className="search-drawer-header">
            <i className="fas fa-search search-drawer-icon"></i>
            <input 
              type="text" 
              className="search-drawer-input" 
              placeholder="SEARCH FOR..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={isSearchOpen}
            />
            <button className="search-drawer-close" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="search-drawer-body">
            <div className="trending-section">
              <h4 className="search-section-title">TRENDING</h4>
              <div className="trending-pills">
                {['9 PM', 'Rare', 'Supremacy', 'Peach', 'Fruit'].map((pill) => (
                  <button 
                    key={pill} 
                    className="trending-pill-btn"
                    onClick={() => setSearchQuery(pill)}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            <div className="top-products-section">
              <h4 className="search-section-title">TOP PRODUCTS</h4>
              <div className="search-products-grid">
                {filteredProducts.slice(0, 6).map((product) => (
                  <div key={product.id} className="search-product-card" onClick={() => handleSearchProductClick(product)}>
                    <div className="search-product-img-wrapper">
                      <img src={product.image} alt={product.name} className="search-product-img" />
                    </div>
                    <div className="search-product-info">
                      <span className="search-product-name">{product.name}</span>
                      <span className="search-product-price">₹ {(parseFloat(product.price) * 20).toLocaleString('en-IN')}.00</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
