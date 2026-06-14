import './Hero.css';

export default function Hero() {
  return (
    <section id="hero" className="hero">
      {/* Background subtle radial glow */}
      <div className="hero-glow" />
      
      <div className="hero-content">
        {/* Left Side: Editorial Typography & Image Collages */}
        <div className="editorial-left">
          <div className="editorial-collage-container">
            {/* Word: NEW */}
            <div className="editorial-word word-new">
              <span className="letter">N</span>
              <span className="letter">E</span>
              <span className="letter">W</span>
            </div>

            {/* Word: COLLECTION */}
            <div className="editorial-word word-collection">
              <span className="letter">C</span>
              <span className="letter">O</span>
              <span className="letter">L</span>
              <span className="letter">L</span>
              <span className="letter">E</span>
              <span className="letter">C</span>
              <span className="letter">T</span>
              <span className="letter">I</span>
              <span className="letter">O</span>
              <span className="letter">N</span>
            </div>

            {/* Arch Frame cutout */}
            <div className="editorial-frame arch-frame">
              <img src="/editorial_model.png" alt="Model Showcase" className="frame-img" />
            </div>

            {/* Circle Frame cutout */}
            <div className="editorial-frame circle-frame">
              <img src="/editorial_ingredients.png" alt="Fragrance Notes" className="frame-img" />
            </div>
          </div>

          {/* Description Paragraph */}
          <div className="editorial-description-container">
            <p className="editorial-description">
              Born In Roma is a refined fragrance where the delicate touch of jasmine and the juiciness of blackcurrant blend with the warm depth of woody vetiver, creating a harmonious and memorable trail that embodies elegance and the power of nature.
            </p>
          </div>
        </div>

        {/* Right Side: Valentino Perfume with Golden Branch on Stone Slab */}
        <div className="editorial-right">
          <div className="main-product-showcase">
            <img src="/valentino_tree.png" alt="Valentino Born In Roma" className="showcase-product-img" />
          </div>
        </div>
      </div>
    </section>
  );
}
