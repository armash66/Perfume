import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Footer.css';
import { API_BASE_URL } from '../utils/config.js';

export default function Footer({ onNavigate }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    storeName: 'DECANT ATELIER',
    supportPhone: '+91 98205 83776',
    supportEmail: 'faheem@decantatelier.in'
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings({
            storeName: data.storeName || 'DECANT ATELIER',
            supportPhone: data.supportPhone || '+91 98205 83776',
            supportEmail: data.supportEmail || 'faheem@decantatelier.in'
          });
        }
      } catch (err) {
        console.error('Failed to fetch settings for footer:', err);
      }
    }
    fetchSettings();
  }, []);

  const policyRouteMap = {
    about: '/about',
    authenticity: '/authenticity',
    shipping: '/shipping',
    returns: '/refund',
    terms: '/terms',
    privacy: '/privacy',
  };

  const handlePolicyClick = (e, id) => {
    e.preventDefault();
    const route = policyRouteMap[id] || '/about';
    navigate(route);
  };

  const handleHomeLinkClick = (e, id) => {
    e.preventDefault();
    if (id === 'collection' || id === 'shop') {
      navigate('/shop');
    } else {
      navigate('/');
      // For scroll-anchors on home page, wait for navigation then scroll
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleDiscoverClick = (e, filterKey) => {
    e.preventDefault();
    navigate(`/shop?category=${filterKey}`);
  };

  return (
    <footer id="contact" className="footer">
      <div className="footer-main">
        {/* Col 1: Brand */}
        <div className="footer-brand">
          <span className="footer-logo">{settings.storeName.toUpperCase()}</span>
          <p className="footer-tagline">
            Independent perfume decanting service in India. Hand-poured trial sizes from genuine sealed bottles.
          </p>
        </div>

        {/* Col 2: Explore */}
        <div className="footer-col">
          <h4 className="footer-col-title">EXPLORE</h4>
          <ul className="footer-links">
            <li>
              <a href="/shop?category=bestsellers" onClick={(e) => handleDiscoverClick(e, 'bestsellers')}>Best Sellers</a>
            </li>
            <li>
              <a href="/shop?category=decants" onClick={(e) => handleDiscoverClick(e, 'decants')}>Decants</a>
            </li>
            <li>
              <a href="/shop?category=newarrivals" onClick={(e) => handleDiscoverClick(e, 'newarrivals')}>New Arrivals</a>
            </li>
            <li>
              <a href="/shop?category=sets" onClick={(e) => handleDiscoverClick(e, 'sets')}>Gift Sets</a>
            </li>
          </ul>
        </div>

        {/* Col 3: Policies */}
        <div className="footer-col">
          <h4 className="footer-col-title">POLICIES</h4>
          <ul className="footer-links">
            <li>
              <a href="/about" onClick={(e) => handlePolicyClick(e, 'about')}>About Decant Atelier</a>
            </li>
            <li>
              <a href="/authenticity" onClick={(e) => handlePolicyClick(e, 'authenticity')}>
                Authenticity &amp; Sourcing
              </a>
            </li>
            <li>
              <a href="/about" onClick={(e) => handlePolicyClick(e, 'about')}>FAQ</a>
            </li>
            <li>
              <a href="/shipping" onClick={(e) => handlePolicyClick(e, 'shipping')}>
                Shipping Policy
              </a>
            </li>
            <li>
              <a href="/refund" onClick={(e) => handlePolicyClick(e, 'returns')}>
                Return Policy
              </a>
            </li>
            <li>
              <a href="/privacy" onClick={(e) => handlePolicyClick(e, 'privacy')}>
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="/terms" onClick={(e) => handlePolicyClick(e, 'terms')}>
                Terms &amp; Conditions
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Contact */}
        <div className="footer-col">
          <h4 className="footer-col-title">CONTACT</h4>
          <ul className="footer-contact-list">
            <li>
              <i className="fas fa-phone"></i>
              <span>{settings.supportPhone}</span>
            </li>
            <li>
              <i className="fas fa-envelope"></i>
              <span>{settings.supportEmail}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="footer-disclaimer">
        <p>
          <strong><b>Brand Disclaimer:</b></strong> Decant Atelier is an independent perfume decanting service. We are not affiliated with, endorsed by, sponsored by, or officially connected to any of the fragrance houses or brands referenced on this site. All trademarks, brand names, and product names are the property of their respective owners and are used solely to identify the original fragrance from which a decant is poured. Vials, labels, and packaging are produced by Decant Atelier and are not the brand's official packaging.
        </p>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
      </div>
    </footer>
  );
}
