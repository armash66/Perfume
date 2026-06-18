"use client";

export default function Pricing() {
  const handleCtaClick = (e) => {
    e.preventDefault();
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="pricing-section">
      <div className="pricing-card">
        {/* Top Header */}
        <div className="pricing-top">
          <span className="pricing-eyebrow">FAIR PRICING</span>
          <h2 className="pricing-title">Pay the true cost of a decant.</h2>
          <p className="pricing-subtitle">If a 100ml bottle is ₹5,000, a 10ml decant should be ₹500.</p>
        </div>

        {/* Pricing Comparison Table */}
        <div className="pricing-table">
          <div className="pricing-col">
            <span className="pricing-col-label">BOTTLE</span>
            <span className="pricing-amount">₹5,000</span>
            <span className="pricing-note">100ml retail</span>
          </div>
          
          <div className="pricing-arrow">
            <i className="fas fa-arrow-right"></i>
          </div>
          
          <div className="pricing-col">
            <span className="pricing-col-label">OTHERS</span>
            <span className="pricing-amount strikethrough">₹650–₹700</span>
            <span className="pricing-note">10ml decant</span>
          </div>
          
          <div className="pricing-arrow">
            <i className="fas fa-arrow-right"></i>
          </div>
          
          <div className="pricing-col highlight">
            <span className="pricing-col-label">OUR PRICE</span>
            <span className="pricing-amount our-price">₹500</span>
            <span className="pricing-note">10ml fair-price</span>
          </div>
        </div>

        {/* Footer info & CTA */}
        <div className="pricing-footer">
          <p>Transparent pricing so you can explore more scents without paying inflated margins.</p>
          <a href="#collection" onClick={handleCtaClick} className="pricing-cta">
            EXPLORE FAIR-PRICE DECANTS &nbsp;→
          </a>
        </div>
      </div>
    </section>
  );
}
