"use client";

export default function Footer({ onNavigate }) {
  const handlePolicyClick = (e, id) => {
    e.preventDefault();
    window.location.hash = id;
    if (onNavigate) onNavigate('policies');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHomeLinkClick = (e, id) => {
    e.preventDefault();
    window.location.hash = id;
    if (id === 'collection' || id === 'shop') {
      if (onNavigate) onNavigate('shop');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (onNavigate) onNavigate('home');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <footer id="contact" className="footer">
      <div className="footer-main">
        {/* Col 1: Brand */}
        <div className="footer-brand">
          <span className="footer-logo">Decant Atelier</span>
          <p className="footer-tagline">
            Independent perfume decanting service in India. Hand-poured trial sizes from genuine sealed bottles.
          </p>
        </div>

        {/* Col 2: Explore */}
        <div className="footer-col">
          <h4 className="footer-col-title">EXPLORE</h4>
          <ul className="footer-links">
            <li>
              <a href="#collection" onClick={(e) => handleHomeLinkClick(e, 'collection')}>Shop All</a>
            </li>
            <li>
              <a href="#collection" onClick={(e) => handleHomeLinkClick(e, 'collection')}>Featured Brands</a>
            </li>
            <li>
              <a href="#collection" onClick={(e) => handleHomeLinkClick(e, 'collection')}>New Arrivals</a>
            </li>
            <li>
              <a href="#collection" onClick={(e) => handleHomeLinkClick(e, 'collection')}>Best Sellers</a>
            </li>
          </ul>
        </div>

        {/* Col 3: Policies */}
        <div className="footer-col">
          <h4 className="footer-col-title">POLICIES</h4>
          <ul className="footer-links">
            <li>
              <a href="#authenticity" onClick={(e) => handlePolicyClick(e, 'authenticity')}>
                Authenticity &amp; Sourcing
              </a>
            </li>
            <li>
              <a href="#about" onClick={(e) => handlePolicyClick(e, 'about')}>
                About Us
              </a>
            </li>
            <li>
              <a href="#shipping" onClick={(e) => handlePolicyClick(e, 'shipping')}>
                Shipping Policy
              </a>
            </li>
            <li>
              <a href="#returns" onClick={(e) => handlePolicyClick(e, 'returns')}>
                Return Policy
              </a>
            </li>
            <li>
              <a href="#terms" onClick={(e) => handlePolicyClick(e, 'terms')}>
                Terms &amp; Conditions
              </a>
            </li>
            <li>
              <a href="#privacy" onClick={(e) => handlePolicyClick(e, 'privacy')}>
                Privacy Policy
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
              <span>+91 97681 88453</span>
            </li>
            <li>
              <i className="fas fa-envelope"></i>
              <span>orders@decantatelier.in</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="footer-disclaimer">
        <p>
          <strong>Brand Disclaimer:</strong> Decant Atelier is an independent perfume decanting service. We are not affiliated with, endorsed by, sponsored by, or officially connected to any of the fragrance houses or brands referenced on this site. All trademarks, brand names, and product names are the property of their respective owners and are used solely to identify the original fragrance from which a decant is poured. Vials, labels, and packaging are produced by Decant Atelier and are not the brand's official packaging.
        </p>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>&copy; 2026 Decant Atelier. All rights reserved.</p>
        <div className="footer-bottom-links">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
      </div>
    </footer>
  );
}
