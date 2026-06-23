import './Hero.css';

export default function Hero() {
  const handleScrollToCollection = () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="hero">
      {/* Full-bleed product image (background layer) */}
      <div className="hero-image-layer">
        <img
          src="/valentino_uomo_intense.png"
          alt="Valentino Born In Roma Uomo Intense — luxury fragrance campaign"
          className="hero-product-img"
          loading="eager"
        />
        <div className="hero-image-vignette" />
      </div>

      {/* Container to align left edge with the navbar grid */}
      <div className="hero-container">
        {/* Left editorial content overlay */}
        <div className="hero-content">
          <div className="hero-content-inner">
            {/* Eyebrow */}
            <span className="hero-eyebrow">EST. 2026 &bull; LUXURY FRAGRANCES</span>

            {/* Headline */}
            <div className="hero-headline">
              <h1>
                <span className="headline-line" style={{ color: "var(--hero-text)" }}>Rare Fragrances</span>
              </h1>
              <p className="headline-sub">Perfectly Yours</p>
            </div>

            {/* Description */}
            <p className="hero-description">
              Discover our curated collection of niche and luxury fragrances — each bottle a story, each note a memory waiting to be made.
            </p>

            {/* Trust indicators */}
            <div className="hero-trust">
              <div className="trust-item">
                <span className="trust-value">100%</span>
                <span className="trust-label">Verified Originals</span>
              </div>
              <div className="trust-divider" />
              <div className="trust-item">
                <span className="trust-value">5 / 8 / 10 ml</span>
                <span className="trust-label">Trial Sizes</span>
              </div>
              <div className="trust-divider" />
              <div className="trust-item">
                <span className="trust-value">Pan-India</span>
                <span className="trust-label">Delivery</span>
              </div>
            </div>

            {/* CTA */}
            <div className="hero-cta">
              <button 
                className="cta-primary" 
                onClick={() => { window.location.hash = 'shop?category=all'; }}
              >
                Explore Collection
              </button>
              <button 
                className="cta-secondary" 
                onClick={() => { window.location.hash = 'shop?category=decants'; }}
              >
                Fair Price Decants
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
