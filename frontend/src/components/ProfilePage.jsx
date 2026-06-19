import { useEffect, useState } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/clerk-react';
import './ProfilePage.css';

const statusStyles = {
  PENDING: 'profile-status-pending',
  CONFIRMED: 'profile-status-blue',
  PROCESSING: 'profile-status-purple',
  SHIPPED: 'profile-status-orange',
  DELIVERED: 'profile-status-green',
  CANCELLED: 'profile-status-red',
};

export default function ProfilePage() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  const [dbUser, setDbUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [formData, setFormData] = useState({
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

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const token = await getToken();
      if (!token) return;

      const profileRes = await fetch('http://localhost:5000/api/user/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setDbUser(profileData);
        setProfileForm({ name: profileData.name || user?.fullName || '', phone: profileData.phone || '' });
      }

      const addrRes = await fetch('http://localhost:5000/api/addresses', { headers: { Authorization: `Bearer ${token}` } });
      if (addrRes.ok) setAddresses(await addrRes.json());

      const orderRes = await fetch('http://localhost:5000/api/orders', { headers: { Authorization: `Bearer ${token}` } });
      if (orderRes.ok) setOrders(await orderRes.json());
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) fetchData();
    else setLoadingData(false);
  }, [isSignedIn]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setSavingProfile(true);
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:5000/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setDbUser({ ...dbUser, name: updated.name, phone: updated.phone });
        setProfileSuccess('Profile updated successfully.');
        setTimeout(() => {
          setProfileSuccess('');
          setActiveSection('dashboard');
        }, 1200);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const resetAddressForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      isDefault: false
    });
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressError('');
    setSavingAddress(true);
    try {
      const token = await getToken();
      const url = editingAddressId ? `http://localhost:5000/api/addresses/${editingAddressId}` : 'http://localhost:5000/api/addresses';
      const method = editingAddressId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const saved = await res.json();
        const updatedAddresses = editingAddressId
          ? addresses.map((a) => a.id === editingAddressId ? saved : (formData.isDefault ? { ...a, isDefault: false } : a))
          : [saved, ...addresses.map((a) => formData.isDefault ? { ...a, isDefault: false } : a)];
        updatedAddresses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        setAddresses(updatedAddresses);
        setShowAddressModal(false);
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

  const handleEditAddressClick = (addr) => {
    setEditingAddressId(addr.id);
    setFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault
    });
    setShowAddressModal(true);
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    const token = await getToken();
    const res = await fetch(`http://localhost:5000/api/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setAddresses(addresses.filter((a) => a.id !== id));
  };

  const handleSetDefaultAddress = async (id) => {
    const token = await getToken();
    const res = await fetch(`http://localhost:5000/api/addresses/${id}/default`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const updated = await res.json();
      const updatedAddresses = addresses.map((a) => a.id === id ? updated : { ...a, isDefault: false });
      updatedAddresses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
      setAddresses(updatedAddresses);
    }
  };

  if (!authLoaded || !userLoaded) {
    return <div className="profile-shell profile-loading">Loading Account...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="profile-shell profile-guest">
        <div className="profile-card profile-guest-card">
          <h2>My Account</h2>
          <p>Please sign in to view your order history, shipping details, and saved addresses.</p>
          <button onClick={() => window.location.reload()} className="profile-primary-btn">Authenticate Session</button>
        </div>
      </div>
    );
  }

  const displayName = dbUser?.name || user.fullName || 'Collector';
  const displayPhone = dbUser?.phone || (user.primaryPhoneNumber ? user.primaryPhoneNumber.phoneNumber : 'No phone linked');

  return (
    <div className="profile-page-shell selection:bg-[#c5a059]/20">
      <header className="profile-topbar">
        <div className="profile-topbar-inner">
          <button
            onClick={() => {
              if (activeSection !== 'dashboard') setActiveSection('dashboard');
              else window.location.hash = 'shop';
            }}
            className="profile-back-btn"
          >
            <span aria-hidden="true">←</span>
            <span>{activeSection !== 'dashboard' ? 'Back to account' : 'Back to main page'}</span>
          </button>

          <span className="profile-brand">Decant Atelier</span>

          <SignOutButton redirectUrl="/">
            <button className="profile-signout-btn" aria-label="Sign out">Sign out</button>
          </SignOutButton>
        </div>
      </header>

      <main className="profile-main">
        {loadingData ? (
          <div className="profile-loading-state">Loading secure profile data...</div>
        ) : (
          <>
            {activeSection === 'dashboard' && (
              <div className="profile-layout-stack">
                <section className="profile-hero-card">
                  <div className="profile-hero-main">
                    <div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
                    <div className="profile-hero-copy">
                      <h2>{displayName}</h2>
                      <p>{user.primaryEmailAddress?.emailAddress} • {displayPhone}</p>
                    </div>
                  </div>
                  <div className="profile-hero-actions">
                    <button onClick={() => setActiveSection('settings')} className="profile-secondary-btn">Edit Profile</button>
                    {dbUser?.role === 'ADMIN' && (
                      <button onClick={() => { window.location.hash = 'admin'; }} className="profile-primary-btn">Admin Console</button>
                    )}
                  </div>
                </section>

                <div className="profile-dashboard-grid">
                  <button className="profile-dashboard-card" onClick={() => setActiveSection('orders')}>
                    <div className="profile-card-top">
                      <div className="profile-card-icon">Orders</div>
                      <h3 className="profile-card-title">Your Orders</h3>
                      <p className="profile-card-desc">Track, return, or buy items again</p>
                    </div>
                    <span className="profile-card-meta">{orders.length} orders placed</span>
                  </button>
                  <button className="profile-dashboard-card" onClick={() => setActiveSection('addresses')}>
                    <div className="profile-card-top">
                      <div className="profile-card-icon">Address</div>
                      <h3 className="profile-card-title">Addresses</h3>
                      <p className="profile-card-desc">Edit, add, or set default delivery addresses</p>
                    </div>
                    <span className="profile-card-meta">{addresses.length} saved addresses</span>
                  </button>
                  <button className="profile-dashboard-card" onClick={() => setActiveSection('settings')}>
                    <div className="profile-card-top">
                      <div className="profile-card-icon">Security</div>
                      <h3 className="profile-card-title">Login & Security</h3>
                      <p className="profile-card-desc">Update your display name, contact phone, or credentials</p>
                    </div>
                    <span className="profile-card-meta">Edit credentials</span>
                  </button>
                </div>

                {orders.length > 0 && (
                  <section className="profile-summary-card">
                    <div className="profile-section-title">
                      <span>Latest Purchase</span>
                      <button onClick={() => setActiveSection('orders')} className="profile-link-btn">View all orders</button>
                    </div>
                    <div className="profile-summary-row">
                      <div className="profile-summary-block">
                        <div className="profile-kicker">Order #{orders[0].id.slice(-8).toUpperCase()}</div>
                        <div className="profile-summary-value">
                          Placed on {new Date(orders[0].createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                        <span className={`profile-status-pill ${statusStyles[orders[0].status] || 'profile-status-neutral'}`}>
                          {orders[0].status}
                        </span>
                      </div>
                      <div className="profile-summary-block profile-summary-right">
                        <span className="profile-kicker">Total Amount</span>
                        <span className="profile-summary-total">₹{Number(orders[0].total).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeSection === 'orders' && (
              <div className="profile-section-stack">
                <div className="profile-section-heading">
                  <span>Your Orders</span>
                  <button onClick={() => setActiveSection('dashboard')} className="profile-link-btn">Back to Account Dashboard</button>
                </div>
                {orders.length === 0 ? (
                  <div className="profile-empty-card">
                    <p>You haven't ordered any premium decants yet.</p>
                    <button onClick={() => { window.location.hash = 'shop'; }} className="profile-primary-btn">Shop Fragrance Catalog</button>
                  </div>
                ) : (
                  <div className="profile-list">
                    {orders.map((order) => (
                      <article key={order.id} className="profile-record-card">
                        <div className="profile-record-head">
                          <div>
                            <div className="profile-kicker">Order placed</div>
                            <div className="profile-summary-value">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          </div>
                          <div>
                            <div className="profile-kicker">Total</div>
                            <div className="profile-summary-value">₹{Number(order.total).toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="profile-kicker">Ship to</div>
                            <div className="profile-summary-value">{order.address?.fullName || displayName}</div>
                          </div>
                        </div>
                        <div className="profile-record-body">
                          <div className={`profile-status-pill ${statusStyles[order.status] || 'profile-status-neutral'}`}>{order.status}</div>
                          {order.orderItems?.map((item) => (
                            <div key={item.id} className="profile-order-row">
                              <div>
                                <div className="profile-record-name">{item.productName}</div>
                                <div className="profile-record-meta">Size: {item.size} | Qty: {item.quantity}</div>
                              </div>
                              <div>₹{Number(item.priceAtPurchase).toLocaleString('en-IN')}</div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'addresses' && (
              <div className="profile-section-stack">
                <div className="profile-section-heading">
                  <span>Your Addresses</span>
                  <button onClick={() => { setEditingAddressId(null); resetAddressForm(); setShowAddressModal(true); }} className="profile-link-btn">Add New Address</button>
                </div>
                {addresses.length === 0 ? (
                  <div className="profile-empty-card">
                    <p>No shipping addresses saved yet.</p>
                    <button onClick={() => { setEditingAddressId(null); resetAddressForm(); setShowAddressModal(true); }} className="profile-primary-btn">Add Delivery Address</button>
                  </div>
                ) : (
                  <div className="profile-address-grid">
                    {addresses.map((addr) => (
                      <article key={addr.id} className={`profile-address-card ${addr.isDefault ? 'is-default' : ''}`}>
                        <div className="profile-address-top">
                          <div className="profile-address-name">{addr.fullName}</div>
                          {addr.isDefault && <span className="profile-default-badge">Default</span>}
                        </div>
                        <p className="profile-address-text">
                          {addr.addressLine1}
                          {addr.addressLine2 && `, ${addr.addressLine2}`}
                          <br />
                          {addr.city}, {addr.state} - {addr.postalCode}
                          <br />
                          India
                        </p>
                        <p className="profile-address-phone">{addr.phone}</p>
                        <div className="profile-address-actions">
                          <button onClick={() => handleEditAddressClick(addr)} className="profile-link-btn">Edit</button>
                          <button onClick={() => handleDeleteAddress(addr.id)} className="profile-link-btn">Delete</button>
                          {!addr.isDefault && <button onClick={() => handleSetDefaultAddress(addr.id)} className="profile-link-btn">Set Default</button>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === 'settings' && (
              <div className="profile-section-stack profile-settings-stack">
                <div className="profile-section-heading">
                  <span>Profile Settings</span>
                  <button onClick={() => setActiveSection('dashboard')} className="profile-link-btn">Dashboard</button>
                </div>
                <section className="profile-form-card">
                  {profileSuccess && <p className="profile-success-banner">{profileSuccess}</p>}
                  <form onSubmit={handleProfileSubmit} className="profile-form">
                    <div>
                      <label className="profile-label">Display Name</label>
                      <input className="profile-input" type="text" required value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="profile-label">Contact Phone Number</label>
                      <input className="profile-input" type="text" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                    </div>
                    <div className="profile-form-actions">
                      <button type="submit" disabled={savingProfile} className="profile-primary-btn">{savingProfile ? 'Saving Details...' : 'Save Profile'}</button>
                      <button type="button" onClick={() => setActiveSection('dashboard')} className="profile-secondary-btn">Cancel</button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </>
        )}
      </main>

      {showAddressModal && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal-card">
            <div className="profile-modal-accent" />
            <div className="profile-modal-head">
              <h3 className="profile-modal-title">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  setEditingAddressId(null);
                }}
                className="profile-modal-close"
              >
                &times;
              </button>
            </div>

            {addressError && <p className="profile-error-banner">{addressError}</p>}

            <form onSubmit={handleAddressSubmit} className="profile-form">
              <div>
                <label className="profile-label">Full Name</label>
                <input className="profile-input" type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
              </div>
              <div className="profile-grid-2">
                <div>
                  <label className="profile-label">Phone Number</label>
                  <input className="profile-input" type="text" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="profile-label">Postal Code</label>
                  <input className="profile-input" type="text" required value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="profile-label">Address Line 1</label>
                <input className="profile-input" type="text" required value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} />
              </div>
              <div>
                <label className="profile-label">Address Line 2 (Optional)</label>
                <input className="profile-input" type="text" value={formData.addressLine2} onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })} />
              </div>
              <div className="profile-grid-2">
                <div>
                  <label className="profile-label">City</label>
                  <input className="profile-input" type="text" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                  <label className="profile-label">State</label>
                  <input className="profile-input" type="text" required value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
              </div>
              <label className="profile-check-row">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
                <span>Set as default shipping address</span>
              </label>
              <button type="submit" disabled={savingAddress} className="profile-primary-btn profile-full-btn">
                {savingAddress ? 'Saving Destination...' : 'Save Address'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
