import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, useUser, SignOutButton, SignInButton } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../utils/toast';
import { collectionsData } from './SignatureCollection/CollectionData';
import { addToCart, clearCart } from '../utils/cartHelper';
import { CartStore } from '../utils/store.js';
import './ProfilePage.css';
import { API_BASE_URL } from '../utils/config.js';

const statusStyles = {
  PENDING: 'status-pending',
  CONFIRMED: 'status-confirmed',
  PROCESSING: 'status-processing',
  SHIPPED: 'status-shipped',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  const [dbUser, setDbUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const activeSection = useMemo(() => {
    const tab = searchParams.get('tab');
    return ['profile', 'orders', 'addresses', 'security'].includes(tab) ? tab : 'profile';
  }, [searchParams]);

  const setActiveSection = (sectionId) => {
    setSearchParams({ tab: sectionId });
  };

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Address form states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressFormData, setAddressFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const metrics = useMemo(() => {
    const completedOrders = orders.filter(o => o.status !== 'CANCELLED');
    const orderCount = orders.length;
    const lifetimeSpend = completedOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

    const notesCount = {};
    completedOrders.forEach(o => {
      o.orderItems?.forEach(item => {
        const staticProd = collectionsData.find(cp => cp.id === item.productId || cp.name === item.productName);
        if (staticProd && staticProd.notes) {
          staticProd.notes.forEach(note => {
            notesCount[note] = (notesCount[note] || 0) + item.quantity;
          });
        }
      });
    });

    const noteToFamily = {
      'Sandalwood': 'Woody', 'Cedarwood': 'Woody', 'Cedar': 'Woody', 'Vetiver': 'Woody', 
      'Oudwood': 'Woody', 'Amberwood': 'Woody', 'Driftwood': 'Woody', 'Oakmoss': 'Woody', 
      'Smoked Vetiver': 'Woody', 'Woody Accord': 'Woody',
      'Mint': 'Fresh', 'Grapefruit': 'Fresh', 'Lemon': 'Fresh', 'Mandarin': 'Fresh', 
      'Citron': 'Fresh', 'Marine Spray': 'Fresh', 'Aquatic Notes': 'Fresh', 'Bergamot': 'Fresh', 
      'Melon': 'Fresh', 'Tangerine': 'Fresh',
      'Cardamom': 'Spicy Oriental', 'Ginger': 'Spicy Oriental', 'Cinnamon': 'Spicy Oriental', 
      'Black Pepper': 'Spicy Oriental', 'Saffron': 'Spicy Oriental', 'Nutmeg': 'Spicy Oriental', 
      'Bitter Almond': 'Spicy Oriental', 'Spices': 'Spicy Oriental', 'Pimento': 'Spicy Oriental',
      'Cumin': 'Spicy Oriental', 'Ambergris': 'Spicy Oriental', 'Rare Spices': 'Spicy Oriental',
      'Warm Leather': 'Spicy Oriental', 'Leather': 'Spicy Oriental', 'Incense': 'Spicy Oriental',
      'Vanilla': 'Gourmand', 'Toffee': 'Gourmand', 'Dates': 'Gourmand', 'Praline': 'Gourmand', 
      'Coffee Accord': 'Gourmand', 'Gourmand Accord': 'Gourmand', 'Tonka Bean': 'Gourmand',
      'Bourbon Vanilla': 'Gourmand',
      'Jasmine': 'Floral', 'Orchid': 'Floral', 'Lavender': 'Floral', 'Tuberose': 'Floral', 
      'Heliotrope': 'Floral', 'Rose': 'Floral', 'Lily of the Valley': 'Floral', 'Floral Accord': 'Floral'
    };

    const familyCounts = {};
    Object.entries(notesCount).forEach(([note, count]) => {
      const family = noteToFamily[note] || 'Woody Amber';
      familyCounts[family] = (familyCounts[family] || 0) + count;
    });

    let favoriteFamily = 'Woody Amber';
    let maxCount = 0;
    Object.entries(familyCounts).forEach(([family, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteFamily = family;
      }
    });

    const lastOrder = [...orders]
      .filter(o => o.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    return {
      orderCount,
      lifetimeSpend,
      favoriteFamily: orders.length > 0 ? favoriteFamily : 'Scent Explorer',
      lastOrder
    };
  }, [orders]);

  const handleReorder = async (order) => {
    try {
      showToast('Initiating reorder...', 'info');
      const token = await getToken();
      
      for (const item of order.orderItems) {
        const staticProd = collectionsData.find(cp => cp.id === item.productId || cp.name === item.productName);
        if (staticProd) {
          const sizeOption = staticProd.sizes.find(s => s.size === item.size) || { 
            size: item.size, 
            price: parseFloat(item.priceAtPurchase), 
            variantId: item.variantId 
          };
          await addToCart(staticProd, sizeOption, item.quantity, token);
        }
      }
      showToast('All items added to bag!', 'success');
      navigate('/cart');
    } catch (err) {
      console.error('Reorder failed:', err);
      showToast('Failed to complete reorder request.', 'error');
    }
  };

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const token = await getToken();
      if (!token) return;

      // Profile details
      const profileRes = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setDbUser(profileData);
        setProfileForm({
          name: profileData.name || user?.fullName || '',
          phone: profileData.phone || ''
        });
      }

      // Addresses
      const addrRes = await fetch(`${API_BASE_URL}/api/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (addrRes.ok) {
        setAddresses(await addrRes.json());
      }

      // Orders
      const orderRes = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (orderRes.ok) {
        setOrders(await orderRes.json());
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchData();
    } else {
      setLoadingData(false);
    }
  }, [isSignedIn]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setSavingProfile(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setDbUser({ ...dbUser, name: updated.name, phone: updated.phone });
        setProfileSuccess('Profile details saved successfully.');
        setTimeout(() => setProfileSuccess(''), 3000);
      } else {
        const errData = await res.json();
        setProfileError(errData.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setProfileError('Failed to save profile changes.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressError('');
    setSavingAddress(true);
    try {
      const token = await getToken();
      const url = editingAddressId 
        ? `${API_BASE_URL}/api/addresses/${editingAddressId}` 
        : `${API_BASE_URL}/api/addresses`;
      const method = editingAddressId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(addressFormData)
      });

      if (res.ok) {
        const saved = await res.json();
        
        let updatedAddresses = [];
        if (editingAddressId) {
          updatedAddresses = addresses.map(a => 
            a.id === editingAddressId ? saved : (addressFormData.isDefault ? { ...a, isDefault: false } : a)
          );
        } else {
          updatedAddresses = [
            saved,
            ...addresses.map(a => addressFormData.isDefault ? { ...a, isDefault: false } : a)
          ];
        }
        updatedAddresses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        setAddresses(updatedAddresses);
        setShowAddressForm(false);
        setEditingAddressId(null);
        resetAddressForm();
      } else {
        const errData = await res.json();
        setAddressError(errData.error || 'Failed to save address.');
      }
    } catch (err) {
      console.error(err);
      setAddressError('Network error. Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  function resetAddressForm() {
    setAddressFormData({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      isDefault: false
    });
    setEditingAddressId(null);
  }

  const handleEditAddressClick = (addr) => {
    setEditingAddressId(addr.id);
    setAddressFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault
    });
    setShowAddressForm(true);
  };

  const handleDuplicateAddressClick = (addr) => {
    setEditingAddressId(null);
    setAddressFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      isDefault: false
    });
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAddresses(addresses.filter(a => a.id !== id));
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to delete address.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error. Failed to delete address.', 'error');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/addresses/${id}/default`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        const updatedAddresses = addresses.map(a => a.id === id ? updated : { ...a, isDefault: false });
        updatedAddresses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        setAddresses(updatedAddresses);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!authLoaded || !userLoaded) {
    return (
      <div className="profile-shell flex items-center justify-center min-h-screen bg-[#F7F3ED]">
        <div className="text-center font-body text-xs tracking-widest text-[#8B672F] uppercase animate-pulse">
          Loading Secure Account...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="profile-guest-shell min-h-screen bg-[#F7F3ED] flex items-center justify-center font-body px-4 select-none">
        <div className="max-w-md w-full text-center py-12 px-8 border border-black/5 bg-[#FEFCF9] shadow-sm">
          <span className="text-[0.62rem] font-bold tracking-[3px] text-[#8B672F] uppercase block mb-3">Atelier Session</span>
          <h2 className="font-heading text-3xl font-light text-[#1C1B18] tracking-wide mb-4">My Account</h2>
          <p className="text-xs text-black/60 leading-relaxed mb-8">
            Please sign in to view your dynamic order history, delivery details, and saved billing destinations.
          </p>
          <SignInButton mode="modal">
            <button 
              className="profile-btn-primary w-full py-3.5 text-[0.68rem]"
              style={{ color: '#FEFCF9' }}
            >
              Authenticate Session
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  const displayName = dbUser?.name || user.fullName || 'Fragrance Collector';
  const displayPhone = dbUser?.phone || (user.primaryPhoneNumber ? user.primaryPhoneNumber.phoneNumber : 'No phone linked');

  return (
    <div className="luxury-profile-container min-h-screen bg-[#F7F3ED] font-body text-[#1C1B18] pb-24 select-none">
      
      {/* Responsive Luxury Page Hero */}
      <section className="page-hero">
        <div className="page-hero-bg-text">COLLECTOR</div>
        <div className="page-hero-content">
          <span className="page-hero-eyebrow">Atelier Salon</span>
          <h1 className="page-hero-title">My Account</h1>
          <p className="page-hero-subtitle">
            Welcome back, {displayName}. Manage your shipping details, order history, and security settings.
          </p>
          <div className="page-hero-divider" />
        </div>
      </section>

      <main className="max-w-[1440px] mx-auto px-4 md:px-12 pt-12">

        <div className="luxury-profile-grid">
          
          {/* Left Navigation Sidebar */}
          <aside className="luxury-profile-sidebar">
            <nav className="flex flex-col gap-1.5">
              {[
                { id: 'profile', label: 'Profile Detail' },
                { id: 'orders', label: 'Order History' },
                { id: 'addresses', label: 'Saved Destinations' },
                { id: 'security', label: 'Account Settings' }
              ].map(sec => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSection(sec.id);
                      setShowAddressForm(false);
                      setEditingAddressId(null);
                    }}
                    className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                  >
                    {sec.label}
                  </button>
                );
              })}
              
              {dbUser?.role === 'ADMIN' && (
                <button
                  onClick={() => { navigate('/admin'); }}
                  className="nav-tab-btn admin-badge"
                >
                  Admin Console
                </button>
              )}

              <div className="h-px bg-black/8 my-3" />
              
              <SignOutButton redirectUrl="/">
                <button onClick={() => { CartStore.setAuthenticated(false); clearCart(); }} className="nav-tab-btn text-left text-[#8B672F] hover:text-[#1C1B18] w-full cursor-pointer">
                  Sign Out
                </button>
              </SignOutButton>
            </nav>
          </aside>

          {/* Right Content Area */}
          <section className="luxury-profile-content">
            <AnimatePresence mode="wait">
              
              {/* SECTION: PROFILE */}
              {activeSection === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="section-head pb-4 border-b border-black/8">
                    <h2 className="font-heading text-2xl font-light tracking-wide uppercase">Profile Information</h2>
                    <p className="text-xs text-black/45 font-body">Manage your basic registration profile and contact channels.</p>
                  </div>

                  {/* METRICS DASHBOARD GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
                    <div className="bg-[#FEFCF9] border border-black/5 p-5 flex flex-col justify-between">
                      <span className="text-[0.58rem] font-bold text-black/40 uppercase tracking-widest block mb-2">Total Scent Orders</span>
                      <span className="text-3xl font-light font-heading text-[#1C1B18]">{metrics.orderCount}</span>
                    </div>
                    <div className="bg-[#FEFCF9] border border-black/5 p-5 flex flex-col justify-between">
                      <span className="text-[0.58rem] font-bold text-black/40 uppercase tracking-widest block mb-2">Lifetime Investment</span>
                      <span className="text-3xl font-light font-heading text-[#8B672F]">₹{metrics.lifetimeSpend.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-[#FEFCF9] border border-black/5 p-5 flex flex-col justify-between">
                      <span className="text-[0.58rem] font-bold text-black/40 uppercase tracking-widest block mb-2">Olfactory Preference</span>
                      <span className="text-base font-semibold text-[#1C1B18] tracking-wide mt-1">{metrics.favoriteFamily}</span>
                    </div>
                  </div>

                  {/* QUICK REORDER BOX */}
                  {metrics.lastOrder && (
                    <div className="bg-[#FEFCF9] border border-black/8 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                      <div className="flex-1">
                        <span className="text-[0.55rem] font-bold tracking-[2px] text-[#8B672F] uppercase block mb-1">Quick Reorder</span>
                        <h4 className="font-heading text-base font-medium text-[#1C1B18] uppercase tracking-wider">Reorder Your Recent Selection</h4>
                        <p className="text-[0.72rem] text-black/60 mt-1 leading-relaxed">
                          Re-add the scents from order #{metrics.lastOrder.id.slice(-8).toUpperCase()} ({metrics.lastOrder.orderItems?.map(item => item.productName).join(', ')}) back to your bag.
                        </p>
                      </div>
                      <button
                        onClick={() => handleReorder(metrics.lastOrder)}
                        className="profile-btn-primary py-3 px-6 text-[0.68rem] w-full sm:w-auto"
                      >
                        Reorder Now
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div>
                      <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Full Name</span>
                      <p className="text-sm font-medium">{displayName}</p>
                    </div>
                    <div>
                      <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Email Address</span>
                      <p className="text-sm font-medium">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <div>
                      <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Phone Number</span>
                      <p className="text-sm font-medium">{displayPhone}</p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-black/8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1C1B18] mb-6">Edit Profile Details</h3>
                    
                    {profileSuccess && (
                      <div className="p-4 bg-[#8B672F]/10 text-[#8B672F] text-xs font-bold uppercase tracking-wider mb-6">
                        {profileSuccess}
                      </div>
                    )}
                    {profileError && (
                      <div className="p-4 bg-[#FF003C]/5 text-[#FF003C] text-xs font-bold uppercase tracking-wider mb-6">
                        {profileError}
                      </div>
                    )}

                    <form onSubmit={handleProfileSubmit} className="max-w-md space-y-6">
                      <div className="space-y-1">
                        <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">Name</label>
                        <input
                          type="text" required
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="luxury-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">Phone Number</label>
                        <input
                          type="text"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="luxury-input"
                          placeholder="e.g. +91 99999 99999"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="profile-btn-primary py-3 px-8 text-[0.68rem]"
                      >
                        {savingProfile ? 'Saving Details...' : 'Save Profile'}
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* SECTION: ORDERS */}
              {activeSection === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="section-head pb-4 border-b border-black/8">
                    <h2 className="font-heading text-2xl font-light tracking-wide uppercase">Order History</h2>
                    <p className="text-xs text-black/45 font-body">Track, verify, and view all items shipped or processed from Decant Atelier.</p>
                  </div>

                  {orders.length === 0 ? (
                    <div className="py-16 text-center bg-[#FEFCF9] border border-black/5 px-6">
                      <div className="text-3xl text-black/20 mb-4">✦</div>
                      <p className="text-xs text-black/50 leading-relaxed font-body">
                        No orders yet. Find your next signature scent.
                      </p>
                      <button
                        onClick={() => { navigate('/shop'); }}
                        className="profile-btn-primary mt-6 py-2.5 px-6 text-[0.65rem]"
                      >
                        Explore Collections
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map(order => {
                        const isExpanded = expandedOrderId === order.id;
                        const itemsSummary = order.orderItems?.map(item => `${item.productName} (${item.size})`).join(', ') || '';
                        
                        return (
                          <div 
                            key={order.id} 
                            className="bg-[#FEFCF9] border border-black/5 hover:border-black/10 p-6 shadow-sm transition-all duration-300"
                          >
                            {/* Card Header Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-4 border-b border-black/5 items-center">
                              <div>
                                <span className="text-[0.55rem] font-bold text-black/35 uppercase tracking-widest block mb-0.5">Order Reference</span>
                                <span className="text-xs font-bold text-[#1C1B18]">#{order.id.slice(-8).toUpperCase()}</span>
                              </div>
                              <div>
                                <span className="text-[0.55rem] font-bold text-black/35 uppercase tracking-widest block mb-0.5">Placed On</span>
                                <span className="text-xs text-black/60 font-medium">
                                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-8 justify-between sm:justify-end">
                                <div>
                                  <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block text-left sm:text-right">Total</span>
                                  <span className="text-sm font-bold text-[#B08A50]">₹{Number(order.total).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="text-left sm:text-right">
                                  <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-0.5">Status</span>
                                  <span className={`status-pill ${statusStyles[order.status] || 'status-pending'}`}>
                                    {order.status}
                                  </span>
                                </div>
                                <span className="text-[#B08A50] text-xs font-bold hidden sm:inline">
                                  {isExpanded ? 'Collapse' : 'Expand'}
                                </span>
                              </div>
                            </div>

                            {/* Card Bottom CTA Actions */}
                            <div className="pt-4 border-t border-black/5 flex flex-wrap gap-2.5 items-center justify-between">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                  className="profile-btn-outline py-2 px-4 text-[0.62rem]"
                                >
                                  {isExpanded ? 'Hide Details' : 'View Details'}
                                </button>
                                {order.status !== 'CANCELLED' && (
                                  <>
                                    <button
                                      onClick={() => showToast('Connecting to logistics server... Status: In Transit.', 'info')}
                                      className="profile-btn-outline py-2 px-4 text-[0.62rem]"
                                    >
                                      Track Order
                                    </button>
                                    <button
                                      onClick={() => showToast('Generating invoice download... PDF will start downloading shortly.', 'info')}
                                      className="profile-btn-outline py-2 px-4 text-[0.62rem]"
                                    >
                                      Download Invoice
                                    </button>
                                  </>
                                )}
                              </div>
                              
                              {/* Reorder Button */}
                              <button
                                onClick={() => handleReorder(order)}
                                className="profile-btn-primary py-2 px-4 text-[0.62rem] ml-auto"
                              >
                                Reorder Items
                              </button>
                            </div>

                            {/* Expanded Details section */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="pt-6 mt-4 border-t border-black/5 grid grid-cols-1 md:grid-cols-2 gap-8 text-[0.78rem] text-black/75">
                                    <div>
                                      <h5 className="text-[0.65rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-3">Delivery Address</h5>
                                      {order.address ? (
                                        <div className="space-y-1 font-body text-xs text-black/65">
                                          <p className="font-bold text-[#1C1B18]">{order.address.fullName}</p>
                                          <p>{order.address.addressLine1}</p>
                                          {order.address.addressLine2 && <p>{order.address.addressLine2}</p>}
                                          <p>{order.address.city}, {order.address.state} - {order.address.postalCode}</p>
                                          <p className="mt-2 text-black/40">📞 {order.address.phone}</p>
                                        </div>
                                      ) : (
                                        <p className="text-black/40 italic text-xs">Address details unavailable.</p>
                                      )}
                                    </div>
                                    <div>
                                      <h5 className="text-[0.65rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-3">Invoice Details</h5>
                                      <div className="space-y-1 font-body text-xs text-black/65">
                                        <p>Payment Mode: <strong className="text-[#1C1B18]">{order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Razorpay Secure Checkout'}</strong></p>
                                        <p>Subtotal: ₹{Number(order.subtotal).toLocaleString('en-IN')}</p>
                                        {order.couponCode && (
                                          <p className="text-[#8B672F] font-semibold">
                                            Coupon: {order.couponCode} (-₹{Number(order.discountAmount || 0).toLocaleString('en-IN')})
                                          </p>
                                        )}
                                        <p>Shipping: {Number(order.shippingFee) > 0 ? `₹${Number(order.shippingFee).toLocaleString('en-IN')}` : 'Free Delivery'}</p>
                                        {order.notes && <p className="mt-3 italic text-black/50">"Gift Note: {order.notes}"</p>}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 pt-6 border-t border-black/5">
                                    <h5 className="text-[0.65rem] font-bold uppercase tracking-wider text-[#1C1B18] mb-3">Scent Selections</h5>
                                    <div className="space-y-3">
                                      {order.orderItems?.map(item => {
                                        const bottleName = item.bottleName;
                                        const bottleColor = item.bottleColor;
                                        const bottlePriceAdj = Number(item.bottlePriceAdjustment || 0);
                                        const bottleText = bottleName 
                                          ? `${bottleName}${bottleColor ? ` (${bottleColor})` : ''}` 
                                          : null;

                                        return (
                                          <div key={item.id} className="flex justify-between items-start text-xs py-2.5 border-b border-black/5 last:border-0 gap-3">
                                            <div className="flex gap-3 items-start">
                                              {item.bottleImage && (
                                                <img
                                                  src={item.bottleImage}
                                                  alt={item.bottleName || 'Bottle'}
                                                  className="w-10 h-10 object-cover rounded border border-black/10 flex-shrink-0 mt-0.5"
                                                />
                                              )}
                                              <div className="space-y-1">
                                                <p className="font-bold text-[#1C1B18]">{item.productName}</p>
                                                <p className="text-[0.7rem] text-black/60">Size: {item.size}</p>
                                                {bottleText && (
                                                  <div className="mt-0.5">
                                                    <span className="text-[0.62rem] font-medium text-black/45 block">Bottle:</span>
                                                    <span className="text-[0.7rem] text-[#8B672F] font-semibold block">{bottleText}</span>
                                                    {bottlePriceAdj > 0 && (
                                                      <span className="text-[0.65rem] text-[#8B672F] font-bold uppercase tracking-wider block mt-0.5">
                                                        Upgrade +₹{bottlePriceAdj.toLocaleString('en-IN')}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                                <p className="text-[0.7rem] text-black/60">Qty: {item.quantity}</p>
                                                {item.bottleSku && (
                                                  <p className="text-[0.62rem] text-black/35 font-mono">SKU: {item.bottleSku}</p>
                                                )}
                                              </div>
                                            </div>
                                            <span className="font-semibold text-[#1C1B18] whitespace-nowrap">₹{(Number(item.priceAtPurchase) * item.quantity).toLocaleString('en-IN')}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* SECTION: SAVED DESTINATIONS */}
              {activeSection === 'addresses' && (
                <motion.div
                  key="addresses"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-black/8">
                    <div className="section-head">
                      <h2 className="font-heading text-2xl font-light tracking-wide uppercase">Saved Destinations</h2>
                      <p className="text-xs text-black/45 font-body">Manage your saved shipping addresses for faster checkouts.</p>
                    </div>
                    {!showAddressForm && (
                      <button
                        onClick={() => {
                          resetAddressForm();
                          setShowAddressForm(true);
                        }}
                        className="profile-btn-outline py-2 px-5 text-[0.65rem]"
                      >
                        + Add Address
                      </button>
                    )}
                  </div>

                  {showAddressForm ? (
                    <div className="bg-[#FEFCF9] border border-black/5 p-6 max-w-xl">
                      <h3 className="font-heading text-xl font-light uppercase tracking-wide mb-6">
                        {editingAddressId ? 'Edit Address Details' : 'Add New Address Destination'}
                      </h3>
                      
                      {addressError && (
                        <div className="p-3 bg-[#FF003C]/5 text-[#FF003C] text-xs font-bold uppercase tracking-wider mb-6">
                          {addressError}
                        </div>
                      )}

                      <form onSubmit={handleAddressSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">Recipient Full Name</label>
                            <input
                              type="text" required
                              value={addressFormData.fullName}
                              onChange={(e) => setAddressFormData({ ...addressFormData, fullName: e.target.value })}
                              className="luxury-input"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">Contact Phone Number</label>
                            <input
                              type="text" required
                              value={addressFormData.phone}
                              onChange={(e) => setAddressFormData({ ...addressFormData, phone: e.target.value })}
                              className="luxury-input"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">Address Line 1</label>
                          <input
                            type="text" required
                            value={addressFormData.addressLine1}
                            onChange={(e) => setAddressFormData({ ...addressFormData, addressLine1: e.target.value })}
                            className="luxury-input"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">Address Line 2 (Optional)</label>
                          <input
                            type="text"
                            value={addressFormData.addressLine2}
                            onChange={(e) => setAddressFormData({ ...addressFormData, addressLine2: e.target.value })}
                            className="luxury-input"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">City</label>
                            <input
                              type="text" required
                              value={addressFormData.city}
                              onChange={(e) => setAddressFormData({ ...addressFormData, city: e.target.value })}
                              className="luxury-input"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">State</label>
                            <input
                              type="text" required
                              value={addressFormData.state}
                              onChange={(e) => setAddressFormData({ ...addressFormData, state: e.target.value })}
                              className="luxury-input"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[0.62rem] font-bold uppercase tracking-wider text-black/50 block">Postal PIN Code</label>
                            <input
                              type="text" required
                              value={addressFormData.postalCode}
                              onChange={(e) => setAddressFormData({ ...addressFormData, postalCode: e.target.value })}
                              className="luxury-input"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 select-none">
                          <input
                            id="isDefaultCheckbox"
                            type="checkbox"
                            checked={addressFormData.isDefault}
                            onChange={(e) => setAddressFormData({ ...addressFormData, isDefault: e.target.checked })}
                            className="rounded-none accent-[#8B672F]"
                          />
                          <label htmlFor="isDefaultCheckbox" className="text-[0.68rem] tracking-wider text-black/60 uppercase cursor-pointer">
                            Set as default shipping address
                          </label>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-black/5">
                          <button
                            type="submit"
                            disabled={savingAddress}
                            className="profile-btn-primary py-3 px-6 text-[0.68rem]"
                          >
                            {savingAddress ? 'Saving...' : 'Save Destination'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddressForm(false);
                              resetAddressForm();
                            }}
                            className="profile-btn-outline py-3 px-6 text-[0.68rem]"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="py-12 text-center bg-white/40 border border-black/5">
                      <p className="text-xs text-black/50 leading-relaxed font-body">No shipping destinations saved yet.</p>
                      <button
                        onClick={() => {
                          resetAddressForm();
                          setShowAddressForm(true);
                        }}
                        className="profile-btn-primary mt-6 py-2.5 px-6 text-[0.65rem]"
                      >
                        Add Shipping Address
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {addresses.map(addr => (
                        <div key={addr.id} className={`address-display-box ${addr.isDefault ? 'default' : ''}`}>
                          <div className="flex items-center justify-between border-b border-black/5 pb-2.5 mb-3">
                            <span className="text-[0.78rem] font-bold">{addr.fullName}</span>
                            {addr.isDefault && <span className="default-tag">Default</span>}
                          </div>
                          
                          <p className="text-xs text-black/70 leading-relaxed font-body mb-4">
                            {addr.addressLine1}
                            {addr.addressLine2 && `, ${addr.addressLine2}`}
                            <br />
                            {addr.city}, {addr.state} - {addr.postalCode}
                          </p>
                          <span className="text-[0.62rem] font-bold tracking-wider text-black/40 uppercase block mb-4">📞 {addr.phone}</span>
                          
                          <div className="flex items-center gap-4 pt-3 border-t border-black/5">
                            <button
                              onClick={() => handleEditAddressClick(addr)}
                              className="text-[0.62rem] font-bold uppercase tracking-widest text-[#8B672F] hover:text-[#1C1B18] transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDuplicateAddressClick(addr)}
                              className="text-[0.62rem] font-bold uppercase tracking-widest text-[#B08A50] hover:text-[#1C1B18] transition-colors"
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-[0.62rem] font-bold uppercase tracking-widest text-black/45 hover:text-black transition-colors"
                            >
                              Delete Destination
                            </button>
                            {!addr.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-[0.62rem] font-bold uppercase tracking-widest text-[#8B672F] hover:text-[#1C1B18] transition-colors ml-auto"
                              >
                                Set Default
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* SECTION: SECURITY */}
              {activeSection === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="section-head pb-4 border-b border-black/8">
                    <h2 className="font-heading text-2xl font-light tracking-wide uppercase">Login & Security</h2>
                    <p className="text-xs text-black/45 font-body">Manage authentication credentials, active sessions, and password rules.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    {/* Left: Credentials Info */}
                    <div className="space-y-6 flex flex-col justify-between">
                      <p className="text-xs text-black/70 leading-relaxed font-body">
                        Decant Atelier accounts are secured with enterprise-grade authentication. Password updates, multi-factor settings, and social login configurations are managed centrally to provide the highest security standard.
                      </p>

                      <div className="p-6 bg-[#FEFCF9] border border-black/5 space-y-4 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-center text-xs py-2.5 border-b border-black/5">
                          <span className="font-bold text-black/50 uppercase tracking-wider text-[0.62rem]">Email Address</span>
                          <span className="text-[#1C1B18]/80 font-medium">{user.primaryEmailAddress?.emailAddress}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs py-2.5 border-b border-black/5">
                          <span className="font-bold text-black/50 uppercase tracking-wider text-[0.62rem]">Two-Factor Auth</span>
                          <span className="text-[#1C1B18]/80 font-medium">{user.twoFactorEnabled ? 'Active' : 'Not Configured'}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs py-2.5">
                          <span className="font-bold text-black/50 uppercase tracking-wider text-[0.62rem]">Primary Provider</span>
                          <span className="uppercase tracking-wider text-[0.68rem] text-[#8B672F] font-bold">
                            {user.externalAccounts?.[0]?.provider || 'Email / Password'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Security Standards Editorial Card */}
                    <div className="border border-black/5 bg-[#FEFCF9] p-6 flex flex-col justify-between">
                      <div>
                        <span className="text-[0.55rem] font-bold tracking-[2px] text-[#8B672F] uppercase block mb-2">
                          Security Standard
                        </span>
                        <h4 className="font-heading text-lg font-light text-[#1C1B18] tracking-wide mb-3">
                          AUTHENTICATION & DATA SAFETY
                        </h4>
                        <p className="text-[0.72rem] text-black/60 leading-relaxed font-light mb-4">
                          Your profile credentials and session state are managed in accordance with the highest web safety protocols.
                        </p>
                        <ul className="space-y-3.5 text-[0.68rem] text-black/65">
                          <li className="flex items-center gap-2">
                            <i className="fa-solid fa-lock text-[#8B672F] text-[9px]"></i>
                            <span>End-to-End Tokenized Encryption</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <i className="fa-solid fa-shield-halved text-[#8B672F] text-[9px]"></i>
                            <span>Compliant Account Management</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <i className="fa-solid fa-user-shield text-[#8B672F] text-[9px]"></i>
                            <span>Authorized Handshakes & CORS Protections</span>
                          </li>
                        </ul>
                      </div>
                      <div className="mt-6 pt-4 border-t border-black/5 flex items-center justify-between text-[0.58rem] font-bold tracking-wider text-black/40 uppercase">
                        <span>Status: Fully Secured</span>
                        <i className="fa-solid fa-circle-check text-[#4CAF7D]"></i>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </section>

        </div>
      </main>
    </div>
  );
}
