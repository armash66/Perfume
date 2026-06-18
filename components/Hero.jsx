"use client";

export default function Hero() {
  return (
    <section id="hero" className="hero">
      {/* Full-bleed product image layer */}
      <div className="hero-product-layer">
        <img src="/valentino_tree.png" alt="Valentino Born In Roma" className="hero-product-img" />
      </div>

      {/* Left editorial overlay */}
      <div className="hero-editorial">
        {/* Large stacked title */}
        <div className="hero-title-block">
          <h1 className="hero-title">
            <span className="title-line title-new">NEW</span>
            <span className="title-line title-collection">COLLECTION</span>
          </h1>

        </div>

        {/* Description + action buttons */}
        <div className="hero-info">
          <p className="hero-description">
            Born In Roma is a refined fragrance where the delicate touch
            of jasmine and the juiciness of blackcurrant blend with the warm depth
            of woody vetiver, creating a harmonious and memorable trail that
            embodies elegance and the power of nature.
          </p>
          <div className="hero-actions">
            <button className="btn btn-explore" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore <span className="btn-arrow">↗</span>
            </button>
            <button className="btn btn-bestseller" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>
              Best Seller
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
