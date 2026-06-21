import { useState, useEffect, useMemo } from 'react';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import { getCart, updateQuantity, removeFromCart, clearCart } from '../utils/cartHelper';
import './CartPage.css';

export default function CartPage({ onBackToShop }) {
  const { isSignedIn, getToken } = useAuth();
  const [cartItems, setCartItems] = useState([]);

  // Checkout flow states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [notes, setNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');

  // Address creation form states (inline if needed)
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
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

  // Load cart items initially and listen for dynamic updates
  const loadCart = () => {
    setCartItems(getCart());
  };

  useEffect(() => {
    loadCart();
    window.addEventListener('cart-updated', loadCart);
    return () => {
      window.removeEventListener('cart-updated', loadCart);
    };
  }, []);

  // Fetch addresses when starting checkout
  useEffect(() => {
    if (isSignedIn && isCheckingOut) {
      fetchAddresses();
    }
  }, [isSignedIn, isCheckingOut]);

  const fetchAddresses = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('http://localhost:5000/api/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        const def = data.find(a => a.isDefault);
        if (def) setSelectedAddressId(def.id);
        else if (data.length > 0) setSelectedAddressId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate Subtotal
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  // Free Shipping configuration
  const FREE_SHIPPING_THRESHOLD = 999;
  const SHIPPING_COST = 99;

  const shipping = useMemo(() => {
    if (subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
    return SHIPPING_COST;
  }, [subtotal]);

  const grandTotal = subtotal + shipping;
  const neededForFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;

  const handleBackToShop = () => {
    if (onBackToShop) {
      onBackToShop();
    } else {
      window.location.hash = 'shop';
    }
  };

  const handleContinueToCheckout = () => {
    if (!isSignedIn) {
      // Handled via SignInButton wrapper or notification
      return;
    }
    setIsCheckingOut(true);
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const token = await getToken();
      const res = await fetch('http://localhost:5000/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAddress)
      });
      if (res.ok) {
        const created = await res.json();
        setAddresses([created, ...addresses]);
        setSelectedAddressId(created.id);
        setShowAddAddress(false);
        setNewAddress({
          fullName: '',
          phone: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          postalCode: '',
          isDefault: false
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      alert('Please select or add a shipping address.');
      return;
    }
    try {
      setPlacingOrder(true);
      const token = await getToken();
      // Map frontend cart properties to backend format
      const items = cartItems.map(item => ({
        productId: item.productId || item.id,
        variantId: item.variantId || 'default-variant',
        name: item.name,
        size: item.size,
        price: item.price,
        quantity: item.quantity
      }));

      const res = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          items,
          paymentMethod,
          notes
        })
      });

      if (res.ok) {
        const orderData = await res.json();
        setPlacedOrderId(orderData.id);
        // Clear cart
        clearCart();
        setOrderPlacedSuccess(true);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to place order');
      }
    } catch (err) {
      console.error(err);
      alert('Network error placing order');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (orderPlacedSuccess) {
    return (
      <div className="standalone-page-container selection:bg-[#c5a059]/20 min-h-screen font-body select-none">
        <header className="standalone-header">
          <div className="standalone-header-inner">
            <button onClick={handleBackToShop} className="standalone-back-btn">
              ← Continue Shopping
            </button>
            <span className="standalone-logo">Decant Atelier</span>
            <div style={{ width: '80px' }} />
          </div>
        </header>

        <div className="success-container">
          <div className="success-card">
            <div className="success-icon">✦</div>
            <h2 className="success-title">Order Confirmed</h2>
            {placedOrderId && (
              <p className="success-order-id">
                ORDER ID: #{placedOrderId.slice(-8).toUpperCase()}
              </p>
            )}
            <p className="success-text">
              Thank you for your purchase. Your olfactory journey is being prepared at our atelier.
            </p>
            <div className="success-actions">
              <button 
                onClick={() => { window.location.hash = 'profile'; }} 
                className="success-view-orders-btn"
              >
                View Order History
              </button>
              <button 
                onClick={handleBackToShop} 
                className="success-continue-btn"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="standalone-page-container selection:bg-[#c5a059]/20 min-h-screen font-body select-none">
        <header className="standalone-header">
          <div className="standalone-header-inner">
            <button onClick={handleBackToShop} className="standalone-back-btn">
              ← Continue Shopping
            </button>
            <span className="standalone-logo">Decant Atelier</span>
            <div style={{ width: '80px' }} />
          </div>
        </header>

        <div className="empty-container">
          <div className="empty-card">
            <div className="empty-icon">🛒</div>
            <h2 className="empty-title">Your Shopping Bag is Empty</h2>
            <p className="empty-text">
              Looks like you haven't added any premium fragrances to your collection yet.
            </p>
            <button 
              onClick={handleBackToShop} 
              className="empty-shop-btn"
            >
              Shop Our Collection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="standalone-page-container selection:bg-[#c5a059]/20 min-h-screen font-body select-none">
      
      {/* Standalone Header */}
      <header className="standalone-header mb-8">
        <div className="standalone-header-inner">
          <button onClick={handleBackToShop} className="standalone-back-btn">
            ← Continue Shopping
          </button>
          <span className="standalone-logo">Decant Atelier</span>
          <div style={{ width: '80px' }} /> {/* balanced spacing spacer */}
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-16">
        <h1 className="cart-page-title font-heading mb-8 text-3xl font-light tracking-wide">
          {isCheckingOut ? 'Secure Checkout' : 'Your Shopping Bag'}
        </h1>

        <div className="cart-grid">
          
          {/* LEFT COLUMN: Cart Items or Secure Checkout */}
          <div className="cart-items-column">
            {!isCheckingOut ? (
              cartItems.map((item) => {
                const itemTotal = item.price * item.quantity;
                return (
                  <div key={`${item.id}-${item.size}`} className="cart-item-card">
                    {/* Square Image */}
                    <div className="cart-item-img-container">
                      <img src={item.image} alt={item.name} className="cart-item-img" />
                    </div>

                    {/* Item Details */}
                    <div className="cart-item-details">
                      <span className="cart-item-brand">{item.brand ? item.brand.toUpperCase() : 'DECANTS'}</span>
                      <h3 className="cart-item-name font-heading">{item.name}</h3>
                      <div className="cart-item-meta">
                        {item.size.replace(' Decant', '').replace(' Sample', '')} Decant 
                        {item.label && <span className="cart-item-label"> - {item.label}</span>}
                      </div>
                      
                      {/* Unit price display */}
                      <div className="cart-item-unit-price-row mt-1">
                        <span className="cart-item-unit-price">₹{item.price.toLocaleString('en-IN')} each</span>
                      </div>

                      {/* Quantity Selector Inline */}
                      <div className="cart-item-controls-row mt-4">
                        <div className="cart-quantity-selector">
                          <button 
                            onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                            className="cart-qty-btn decrease"
                            aria-label="Decrease quantity"
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="cart-qty-value">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                            className="cart-qty-btn increase"
                            aria-label="Increase quantity"
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>

                        <button 
                          onClick={() => removeFromCart(item.id, item.size)}
                          className="cart-delete-btn"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <i className="far fa-trash-can"></i>
                        </button>
                      </div>
                    </div>

                    {/* Right: Price display */}
                    <div className="cart-item-price-column">
                      <span className="cart-item-total-price">
                        ₹{itemTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              /* SECURE CHECKOUT FLOW */
              <div className="checkout-container">
                
                {/* 1. Address Selection */}
                <div>
                  <div className="checkout-section-header">
                    <h3 className="checkout-title">1. Shipping Destination</h3>
                    {!showAddAddress && (
                      <button 
                        onClick={() => setShowAddAddress(true)}
                        className="checkout-add-btn"
                      >
                        + Add Address
                      </button>
                    )}
                  </div>

                  {showAddAddress ? (
                    <form onSubmit={handleCreateAddress} className="checkout-form">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="checkout-label">Full Name</label>
                          <input 
                            type="text" required
                            className="checkout-input"
                            value={newAddress.fullName}
                            onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="checkout-label">Phone Number</label>
                          <input 
                            type="text" required
                            className="checkout-input"
                            value={newAddress.phone}
                            onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="checkout-label">Address Line 1</label>
                          <input 
                            type="text" required
                            className="checkout-input"
                            value={newAddress.addressLine1}
                            onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="checkout-label">Postal Code</label>
                          <input 
                            type="text" required
                            className="checkout-input"
                            value={newAddress.postalCode}
                            onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="checkout-label">City</label>
                          <input 
                            type="text" required
                            className="checkout-input"
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="checkout-label">State</label>
                          <input 
                            type="text" required
                            className="checkout-input"
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button type="submit" disabled={savingAddress} className="checkout-submit-btn">
                          {savingAddress ? 'Saving...' : 'Save Address'}
                        </button>
                        <button type="button" onClick={() => setShowAddAddress(false)} className="checkout-cancel-btn">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : addresses.length === 0 ? (
                    <div className="checkout-empty-banner">
                      <p className="checkout-empty-text">No delivery addresses saved.</p>
                      <button 
                        onClick={() => setShowAddAddress(true)}
                        className="checkout-add-first-btn"
                      >
                        + Add First Shipping Address
                      </button>
                    </div>
                  ) : (
                    <div className="checkout-address-grid">
                      {addresses.map(addr => (
                        <div 
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`checkout-address-card ${selectedAddressId === addr.id ? 'active' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="checkout-address-name">{addr.fullName}</span>
                            {addr.isDefault && <span className="checkout-default-badge">Default</span>}
                          </div>
                          <p className="checkout-address-text">
                            {addr.addressLine1}, {addr.city}, {addr.state} - {addr.postalCode}
                          </p>
                          <p className="checkout-address-phone">📞 {addr.phone}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Payment Method */}
                <div>
                  <h3 className="checkout-title pb-3 border-b border-black/5 mb-4">2. Olfactory Payment Method</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setPaymentMethod('COD')}
                      className={`checkout-payment-card ${paymentMethod === 'COD' ? 'active' : ''}`}
                    >
                      <div className="checkout-payment-title">Cash on Delivery</div>
                      <div className="checkout-payment-desc">Pay upon delivery (₹0 fee)</div>
                    </div>
                    <div 
                      onClick={() => setPaymentMethod('SIMULATED_CARD')}
                      className={`checkout-payment-card ${paymentMethod === 'SIMULATED_CARD' ? 'active' : ''}`}
                    >
                      <div className="checkout-payment-title">Simulated Card</div>
                      <div className="checkout-payment-desc">Instant order validation</div>
                    </div>
                  </div>
                </div>

                {/* 3. Order Notes */}
                <div>
                  <h3 className="checkout-title pb-3 border-b border-black/5 mb-4">3. Atelier Notes (Optional)</h3>
                  <textarea 
                    rows="2"
                    placeholder="E.g., Fragrance preferences, delivery instructions..."
                    className="checkout-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="checkout-action-row">
                  <button 
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || !selectedAddressId}
                    className="checkout-complete-btn"
                  >
                    {placingOrder ? 'Validating Order...' : 'Complete Purchase'}
                  </button>
                  <button 
                    onClick={() => setIsCheckingOut(false)}
                    className="checkout-back-btn"
                  >
                    Back to Bag
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Order Summary */}
          <div className="cart-summary-column">
            <div className="cart-summary-card">
              <h2 className="cart-summary-title font-body">ORDER SUMMARY</h2>
              
              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span>SUBTOTAL</span>
                  <span className="font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="cart-summary-row">
                  <span>SHIPPING</span>
                  <span className="font-bold">
                    {shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>

              {/* Free Delivery Banner */}
              {subtotal > 0 && !isCheckingOut && (
                <div className={`cart-shipping-banner ${subtotal >= FREE_SHIPPING_THRESHOLD ? 'free-unlocked' : ''}`}>
                  {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                    <div className="shipping-banner-text font-bold text-center text-xs flex items-center justify-center gap-1.5 py-1">
                      <i className="fas fa-circle-check"></i>
                      <span>CONGRATULATIONS! FREE SHIPPING UNLOCKED</span>
                    </div>
                  ) : (
                    <div className="shipping-banner-inner">
                      <span className="shipping-banner-text">
                        ADD ₹{neededForFreeShipping.toLocaleString('en-IN')} MORE FOR FREE DELIVERY
                      </span>
                      <button onClick={handleBackToShop} className="shipping-add-more-btn">
                        ADD
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="cart-summary-divider" />

              <div className="cart-total-row">
                <span className="total-label">Total</span>
                <span className="total-value">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>

              {!isCheckingOut && (
                isSignedIn ? (
                  <button onClick={handleContinueToCheckout} className="cart-checkout-btn">
                    <span>CONTINUE TO CHECKOUT</span>
                    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                ) : (
                  <SignInButton mode="modal">
                    <button className="cart-checkout-btn">
                      <span>SIGN IN TO CHECKOUT</span>
                    </button>
                  </SignInButton>
                )
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
