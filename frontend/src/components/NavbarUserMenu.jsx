import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, useAuth, useClerk } from '@clerk/clerk-react';
import { CartStore } from '../utils/store.js';
import { clearCart } from '../utils/cartHelper.js';
import { API_BASE_URL } from '../utils/config.js';

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function NavbarUserMenu({ mode, handleLinkClick, setIsMobileMenuOpen }) {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const [dbUser, setDbUser] = useState(null);

  // Hook 1: Sync Clerk Auth state to local CartStore
  useEffect(() => {
    if (!authLoaded) return;
    CartStore.setAuthenticated(isSignedIn);
    if (authLoaded && !isSignedIn) {
      clearCart();
    }
  }, [authLoaded, isSignedIn]);

  // Hook 2: Fetch and load DB profile (Declared unconditionally BEFORE early returns)
  useEffect(() => {
    async function fetchProfile() {
      if (!isSignedIn) {
        setDbUser(null);
        return;
      }
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const profileData = await res.json();
          setDbUser(profileData);
        }
      } catch (err) {
        console.error('NavbarUserMenu failed to fetch user profile:', err);
      }
    }
    fetchProfile();
  }, [isSignedIn, getToken]);

  const handleSignInClick = (e) => {
    if (e) e.preventDefault();
    if (clerk && typeof clerk.openSignIn === 'function') {
      if (setIsMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
      clerk.openSignIn();
    } else {
      console.warn("Clerk is not fully initialized yet.");
    }
  };

  const handleSignOutClick = (e) => {
    if (e) e.preventDefault();
    CartStore.setAuthenticated(false);
    clearCart();
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
    if (clerk && typeof clerk.signOut === 'function') {
      clerk.signOut({ redirectUrl: '/' });
    }
  };

  // Early return check (Unconditionally placed AFTER all React Hook declarations)
  if (!authLoaded) {
    if (mode === 'desktop') {
      return (
        <button className="nav-icon-btn nav-profile-btn" onClick={handleSignInClick} title="Login" aria-label="Login">
          <UserIcon className="nav-profile-svg" />
        </button>
      );
    }
    return (
      <>
        <div className="mobile-drawer-divider" />
        <li>
          <a href="#" onClick={handleSignInClick}>Log In</a>
        </li>
      </>
    );
  }

  if (mode === 'desktop') {
    return (
      <>
        <SignedOut>
          <button className="nav-icon-btn nav-profile-btn" onClick={handleSignInClick} title="Login" aria-label="Login">
            <UserIcon className="nav-profile-svg" />
          </button>
        </SignedOut>
        <SignedIn>
          <a href="#profile" onClick={(e) => handleLinkClick(e, 'profile')} className="nav-icon-btn nav-profile-btn" title="My Profile" aria-label="My Profile" style={{ display: 'flex', alignItems: 'center' }}>
            <UserIcon className="nav-profile-svg" />
          </a>
        </SignedIn>
      </>
    );
  }

  // Mobile mode
  return (
    <>
      <SignedIn>
        <div className="mobile-drawer-divider" />
        <span className="mobile-drawer-section-title">My Account</span>
        <li><a href="#profile?tab=profile" onClick={(e) => handleLinkClick(e, 'profile?tab=profile')}>Profile Details</a></li>
        <li><a href="#profile?tab=orders" onClick={(e) => handleLinkClick(e, 'profile?tab=orders')}>My Orders</a></li>
        <li><a href="#profile?tab=addresses" onClick={(e) => handleLinkClick(e, 'profile?tab=addresses')}>Manage Addresses</a></li>
        <li><a href="#profile?tab=security" onClick={(e) => handleLinkClick(e, 'profile?tab=security')}>Account Security</a></li>
        {dbUser?.role === 'ADMIN' && (
          <li><a href="#admin" onClick={(e) => handleLinkClick(e, 'admin')} style={{ color: '#2563eb', fontWeight: 'bold' }}>Admin Console</a></li>
        )}
        <li>
          <a href="#" onClick={handleSignOutClick}>Log Out</a>
        </li>
      </SignedIn>
      <SignedOut>
        <div className="mobile-drawer-divider" />
        <li>
          <a href="#" onClick={handleSignInClick}>Log In</a>
        </li>
      </SignedOut>
    </>
  );
}
