"use client";

export default function Authenticity() {
  return (
    <section className="auth-section">
      <div className="auth-card">
        {/* Left column */}
        <div className="auth-left">
          <span className="auth-eyebrow">AUTHENTICITY PROMISE</span>
          <h2 className="auth-title">Decanted exclusively from original, sealed retail bottles.</h2>
          <p className="auth-desc">
            We never use refills. Every decant is hand-filled, labeled, and sealed to preserve the exact character of the fragrance you'd experience from a full bottle.
          </p>
          
          <div className="auth-badges">
            <div className="auth-badge">
              <span className="badge-name">Originals</span>
              <span className="badge-sub">VERIFIED</span>
            </div>
            <div className="auth-badge">
              <span className="badge-name">Hand-filled</span>
              <span className="badge-sub">SMALL-BATCH</span>
            </div>
            <div className="auth-badge">
              <span className="badge-name">Sanitized</span>
              <span className="badge-sub">CLEAN TOOLS</span>
            </div>
            <div className="auth-badge">
              <span className="badge-name">Leak-proof</span>
              <span className="badge-sub">SECURE</span>
            </div>
          </div>
        </div>

        {/* Right column (Certificate) */}
        <div className="auth-right">
          <div className="auth-certificate">
            <div className="cert-header">
              <span className="cert-label">CERTIFICATE</span>
              <div className="cert-icon">
                <i className="fas fa-shield-halved"></i>
              </div>
            </div>
            
            <h4 className="cert-title">Original Source Guarantee</h4>
            <p className="cert-desc">
              Each decant is sourced from verified retail stock and checked before dispatch.
            </p>
            
            <ul className="cert-list">
              <li>
                <i className="fas fa-circle-check"></i> Retail bottle verification
              </li>
              <li>
                <i className="fas fa-circle-check"></i> Batch-tracked decanting
              </li>
              <li>
                <i className="fas fa-circle-check"></i> Tamper-safe sealing
              </li>
            </ul>
            
            <p className="cert-verified">VERIFIED BY DECANT ATELIER</p>
          </div>
        </div>
      </div>
    </section>
  );
}
