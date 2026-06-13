import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import './Navbar.css';

// SVG outline matching the exact shopping bag in the design mockup
const ShoppingBagIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

export default function Navbar({ onNavigate, activePage, onSelectCategory, activeCategory }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(true);

  // Sync theme with HTML body attribute
  useEffect(() => {
    document.body.setAttribute('data-theme', isThemeDark ? 'dark' : 'light');
  }, [isThemeDark]);

  const handleLinkClick = (e, hash) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    
    const policies = ['authenticity', 'about', 'shipping', 'returns', 'terms', 'privacy'];
    if (policies.includes(hash)) {
      window.location.hash = hash;
      if (onNavigate) onNavigate('policies');
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

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand Logo */}
        <div className="logo-container" onClick={(e) => handleLinkClick(e, '')}>
          <span className="brand-name">DECANT ATELIER</span>
        </div>

        {/* Desktop Menu */}
        <ul className="nav-menu">
          <li className="nav-item dropdown">
            <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')} className="nav-link">
              SHOP <i className="fas fa-chevron-down nav-chevron"></i>
            </a>
            <ul className="dropdown-menu">
              <li><a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>All Perfumes</a></li>
              <li><a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>Best Sellers</a></li>
              <li><a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>New Arrivals</a></li>
              <li><a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>Limited Edition</a></li>
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

          {/* Gifting Dropdown */}
          <li className="nav-item dropdown">
            <a href="#gifting" onClick={(e) => handleLinkClick(e, 'gifting')} className="nav-link">
              GIFTING <i className="fas fa-chevron-down"></i>
            </a>
            <ul className="dropdown-menu">
              <li><a href="#gifting" onClick={(e) => handleLinkClick(e, 'gifting')}>Shop For Him</a></li>
              <li><a href="#gifting" onClick={(e) => handleLinkClick(e, 'gifting')}>Shop For Her</a></li>
            </ul>
          </li>

          <li className="nav-item">
            <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')} className="nav-link">
              CREATORS
            </a>
          </li>

          <li className="nav-item">
            <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')} className="nav-link">
              TRACK ORDER
            </a>
          </li>
        </ul>

        {/* Right Nav Icons / Search */}
        <div className="nav-right">
          <div className="search-container">
            <i className="fas fa-search search-icon"></i>
            <input type="text" className="search-input" placeholder="Search perfumes, brands, notes..." />
          </div>
          
          <SignedOut>
            <SignInButton mode="modal">
              <button className="nav-login-btn">LOGIN</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          
          <a href="#" className="nav-icon cart-icon" onClick={(e) => e.preventDefault()}>
            <ShoppingBagIcon className="w-5 h-5 nav-bag-icon" />
            <span className="cart-count">0</span>
          </a>

          <button 
            className="theme-toggle" 
            onClick={() => setIsThemeDark(!isThemeDark)} 
            title="Toggle theme"
          >
            <i className={isThemeDark ? "fas fa-sun" : "fas fa-moon"}></i>
          </button>
        </div>

        {/* Hamburger Menu Icon */}
        <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-list">
          <li>
            <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>
              SHOP ALL
            </a>
          </li>
          <li>
            <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>
              CATEGORIES
            </a>
          </li>
          <li>
            <a href="#gifting" onClick={(e) => handleLinkClick(e, 'gifting')}>
              GIFTING
            </a>
          </li>
          <li>
            <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>
              CREATORS
            </a>
          </li>
          <li>
            <a href="#collection" onClick={(e) => handleLinkClick(e, 'collection')}>
              TRACK ORDER
            </a>
          </li>
          <li>
            <hr className="mobile-divider" />
          </li>
          <li>
            <div className="mobile-search">
              <input type="text" placeholder="Search..." />
              <button><i className="fas fa-search"></i></button>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}
