import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLaunchCountdown } from '../hooks/useLaunchCountdown';
import { SALE_START_DATE, SALE_END_DATE, CAMPAIGN_PHASE } from '../utils/launchPricing';

export default function LaunchWelcomePopup() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const { phase, remaining } = useLaunchCountdown(SALE_START_DATE, SALE_END_DATE);

  useEffect(() => {
    if (phase === CAMPAIGN_PHASE.POST_LAUNCH) {
      setShow(false);
      return;
    }

    const seenKey = phase === CAMPAIGN_PHASE.PRE_LAUNCH
      ? 'decant_launch_popup_seen_prelaunch'
      : 'decant_launch_popup_seen_live';

    const alreadySeen = localStorage.getItem(seenKey);
    // Dev override: always show the popup on refresh during local development
    if (!alreadySeen || import.meta.env.DEV) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [phase]);

  if (!show || phase === CAMPAIGN_PHASE.POST_LAUNCH) return null;

  const handleClose = () => {
    const seenKey = phase === CAMPAIGN_PHASE.PRE_LAUNCH
      ? 'decant_launch_popup_seen_prelaunch'
      : 'decant_launch_popup_seen_live';
    localStorage.setItem(seenKey, 'true');
    setShow(false);
  };

  const handleExplore = () => {
    handleClose();
    navigate('/shop');
  };

  // Format countdown string: hh:mm:ss or days
  const countdownString = (() => {
    if (!remaining || remaining.expired) return '';
    const { days, hours, minutes, seconds } = remaining;
    const pad = (n) => String(n).padStart(2, '0');
    if (days > 0) {
      return `${days}d : ${pad(hours)}h : ${pad(minutes)}m`;
    }
    return `${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
  })();

  const isPreLaunch = phase === CAMPAIGN_PHASE.PRE_LAUNCH;

  return (
    <div className="launch-popup-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="launch-popup-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Icon */}
        <button className="launch-popup-close-btn" onClick={handleClose} aria-label="Close modal">
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Logo Image */}
        <div className="launch-popup-logo-container">
          <img
            src="/decantatelierlogo.png"
            alt="Decant Atelier Logo"
            className="launch-popup-logo-img"
          />
        </div>

        {/* Brand Header */}
        <span className="launch-popup-eyebrow">DE C A N T   A T E L I E R</span>

        {/* Title */}
        <h2 className="launch-popup-title">
          {isPreLaunch ? 'A New Fragrance Experience Awaits' : 'Welcome to Decant Atelier'}
        </h2>

        {/* Short Editorial Divider */}
        <div className="launch-popup-divider" />

        {/* Body Text */}
        <p className="launch-popup-body">
          {isPreLaunch ? (
            <>
              Welcome to Decant Atelier. Our Launch Collection officially opens on
              <strong className="launch-popup-highlight"> Sunday at 2:00 PM IST</strong>.
              <br />
              For the first 36 hours after launch, exclusive introductory pricing will be available.
            </>
          ) : (
            <>
              Our Launch Collection is now live.
              <br /><br />
              To celebrate our launch, enjoy exclusive introductory pricing for the next 36 hours. Discover our curated collection while the launch event is live.
            </>
          )}
        </p>

        {/* Countdown Box */}
        <div className="launch-popup-timer-box">
          <span className="launch-popup-timer-label">
            {isPreLaunch ? 'Launching In' : 'Launch Pricing Ends In'}
          </span>
          <span className="launch-popup-timer-value">{countdownString}</span>
        </div>

        {/* Buttons Row */}
        <div className="launch-popup-btn-row">
          <button className="launch-popup-btn-primary" onClick={handleExplore}>
            Explore Collection
          </button>
          <button className="launch-popup-btn-secondary" onClick={handleClose}>
            Close
          </button>
        </div>

        {/* Subtle Tagline */}
        <span className="launch-popup-tagline">Curated Luxury Fragrance Decants</span>
      </div>
    </div>
  );
}
