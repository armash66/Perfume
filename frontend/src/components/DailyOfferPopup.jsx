import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, sanitizeImageUrl } from '../utils/config.js';

const CTA_DESTINATIONS = {
  shop: '/shop',
  'best-sellers': '/shop?category=best-sellers',
  decants: '/shop?category=decants',
  'gift-sets': '/shop?category=gift-sets',
  collections: '/shop',
};

function shouldShowPopup(displayMode) {
  if (displayMode === 'never') return false;
  if (displayMode === 'always') return true;
  if (displayMode === 'once_per_session') {
    return !sessionStorage.getItem('campaignShown');
  }
  // once_per_day (default)
  const lastShown = localStorage.getItem('lastPopupDate');
  return lastShown !== new Date().toDateString();
}

function markPopupShown(displayMode) {
  if (displayMode === 'once_per_session') {
    sessionStorage.setItem('campaignShown', '1');
  } else if (displayMode !== 'always') {
    localStorage.setItem('lastPopupDate', new Date().toDateString());
  }
}

export default function DailyOfferPopup() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    async function fetchCampaign() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/campaigns/active`);
        if (!res.ok || res.status === 204) return;
        const data = await res.json();
        if (!data || !data.id) return;
        if (shouldShowPopup(data.displayMode || 'once_per_day')) {
          setCampaign(data);
          setShow(true);
        }
      } catch (err) {
        console.warn('Campaign fetch failed, using default popup suppressed.', err);
      }
    }
    fetchCampaign();
  }, []);

  useEffect(() => {
    if (!show) return;
    // Countdown to midnight
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diffMs = midnight - now;
      if (diffMs <= 0) { setTimeLeft('00:00:00'); return; }
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [show]);

  const handleClose = () => {
    if (campaign) markPopupShown(campaign.displayMode || 'once_per_day');
    setShow(false);
  };

  const handleClaim = () => {
    if (campaign) markPopupShown(campaign.displayMode || 'once_per_day');
    setShow(false);
    const dest = campaign?.ctaDestination || 'shop';
    let path = CTA_DESTINATIONS[dest] || dest;
    if (path.startsWith('#')) {
      path = '/' + path.replace('#', '');
    }
    navigate(path);
  };

  if (!show || !campaign) return null;

  return (
    show && (
      <div
        style={styles.overlay}
        className="campaign-popup-overlay"
      >
        <div
          style={styles.card}
          className="campaign-popup-card"
        >
          {/* Close */}
          <button onClick={handleClose} style={styles.closeBtn} aria-label="Close popup">×</button>

          {/* Accent bar */}
          <div style={styles.accentBar}>
            {campaign.badge || 'TODAY\'S SPECIAL OFFER'}
          </div>

          {/* Content */}
          <div style={styles.content} className="campaign-popup-content">
            {/* Image */}
            {campaign.imageUrl && (
              <div style={styles.imageCol} className="campaign-popup-img-col">
                <img
                  src={sanitizeImageUrl(campaign.imageUrl)}
                  alt={campaign.title}
                  style={styles.productImg}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            )}

            {/* Info */}
            <div style={styles.infoCol} className="campaign-popup-info-col">
              <h2 style={styles.title}>{campaign.title}</h2>
              {campaign.subheading && (
                <p style={styles.tagline}>{campaign.subheading}</p>
              )}
              {campaign.badge && (
                <div style={styles.discount}>{campaign.badge}</div>
              )}
              {campaign.displayPrice && (
                <p style={styles.price}>{campaign.displayPrice}</p>
              )}

              {/* Countdown */}
              <div style={styles.timerContainer}>
                <span style={styles.timerLabel}>Offer ends in:</span>
                <span style={styles.timerValue}>{timeLeft}</span>
              </div>

              {/* CTAs */}
              <div style={styles.btnRow} className="campaign-popup-btn-row">
                <button onClick={handleClaim} style={styles.claimBtn}>
                  {campaign.ctaText || 'Shop Now'}
                </button>
                <button onClick={handleClose} style={styles.notNowBtn}>Not Now</button>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes popupFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes popupScaleIn {
            from { opacity: 0; transform: scale(0.92) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .campaign-popup-overlay {
            animation: popupFadeIn 0.3s forwards ease-out;
          }
          .campaign-popup-card {
            animation: popupScaleIn 0.35s forwards cubic-bezier(0.16, 1, 0.3, 1);
          }
          @media (max-width: 640px) {
            .campaign-popup-content { flex-direction: column !important; padding: 1.5rem !important; gap: 1.25rem !important; }
            .campaign-popup-img-col { flex: 0 0 auto !important; }
            .campaign-popup-info-col { width: 100% !important; align-items: center !important; text-align: center !important; }
            .campaign-popup-btn-row { flex-direction: column !important; width: 100% !important; }
          }
        `}</style>
      </div>
    )
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '1rem',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-lg)',
    width: '100%', maxWidth: '750px',
    position: 'relative', overflow: 'hidden',
    boxShadow: '0 32px 64px rgba(0,0,0,0.7)',
    display: 'flex', flexDirection: 'column',
  },
  closeBtn: {
    position: 'absolute', top: '12px', right: '18px',
    background: 'transparent', border: 'none',
    color: 'var(--color-text)', fontSize: '2rem',
    cursor: 'pointer', zIndex: 10, lineHeight: 1, opacity: 0.6,
    transition: 'opacity 0.2s',
  },
  accentBar: {
    backgroundColor: 'var(--color-accent2)',
    color: '#0a0a0a', textAlign: 'center',
    padding: '8px 16px',
    fontFamily: 'var(--font-display)', fontWeight: 500,
    fontSize: '0.8rem', letterSpacing: '0.25em',
    borderBottom: '1px solid var(--color-accent)',
  },
  content: {
    display: 'flex', flexDirection: 'row', flexWrap: 'wrap',
    padding: '2.5rem', gap: '2.5rem', alignItems: 'center',
  },
  imageCol: { flex: '1 1 220px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  productImg: { width: '100%', maxHeight: '250px', objectFit: 'contain', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))' },
  infoCol: { flex: '1.2 1 280px', display: 'flex', flexDirection: 'column', gap: '0.8rem' },
  title: { fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', color: 'var(--color-text)', margin: 0, lineHeight: 1.1 },
  tagline: { fontStyle: 'italic', fontSize: 'var(--text-sm)', color: 'var(--color-text)', opacity: 0.85, margin: 0 },
  discount: {
    display: 'inline-block', alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,169,110,0.1)',
    border: '1px solid var(--color-accent)', color: 'var(--color-accent)',
    padding: '5px 12px', borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em',
  },
  price: { fontSize: 'var(--text-sm)', color: 'var(--color-accent)', fontWeight: 700, margin: 0 },
  timerContainer: {
    display: 'flex', alignItems: 'center', gap: '0.8rem',
    backgroundColor: 'var(--color-surface2)', padding: '10px 16px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginTop: '0.25rem',
  },
  timerLabel: { fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.05em' },
  timerValue: { fontFamily: 'monospace', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-accent)' },
  btnRow: { display: 'flex', gap: '12px', marginTop: '0.6rem' },
  claimBtn: {
    backgroundColor: 'var(--color-accent)', color: '#0a0a0a',
    border: 'none', borderRadius: 'var(--radius-md)',
    padding: '12px 24px', fontSize: 'var(--text-xs)',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
    cursor: 'pointer', transition: 'background-color 0.2s', flex: 1,
  },
  notNowBtn: {
    backgroundColor: 'transparent', color: 'var(--color-muted)',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    padding: '12px 20px', fontSize: 'var(--text-xs)',
    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
    cursor: 'pointer', transition: 'all 0.2s',
  },
};
