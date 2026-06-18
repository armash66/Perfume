"use client";

export default function Gifting({ onSelectCategory, onNavigate }) {
  return (
    <section id="gifting" className="gift-section">
      <div className="gift-container">
        {/* Section Header */}
        <div className="gift-header">
          <span className="gift-eyebrow">THE ART OF GIFTING</span>
          <h2 className="gift-title">Because Some Gifts Linger</h2>
          <div className="gift-gold-divider" />
          <p className="gift-subtitle">
            Every fragrance tells a story. Find the one that tells theirs — curated for him, crafted for her.
          </p>
        </div>

        {/* Gift Grid */}
        <div className="gift-grid">
          {/* Card: Him */}
          <div className="gift-card gift-him">
            <div className="gift-card-bg">
              <img src="/him_perfume.png" alt="Shop For Him" className="gift-card-img" />
            </div>
            <div className="gift-card-overlay"></div>
            <div className="gift-card-content">
              <h3 className="gift-card-title">Shop For Him</h3>
              <a 
                href="#collection" 
                className="gift-explore-btn"
                onClick={(e) => {
                  e.preventDefault();
                  if (onSelectCategory) onSelectCategory('him');
                  if (onNavigate) onNavigate('shop');
                  window.location.hash = 'collection';
                  setTimeout(() => {
                    const element = document.getElementById('collection');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
              >
                EXPLORE &nbsp;→
              </a>
            </div>
          </div>

          {/* Card: Her */}
          <div className="gift-card gift-her">
            <div className="gift-card-bg">
              <img src="/her_perfume.png" alt="Shop For Her" className="gift-card-img" />
            </div>
            <div className="gift-card-overlay"></div>
            <div className="gift-card-content">
              <h3 className="gift-card-title">Shop For Her</h3>
              <a 
                href="#collection" 
                className="gift-explore-btn"
                onClick={(e) => {
                  e.preventDefault();
                  if (onSelectCategory) onSelectCategory('her');
                  if (onNavigate) onNavigate('shop');
                  window.location.hash = 'collection';
                  setTimeout(() => {
                    const element = document.getElementById('collection');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
              >
                EXPLORE &nbsp;→
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
