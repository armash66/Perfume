import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, SignInButton } from '@clerk/clerk-react';
import { getCart, updateQuantity, removeFromCart, clearCart, mergeCartToDb } from '../utils/cartHelper';
import { showToast } from '../utils/toast';
import './CartPage.css';
import { API_BASE_URL, sanitizeImageUrl } from '../utils/config.js';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== 'undefined') {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      if (window.Razorpay) {
        resolve(true);
      } else {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
      }
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

import { CartStore, WishlistStore } from '../utils/store.js';

const COD_ENABLED = false;

export default function CartPage({ onBackToShop, products = [] }) {
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [cartItems, setCartItems] = useState([]);
  const [mutatingItems, setMutatingItems] = useState(new Set());
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);
  const [checkoutState, setCheckoutState] = useState('IDLE');

  // Checkout flow states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1); // 1: Shipping Address, 2: Delivery, 3: Payment, 4: Review

  // Address states
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
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

  const resetAddressForm = () => {
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
    setEditingAddressId(null);
  };

  // Delivery options
  const [deliveryMethod, setDeliveryMethod] = useState('STANDARD'); // STANDARD, EXPRESS
  
  // Payment methods
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY'); // COD, RAZORPAY
  
  // Order notes & placement states
  const [notes, setNotes] = useState('');
  const [galleryIndexMap, setGalleryIndexMap] = useState({});
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlacedSuccess, setOrderPlacedSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [addressToDeleteId, setAddressToDeleteId] = useState(null);

  const isCheckoutInProgress = ['CREATING_ORDER', 'OPENING_RAZORPAY', 'VERIFYING_PAYMENT'].includes(checkoutState);

  const [storeSettings, setStoreSettings] = useState(null);

  const FREE_SHIPPING_THRESHOLD = storeSettings ? parseFloat(storeSettings.freeShippingThreshold) : 1999;
  const SHIPPING_CHARGES = storeSettings ? parseFloat(storeSettings.shippingCharges) : 199;

  // Sync cart items on load and list for updates via CartStore subscription
  useEffect(() => {
    const unsubscribeCart = CartStore.subscribe(setCartItems);
    const unsubscribeMutating = CartStore.subscribeMutating(setMutatingItems);
    return () => {
      unsubscribeCart();
      unsubscribeMutating();
    };
  }, []);

  // Fetch store settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setStoreSettings(data);
        }
      } catch (err) {
        console.error('Failed to load store settings:', err);
      }
    }
    fetchSettings();
  }, []);

  // Sync and merge cart when user logs in (background synchronization work)
  useEffect(() => {
    async function syncAndMerge() {
      if (isSignedIn) {
        setCheckoutState('LOADING_CART');
        try {
          const token = await getToken();
          if (token) {
            await mergeCartToDb(token);
          }
        } catch (err) {
          console.error('Error syncing cart on sign-in:', err);
        } finally {
          setCheckoutState('IDLE');
        }
      }
    }
    syncAndMerge();
  }, [isSignedIn]);

  // Wrapper handlers for cart operations to pass auth token
  const handleUpdateQuantity = async (variantIdOrId, size, newQty, currentRenderQty) => {
    if (isCheckingOut) {
      showToast('Cannot modify cart while checkout is in progress.', 'warning');
      return;
    }
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty === null || qty === undefined) {
      showToast('Invalid quantity value.', 'error');
      return;
    }
    if (qty < 0) {
      showToast('Quantity cannot be negative.', 'error');
      return;
    }

    // Determine the latest quantity from the store
    const latestCart = CartStore.getState();
    const latestItem = latestCart.find(ci => (ci.variantId && variantIdOrId === ci.variantId) || (ci.id === variantIdOrId && ci.size === size));
    const baseQty = latestItem ? latestItem.quantity : currentRenderQty;
    const delta = qty - currentRenderQty;
    const targetQty = baseQty + delta;

    if (targetQty < 0) return;

    // Check stock boundary using targetQty
    if (latestItem) {
      const product = products.find(p => p.id === latestItem.productId || p.id === latestItem.id);
      if (product && product.sizes) {
        const sizeOption = product.sizes.find(s => s.size === size);
        if (sizeOption && targetQty > sizeOption.stock) {
          showToast(`Cannot exceed available stock. Only ${sizeOption.stock} available.`, "warning");
          return;
        }
      }
    }

    try {
      const token = isSignedIn ? await getToken() : null;
      await updateQuantity(variantIdOrId, size, targetQty, token);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromCart = async (variantIdOrId, size) => {
    if (isCheckingOut) {
      showToast('Cannot modify cart while checkout is in progress.', 'warning');
      return;
    }
    try {
      const token = isSignedIn ? await getToken() : null;
      await removeFromCart(variantIdOrId, size, token);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch addresses when checkout starts or is active
  const fetchAddresses = async () => {
    setCheckoutState('LOADING_ADDRESSES');
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        // Autoselect default address or first address
        const def = data.find(a => a.isDefault);
        if (def) {
          setSelectedAddressId(def.id);
        } else if (data.length > 0) {
          setSelectedAddressId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setCheckoutState('READY');
    }
  };

  useEffect(() => {
    if (isSignedIn && isCheckingOut) {
      fetchAddresses();
    }
  }, [isSignedIn, isCheckingOut]);

  // Address CRUD Handlers for Checkout Step 1
  const handleEditAddressClick = (addr, e) => {
    if (e) e.stopPropagation();
    setEditingAddressId(addr.id);
    setNewAddress({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault
    });
    setShowAddAddressForm(true);
  };

  const handleDuplicateAddressClick = (addr, e) => {
    if (e) e.stopPropagation();
    setEditingAddressId(null);
    setNewAddress({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      isDefault: false
    });
    setShowAddAddressForm(true);
  };

  const handleDeleteAddress = (id, e) => {
    if (e) e.stopPropagation();
    setAddressToDeleteId(id);
  };

  const handleSetDefaultAddress = async (id, e) => {
    if (e) e.stopPropagation();
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
        showToast('Default address updated.', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate pricing totals
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  const shipping = useMemo(() => {
    if (subtotal === 0) return 0;
    if (deliveryMethod === 'EXPRESS') return 399;
    if (deliveryMethod === 'OWNER') return 5000;
    // STANDARD: standard charge is 149
    const charge = storeSettings ? parseFloat(storeSettings.shippingCharges) : 149;
    return charge;
  }, [subtotal, deliveryMethod, storeSettings]);

  const grandTotal = subtotal + shipping;

  const renderOrderSummary = (isMobile = false) => {
    return (
      <div className={`luxury-summary-card ${isMobile ? 'checkout-mobile-summary mt-6' : ''}`}>
        <h2 className="font-body text-xs font-bold tracking-[2px] uppercase mb-6 pb-2.5 border-b border-black/8">
          Order Summary
        </h2>

        <div className="space-y-4 text-xs font-body mb-6">
          {/* Summary Item list when checking out */}
          {isCheckingOut && (
            <div className="checkout-summary-items-mini border-b border-black/5 pb-4 mb-4 space-y-3.5 max-h-[160px] overflow-y-auto scrollbar-hide">
              {cartItems.map(item => (
                <div key={`${item.id}-${item.size}`} className="flex justify-between items-center text-[0.72rem] text-black/70">
                  <span className="truncate max-w-[180px]">{item.name} <strong className="font-semibold text-[#1C1B18]">x{item.quantity}</strong></span>
                  <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-black/50">SUBTOTAL</span>
            <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-black/50">SHIPPING</span>
            <span className="font-semibold text-[#8B672F]">
              {shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-black/50">ESTIMATED TAX</span>
            <span className="font-semibold text-black/40">Included</span>
          </div>
        </div>



        <div className="border-t border-black/8 pt-6 mb-8 flex justify-between items-center">
          <span className="font-body text-xs font-bold tracking-wider uppercase">Total</span>
          <span className="font-heading text-2xl font-semibold text-[#8B672F]">
            ₹{grandTotal.toLocaleString('en-IN')}
          </span>
        </div>

        {!isCheckingOut && (
          isSignedIn ? (
            <button 
              onClick={handleContinueToCheckout} 
              disabled={mutatingItems.size > 0}
              className="luxury-summary-checkout-btn disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <span>{mutatingItems.size > 0 ? 'Updating Bag...' : 'Proceed to Checkout'}</span>
              {mutatingItems.size === 0 && <span className="arrow">→</span>}
            </button>
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="luxury-summary-checkout-btn"
                style={{ color: '#FEFCF9' }}
              >
                <span>Sign In to Checkout</span>
              </button>
            </SignInButton>
          )
        )}
      </div>
    );
  };

  const handleBackToShop = () => {
    if (onBackToShop) {
      onBackToShop();
    } else {
      navigate('/shop');
    }
  };

  // Navigate to Categories page and scroll to "Shop by Category" section
  const handleExploreCollection = () => {
    navigate('/categories');

    // Wait for the categories page to mount and render, then scroll to the section.
    // Using requestAnimationFrame + a small timeout ensures the DOM is ready.
    requestAnimationFrame(() => {
      setTimeout(() => {
        const target = document.getElementById('shop-by-category');
        if (target) {
          // Calculate the fixed navbar height dynamically for accurate offset
          const navbar = document.querySelector('.navbar-wrapper');
          const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
          const buffer = 16; // Comfortable visual breathing room
          const targetTop = target.getBoundingClientRect().top + window.scrollY - navbarHeight - buffer;

          window.scrollTo({
            top: targetTop,
            behavior: 'smooth'
          });
        }
      }, 100);
    });
  };

  // Continue checkout
  const handleContinueToCheckout = () => {
    if (!isSignedIn) return;
    setIsCheckingOut(true);
    setCheckoutStep(1);
    window.dispatchEvent(new CustomEvent('checkout_started', {
      detail: { cartCount: cartItems.length, subtotal }
    }));
  };

  // Save new address during checkout (handles both Edit PUT and Create POST)
  const handleCreateAddress = async (e) => {
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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAddress)
      });
      if (res.ok) {
        const saved = await res.json();
        let updatedAddresses = [];
        if (editingAddressId) {
          updatedAddresses = addresses.map(a => 
            a.id === editingAddressId ? saved : (newAddress.isDefault ? { ...a, isDefault: false } : a)
          );
        } else {
          updatedAddresses = [
            saved,
            ...addresses.map(a => newAddress.isDefault ? { ...a, isDefault: false } : a)
          ];
        }
        updatedAddresses.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        setAddresses(updatedAddresses);
        setSelectedAddressId(saved.id);
        setShowAddAddressForm(false);
        setEditingAddressId(null);
        resetAddressForm();
        showToast('Address saved successfully.', 'success');
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

  // Place final order
  const handlePlaceOrder = async () => {
    if (!COD_ENABLED && paymentMethod === 'COD') {
      showToast('Cash on Delivery is currently unavailable. Please select online payment.', 'error');
      return;
    }
    if (!selectedAddressId) {
      showToast('Please select a shipping destination.', 'warning');
      return;
    }
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    setPlacingOrder(true);
    setCheckoutState('CREATING_ORDER');
    try {
      const token = await getToken();
      const items = cartItems.map(item => {
        if (!item.variantId) {
          if (import.meta.env.DEV) {
            console.error(`[CRITICAL DEVELOPMENT ERROR] Cart item "${item.name}" size "${item.size}" is missing variantId!`);
          }
          throw new Error(`Variant ID missing for cart item: ${item.name} (${item.size})`);
        }
        return {
          productId: item.productId || item.id,
          variantId: item.variantId,
          name: item.name,
          size: item.size,
          price: item.price,
          quantity: item.quantity
        };
      });

      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          addressId: selectedAddressId,
          items,
          paymentMethod,
          shippingMethod: deliveryMethod,
          // Append bottle selections to order notes so admin can see packaging preferences
          notes: [
            notes,
            ...cartItems
              .filter(item => item.bottleName)
              .map(item => `${item.name} (${item.size}): Bottle — ${item.bottleName}${item.bottlePrice > 0 ? ` (+₹${item.bottlePrice})` : ''}`)
          ].filter(Boolean).join('\n') || undefined
        })
      });

      if (res.ok) {
        const orderData = await res.json();
        
        if (paymentMethod === 'RAZORPAY') {
          // Explicitly validate order response data before instantiating Razorpay
          if (!orderData || !orderData.razorpayOrderId || !orderData.total || !orderData.currency) {
            console.error("Invalid order response structure from server:", orderData);
            showToast('Invalid payment details returned from the server.', 'error');
            setPlacingOrder(false);
            setCheckoutState('READY');
            return;
          }

          setCheckoutState('OPENING_RAZORPAY');

          // Verify SDK availability on window before opening the checkout popup
          const scriptLoaded = typeof window.Razorpay !== 'undefined' ? true : await loadRazorpayScript();
          if (!scriptLoaded || typeof window.Razorpay === 'undefined') {
            showToast('Razorpay Checkout SDK failed to load. Please verify your connection.', 'error');
            setPlacingOrder(false);
            setCheckoutState('READY');
            return;
          }

          // Enforce loading credentials from order response payload, falling back to environment variable
          let rzpKey = orderData.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '';
          rzpKey = rzpKey.replace(/^["']|["']$/g, '').trim();

          if (!rzpKey || rzpKey === 'rzp_test_placeholder' || rzpKey === 'undefined') {
            console.error("Razorpay Key ID is missing or set to placeholder in frontend.");
            showToast('Payment configuration error: Public Key is missing or invalid.', 'error');
            setPlacingOrder(false);
            setCheckoutState('READY');
            return;
          }

          const options = {
            key: rzpKey,
            amount: Math.round(orderData.total * 100),
            currency: orderData.currency || 'INR',
            name: storeSettings ? storeSettings.storeName : 'Decant Atelier',
            description: 'Luxury Fragrance Purchase',
            order_id: orderData.razorpayOrderId,
            handler: async function (response) {
              setCheckoutState('VERIFYING_PAYMENT');
              try {
                const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    razorpayOrderId: response.razorpay_order_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpaySignature: response.razorpay_signature,
                    orderId: orderData.id
                  })
                });
                if (verifyRes.ok) {
                  setCheckoutState('SUCCESS');
                  navigate(`/payment/success?orderId=${orderData.id}&paymentId=${response.razorpay_payment_id}`);
                } else {
                  const errData = await verifyRes.json();
                  showToast(errData.error || 'Payment verification failed.', 'error');
                  setCheckoutState('FAILURE');
                  navigate(`/payment/failure?orderId=${orderData.id}&orderRef=${orderData.orderReference || ''}&reason=failed`);
                }
              } catch (verifyErr) {
                console.error('Error verifying payment:', verifyErr);
                showToast('Verification error. Please contact support with Order ID: ' + orderData.id, 'error');
                setCheckoutState('FAILURE');
                navigate(`/payment/failure?orderId=${orderData.id}&orderRef=${orderData.orderReference || ''}&reason=failed`);
              }
            },
            prefill: {
              name: selectedAddress?.fullName || user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '',
              email: user?.primaryEmailAddress?.emailAddress || '',
              contact: selectedAddress?.phone || user?.primaryPhoneNumber?.phoneNumber || ''
            },
            theme: {
              color: '#1C1B18'
            },
            modal: {
              ondismiss: async function () {
                console.log('User closed payment gateway modal.');
                setCheckoutState('READY');
                setPlacingOrder(false);
                try {
                  await fetch(`${API_BASE_URL}/api/payments/fail`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderId: orderData.id })
                  });
                } catch (failErr) {
                  console.error('Failed to notify payment failure:', failErr);
                } finally {
                  navigate(`/payment/failure?orderId=${orderData.id}&orderRef=${orderData.orderReference || ''}&reason=cancelled`);
                }
              }
            }
          };

          // Strict Runtime Validation of required properties before propagating to Razorpay SDK
          if (!options.key || options.key === 'undefined') {
            console.error("[CRITICAL] Razorpay Options Verification: 'key' is undefined or missing!", options);
            showToast('Unable to initialize payment gateway: Key is invalid.', 'error');
            setPlacingOrder(false);
            setCheckoutState('READY');
            return;
          }
          if (!options.order_id || options.order_id === 'undefined') {
            console.error("[CRITICAL] Razorpay Options Verification: 'order_id' is undefined or missing!", options);
            showToast('Unable to initialize payment gateway: Order ID is invalid.', 'error');
            setPlacingOrder(false);
            setCheckoutState('READY');
            return;
          }
          if (!options.amount || isNaN(options.amount) || options.amount <= 0) {
            console.error("[CRITICAL] Razorpay Options Verification: 'amount' is invalid or <= 0!", options);
            showToast('Unable to initialize payment gateway: Invalid order amount.', 'error');
            setPlacingOrder(false);
            setCheckoutState('READY');
            return;
          }
          if (!options.currency) {
            console.error("[CRITICAL] Razorpay Options Verification: 'currency' is undefined or missing!", options);
            showToast('Unable to initialize payment gateway: Currency is invalid.', 'error');
            setPlacingOrder(false);
            setCheckoutState('READY');
            return;
          }

          if (import.meta.env.DEV) {
            console.log("\n====== INITIALIZING RAZORPAY CHECKOUT ======");
            console.log("Options payload:", {
              ...options,
              key: options.key ? `${options.key.slice(0, 12)}...` : 'N/A' // obfuscate key in console log
            });
            console.log("============================================\n");
          }

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', async function (response) {
            console.error('Payment gateway payment failed. Raw Response:', response);
            console.error("Razorpay Error Details:", {
              message: response.error?.message,
              description: response.error?.description,
              error: response.error,
              statusCode: response.error?.statusCode,
              raw: response
            });
            showToast('Payment failed: ' + response.error.description, 'error');
            setCheckoutState('READY');
            setPlacingOrder(false);
            try {
              await fetch(`${API_BASE_URL}/api/payments/fail`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ orderId: orderData.id })
              });
            } catch (failErr) {
              console.error('Failed to notify payment failure:', failErr);
            } finally {
              navigate(`/payment/failure?orderId=${orderData.id}&orderRef=${orderData.orderReference || ''}&reason=failed`);
            }
          });
          rzp.open();
        } else {
          // COD placement flow completes immediately
          setPlacedOrderId(orderData.id);
          clearCart();
          setCheckoutState('SUCCESS');
          setOrderPlacedSuccess(true);
        }
      } else {
        const errData = await res.json();
        console.error("Order creation HTTP failure status:", res.status);
        console.error("Order creation error body:", errData);
        showToast(errData.error || 'Failed to place order', 'error');
        setCheckoutState('READY');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error placing order', 'error');
      setCheckoutState('READY');
    } finally {
      setPlacingOrder(false);
    }
  };

  const selectedAddress = useMemo(() => {
    return addresses.find(a => a.id === selectedAddressId);
  }, [addresses, selectedAddressId]);

  // Render Order placed successfully screen
  if (orderPlacedSuccess) {
    return (
      <div className="luxury-cart-container min-h-screen bg-[#F7F3ED] font-body text-[#1C1B18] pb-24 select-none pt-12">

        <div className="max-w-xl mx-auto text-center px-4 py-12 bg-[#FEFCF9] border border-black/5 mt-12 shadow-sm">
          <div className="text-3xl text-[#8B672F] mb-6">✦</div>
          <h2 className="font-heading text-3xl font-light uppercase tracking-wide mb-4">Purchase Confirmed</h2>
          {placedOrderId && (
            <p className="text-[0.62rem] font-bold tracking-[2px] text-black/40 uppercase mb-6">
              ORDER REF: #{placedOrderId.slice(-8).toUpperCase()}
            </p>
          )}
          <p className="text-xs text-black/60 leading-relaxed mb-8">
            Thank you for shopping at Decant Atelier. Your olfactory selections have been verified and are being hand-poured at our studio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => { navigate('/profile'); }} 
              className="py-3 px-6 bg-[#1C1B18] text-[#FEFCF9] hover:bg-[#8B672F] text-[0.68rem] font-bold tracking-widest uppercase transition-all duration-300"
              style={{ color: '#FEFCF9' }}
            >
              View Order Details
            </button>
            <button 
              onClick={handleBackToShop} 
              className="py-3 px-6 border border-black/15 text-black/70 hover:text-black text-[0.68rem] font-bold tracking-widest uppercase transition-all duration-300"
            >
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render loading skeleton for cart items to avoid empty-cart flicker
  if (checkoutState === 'LOADING_CART') {
    return (
      <div className="luxury-cart-container min-h-screen bg-[#F7F3ED] font-body text-[#1C1B18] pb-24 select-none">
        <section className="page-hero">
          <div className="page-hero-bg-text">ATELIER BAG</div>
          <div className="page-hero-content">
            <span className="page-hero-eyebrow">Decant Atelier</span>
            <h1 className="page-hero-title">Loading Your Bag</h1>
            <p className="page-hero-subtitle">Preparing your niche and luxury fragrance selections...</p>
            <div className="page-hero-divider" />
          </div>
        </section>
        
        <main className="max-w-[1440px] mx-auto px-4 md:px-12 pt-12">
          <div className="luxury-cart-grid">
            <div className="luxury-cart-left-pane space-y-6">
              {[1, 2].map((idx) => (
                <div key={idx} className="product-row py-6 first:pt-0 border-b border-black/5">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left w-full">
                    <div className="w-20 h-24 bg-black/5 shimmer-bg flex-shrink-0" />
                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                      <div className="space-y-2 w-full max-w-[200px] flex flex-col items-center md:items-start">
                        <div className="h-3 w-16 bg-black/10 shimmer-bg rounded" />
                        <div className="h-5 w-40 bg-black/10 shimmer-bg rounded" />
                        <div className="h-3.5 w-24 bg-black/10 shimmer-bg rounded" />
                      </div>
                      <div className="flex items-center gap-8 justify-center md:justify-end w-full max-w-[300px]">
                        <div className="h-8 w-16 bg-black/5 shimmer-bg rounded" />
                        <div className="h-8 w-20 bg-black/5 shimmer-bg rounded" />
                        <div className="h-8 w-8 bg-black/5 shimmer-bg rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="luxury-cart-summary-pane">
              <div className="luxury-summary-card space-y-6">
                <div className="h-4 w-24 bg-black/10 shimmer-bg rounded mb-6" />
                <div className="space-y-4">
                  <div className="flex justify-between"><div className="h-3.5 w-16 bg-black/5 shimmer-bg rounded" /><div className="h-3.5 w-12 bg-black/5 shimmer-bg rounded" /></div>
                  <div className="flex justify-between"><div className="h-3.5 w-16 bg-black/5 shimmer-bg rounded" /><div className="h-3.5 w-12 bg-black/5 shimmer-bg rounded" /></div>
                  <div className="flex justify-between"><div className="h-3.5 w-24 bg-black/5 shimmer-bg rounded" /><div className="h-3.5 w-12 bg-black/5 shimmer-bg rounded" /></div>
                </div>
                <div className="border-t border-black/8 pt-6 flex justify-between">
                  <div className="h-4 w-12 bg-black/10 shimmer-bg rounded" />
                  <div className="h-6 w-20 bg-black/10 shimmer-bg rounded" />
                </div>
                <div className="h-12 w-full bg-black/15 shimmer-bg rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render Empty Cart Screen
  if (cartItems.length === 0) {
    return (
      <div className="luxury-cart-container min-h-screen bg-[#F7F3ED] font-body text-[#1C1B18] select-none">

        {/* Luxury Page Hero — matches filled cart */}
        <section className="page-hero">
          <div className="page-hero-bg-text">BAG</div>
          <div className="page-hero-content">
            <span className="page-hero-eyebrow">Decant Atelier</span>
            <h1 className="page-hero-title">Your Shopping Bag</h1>
            <p className="page-hero-subtitle">
              Your fragrance journey begins here.
            </p>
            <div className="page-hero-divider" />
          </div>
        </section>

        {/* Empty State Body */}
        <div className="empty-cart-body">
          <div className="empty-cart-card">

            {/* SVG Bag Icon */}
            <div className="empty-cart-icon-wrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                fill="none"
                stroke="#8B672F"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="empty-cart-icon"
              >
                <path d="M14 20V16a10 10 0 0 1 20 0v4" />
                <rect x="8" y="20" width="32" height="24" rx="3" />
                <path d="M18 28a6 6 0 0 0 12 0" strokeDasharray="2 2" />
              </svg>
            </div>

            {/* Heading */}
            <h2 className="empty-cart-heading">Your bag is empty</h2>

            {/* Gold divider */}
            <div className="empty-cart-divider" />

            {/* Supporting text */}
            <p className="empty-cart-body-text">
              Discover our curated collection of niche and luxury fragrances — each bottle a story, each note a memory waiting to be made.
            </p>

            {/* CTA */}
            <button
              onClick={handleExploreCollection}
              className="empty-cart-cta"
              style={{ color: '#FEFCF9' }}
            >
              Explore the Collection
              <span className="empty-cart-cta-arrow" aria-hidden="true">→</span>
            </button>

            {/* Secondary link */}
            <p className="empty-cart-secondary-note">
              Looking for something specific?&nbsp;
              <button
                onClick={handleBackToShop}
                className="empty-cart-text-link"
              >
                Browse all fragrances
              </button>
            </p>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="luxury-cart-container min-h-screen bg-[#F7F3ED] font-body text-[#1C1B18] pb-24 select-none">
      
      {/* Responsive Luxury Page Hero */}
      <section className="page-hero">
        <div className="page-hero-bg-text">ATELIER BAG</div>
        <div className="page-hero-content">
          <span className="page-hero-eyebrow">Decant Atelier</span>
          <h1 className="page-hero-title">
            {isCheckingOut ? `Checkout (Step ${checkoutStep}/3)` : 'Your Shopping Bag'}
          </h1>
          <p className="page-hero-subtitle">
            {isCheckingOut 
              ? 'Securely complete your olfactory order selection and delivery details.' 
              : `${cartItems.length} exceptional fragrance selection(s) curated for your collection.`
            }
          </p>
          <div className="page-hero-divider" />
        </div>
      </section>
      
      <main className="max-w-[1440px] mx-auto px-4 md:px-12 pt-12">
        <button 
            onClick={() => {
              if (checkoutStep > 1) {
                setCheckoutStep(checkoutStep - 1);
              } else {
                setIsCheckingOut(false);
              }
            }} 
            className="mb-8 text-[0.65rem] font-bold tracking-widest uppercase hover:text-[#B08A50] transition-colors cursor-pointer"
          >
            ← Back
          </button>

          {/* Premium Checkout Progress Breadcrumb */}
          <div className={`checkout-progress-bar mb-10 ${isCheckoutInProgress ? 'checkout-disabled-element' : ''}`}>
            {['Bag', 'Address', 'Shipping', 'Payment'].map((step, idx) => {
              const stepNum = idx + 1;
              const isActive = isCheckingOut ? (stepNum === checkoutStep + 1) : (stepNum === 1);
              const isPast = isCheckingOut && stepNum < checkoutStep + 1;
              return (
                <div key={step} className="progress-step-item">
                  <div className={`progress-step-dot ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}>{isPast ? '✓' : stepNum}</div>
                  <span className={`progress-step-label ${isActive ? 'active' : ''}`}>{step}</span>
                  {idx < 3 && <div className={`progress-step-line ${isPast ? 'past' : ''}`} />}
                </div>
              );
            })}
          </div>

        <div className={`luxury-cart-grid ${isCheckingOut ? 'checkout-active' : ''}`}>
          
          {/* LEFT PANEL: Cart Rows or Multi-Step Form */}
          <div className={`luxury-cart-left-pane ${isCheckoutInProgress ? 'checkout-disabled-element' : ''}`}>
            {!isCheckingOut ? (
              /* SHOPPING BAG PRODUCT LIST */
              <div className="space-y-6">
                


                <div className="bag-items-list divide-y divide-black/8">
                  {cartItems.map((item) => {
                    const itemKey = `${item.id}-${item.size}`;
                    const fullProduct = products.find(p => p.id === item.productId || p.id === item.id);
                    const gallery = fullProduct?.images || [item.image];
                    const activeImgIdx = galleryIndexMap[itemKey] || 0;
                    
                    // Audit and parse potentially complex object/string structure to guarantee valid URL
                    const activeRawImg = gallery[activeImgIdx] || item.image;
                    const activeImage = typeof activeRawImg === 'string' ? activeRawImg : (activeRawImg?.imageUrl || activeRawImg?.url || '');
                    const activeImageSrc = sanitizeImageUrl(activeImage);

                    const itemMutating = mutatingItems.has(item.variantId) || 
                                         mutatingItems.has((item.variantId || item.id) + '_' + item.size) ||
                                         mutatingItems.has(item.id + '_' + item.size);

                    return (
                      <div key={itemKey} className="product-row py-6 first:pt-0">
                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left w-full">
                          
                          {/* Product Image and Thumbnail Gallery */}
                          <div className="flex flex-col gap-2 flex-shrink-0 items-center">
                            <div className="product-image-box border border-black/5 bg-white relative w-20 h-24 overflow-hidden flex items-center justify-center">
                              <img src={activeImageSrc} alt={item.name || 'Fragrance Decant'} className="w-full h-full object-cover" />
                            </div>
                            {gallery.length > 1 && (
                              <div className="flex gap-1 justify-center w-20 overflow-x-auto scrollbar-hide">
                                {gallery.slice(0, 4).map((gImg, gIdx) => {
                                  const rawThumb = gImg || item.image;
                                  const thumbUrl = typeof rawThumb === 'string' ? rawThumb : (rawThumb?.imageUrl || rawThumb?.url || '');
                                  const thumbSrc = sanitizeImageUrl(thumbUrl);
                                  return (
                                    <button
                                      key={gIdx}
                                      onClick={() => setGalleryIndexMap(prev => ({ ...prev, [itemKey]: gIdx }))}
                                      className={`w-4 h-4 rounded-md border overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                                        activeImgIdx === gIdx ? 'border-[#8B672F] scale-110' : 'border-neutral-200 opacity-60 hover:opacity-100'
                                      }`}
                                    >
                                      <img src={thumbSrc} className="w-full h-full object-cover" alt="mini-thumb" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
 
                           {/* Product Details */}
                           <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                             <div className="space-y-1 w-full text-center md:text-left">
                                <span className="text-[0.58rem] font-bold text-black/40 uppercase tracking-widest block">
                                 {item.brand ? item.brand.toUpperCase() : 'DECANTS'}
                               </span>
                               <h3 className="font-heading text-lg font-normal text-[#1C1B18] text-center md:text-left">
                                 {item.name}
                               </h3>
                               <span className="text-[0.72rem] text-black/50 block font-body text-center md:text-left">
                                 Size: {item.size} {item.label && `(${item.label})`}
                               </span>
                               {item.bottleName && (
                                 <span className="text-[0.65rem] text-[#8B672F] font-bold uppercase tracking-wider block text-center md:text-left">
                                   <i className="fa-solid fa-spray-can-sparkles mr-1" aria-hidden="true" />
                                   {item.bottleName}
                                   {item.bottlePrice > 0 && <span className="text-black/40 font-semibold ml-1">(+₹{item.bottlePrice})</span>}
                                 </span>
                               )}
                             </div>
 
                             {/* Price & Quantity Selector Column */}
                             <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 justify-center md:justify-end w-full mt-2 md:mt-0">
                               <div className="text-center md:text-left">
                                 <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Price</span>
                                 <span className="text-xs font-semibold">₹{item.price.toLocaleString('en-IN')}</span>
                               </div>
 
                               {/* Inline Quantity Controls */}
                               <div className="text-center">
                                 <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Quantity</span>
                                 <div className="flex items-center border border-black/8 bg-white h-11 md:h-9 px-1">
                                   <button 
                                     onClick={() => handleUpdateQuantity(item.variantId || item.id, item.size, item.quantity - 1, item.quantity)}
                                     disabled={isCheckingOut}
                                     className="w-11 h-full md:w-6 flex items-center justify-center text-xs text-black/55 hover:text-black cursor-pointer min-h-[44px] md:min-h-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                     aria-label="Decrease quantity"
                                   >
                                     <i className="fas fa-minus text-[10px]"></i>
                                   </button>
                                   <span className="w-8 text-center text-xs font-bold text-[#1C1B18] select-none">
                                     {item.quantity}
                                   </span>
                                   <button 
                                     onClick={() => handleUpdateQuantity(item.variantId || item.id, item.size, item.quantity + 1, item.quantity)}
                                     disabled={isCheckingOut}
                                     className="w-11 h-full md:w-6 flex items-center justify-center text-xs text-black/55 hover:text-black cursor-pointer min-h-[44px] md:min-h-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                     aria-label="Increase quantity"
                                   >
                                     <i className="fas fa-plus text-[10px]"></i>
                                   </button>
                                 </div>
                               </div>
 
                               {/* Delete Item */}
                               <div className="text-center flex flex-col items-center">
                                 <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Remove</span>
                                 <button 
                                   onClick={() => handleRemoveFromCart(item.variantId || item.id, item.size)}
                                   disabled={isUpdatingCart || isCheckingOut || itemMutating}
                                   className="w-11 h-11 md:w-auto md:h-auto flex items-center justify-center text-xs text-black/45 hover:text-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                   title="Delete Item"
                                 >
                                   <i className="far fa-trash-can"></i>
                                 </button>
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                </div>


                {/* Order Notes comments field */}
                <div className="bg-[#FEFCF9] border border-black/5 p-6 text-left shadow-sm">
                  <h4 className="text-xs font-bold text-[#1C1B18] uppercase tracking-wider mb-2">
                    Order Notes
                  </h4>
                  <p className="text-[0.62rem] text-black/40 uppercase tracking-wider mb-3">
                    Add special instructions, courier preferences, or handwritten card messages:
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Enter your order notes or gift messages..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#F7F3ED]/40 border border-black/8 p-3 text-xs text-[#1C1B18] placeholder-black/30 focus:outline-none focus:border-[#8B672F] resize-none"
                  />
                </div>

              </div>
            ) : (
              /* MULTI-STEP SECURE CHECKOUT FLOW */
              <div className="checkout-steps-form">
                
                {/* STEP 1: SHIPPING ADDRESS */}
                {checkoutStep === 1 && (
                  <div className="space-y-6">
                    <div className="step-header pb-4 border-b border-black/8">
                      <h3 className="font-heading text-2xl font-light uppercase tracking-wide">1. Shipping Address</h3>
                      <p className="text-xs text-black/45 font-body">Select one of your saved delivery addresses or specify a new shipping destination.</p>
                    </div>

                    {checkoutState === 'LOADING_ADDRESSES' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map((idx) => (
                          <div key={idx} className="checkout-address-select-box border border-black/5 p-6 space-y-3 bg-[#FEFCF9] animate-pulse">
                            <div className="flex justify-between items-center mb-2">
                              <div className="h-4 w-24 bg-black/10 shimmer-bg rounded" />
                              <div className="h-4 w-12 bg-black/10 shimmer-bg rounded" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-3 w-full bg-black/5 shimmer-bg rounded" />
                              <div className="h-3 w-3/4 bg-black/5 shimmer-bg rounded" />
                            </div>
                            <div className="h-3 w-28 bg-black/5 shimmer-bg rounded" />
                          </div>
                        ))}
                      </div>
                    ) : addresses.length > 0 && !showAddAddressForm ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {addresses.map(addr => (
                            <div 
                              key={addr.id}
                              onClick={() => setSelectedAddressId(addr.id)}
                              className={`checkout-address-select-box ${selectedAddressId === addr.id ? 'active' : ''}`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold">{addr.fullName}</span>
                                {addr.isDefault && <span className="default-indicator-tag">Default</span>}
                              </div>
                              <p className="text-[0.72rem] text-black/70 leading-relaxed font-body">
                                {addr.addressLine1}
                                {addr.addressLine2 && `, ${addr.addressLine2}`}
                                <br />
                                {addr.city}, {addr.state} - {addr.postalCode}
                              </p>
                              <span className="text-[0.58rem] font-bold tracking-wider text-black/45 block mt-2">📞 {addr.phone}</span>
                              
                              {/* CRUD Triggers */}
                              <div className="address-card-actions">
                                <button
                                  onClick={(e) => handleEditAddressClick(addr, e)}
                                  className="address-action-btn edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => handleDuplicateAddressClick(addr, e)}
                                  className="address-action-btn edit"
                                >
                                  Duplicate
                                </button>
                                <button
                                  onClick={(e) => handleDeleteAddress(addr.id, e)}
                                  className="address-action-btn delete"
                                >
                                  Delete
                                </button>
                                {!addr.isDefault && (
                                  <button
                                    onClick={(e) => handleSetDefaultAddress(addr.id, e)}
                                    className="address-action-btn default"
                                  >
                                    Set Default
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => {
                            resetAddressForm();
                            setShowAddAddressForm(true);
                          }}
                          className="py-2.5 px-5 border border-black/15 text-xs font-bold tracking-widest uppercase hover:bg-black/5 transition-all duration-300"
                        >
                          + Deliver to New Address
                        </button>
                      </div>
                    ) : null}

                    {checkoutState !== 'LOADING_ADDRESSES' && (addresses.length === 0 || showAddAddressForm) && (
                      <div className="bg-[#FEFCF9] border border-black/5 p-6 max-w-xl">
                        <h4 className="font-heading text-lg font-light uppercase tracking-wide mb-5">
                          New Delivery Address
                        </h4>
                        
                        {addressError && (
                          <div className="p-3 bg-[#FF003C]/5 text-[#FF003C] text-xs font-bold uppercase tracking-wider mb-6">
                            {addressError}
                          </div>
                        )}

                        <form onSubmit={handleCreateAddress} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[0.58rem] font-bold uppercase tracking-wider text-black/50 block">Recipient Full Name</label>
                              <input
                                type="text" required
                                value={newAddress.fullName}
                                onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                                className="checkout-luxury-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[0.58rem] font-bold uppercase tracking-wider text-black/50 block">Contact Phone Number</label>
                              <input
                                type="text" required
                                value={newAddress.phone}
                                onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                                className="checkout-luxury-input"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[0.58rem] font-bold uppercase tracking-wider text-black/50 block">Address Line 1</label>
                            <input
                              type="text" required
                              value={newAddress.addressLine1}
                              onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                              className="checkout-luxury-input"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[0.58rem] font-bold uppercase tracking-wider text-black/50 block">Address Line 2 (Optional)</label>
                            <input
                              type="text"
                              value={newAddress.addressLine2}
                              onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })}
                              className="checkout-luxury-input"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[0.58rem] font-bold uppercase tracking-wider text-black/50 block">City</label>
                              <input
                                type="text" required
                                value={newAddress.city}
                                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                className="checkout-luxury-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[0.58rem] font-bold uppercase tracking-wider text-black/50 block">State</label>
                              <input
                                type="text" required
                                value={newAddress.state}
                                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                className="checkout-luxury-input"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[0.58rem] font-bold uppercase tracking-wider text-black/50 block">ZIP / PIN Code</label>
                              <input
                                type="text" required
                                value={newAddress.postalCode}
                                onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                                className="checkout-luxury-input"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 select-none">
                            <input
                              id="newAddressDefaultCheckbox"
                              type="checkbox"
                              checked={newAddress.isDefault}
                              onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                              className="accent-[#8B672F]"
                            />
                            <label htmlFor="newAddressDefaultCheckbox" className="text-[0.62rem] tracking-wider text-black/60 uppercase cursor-pointer">
                              Set as default delivery address
                            </label>
                          </div>

                          <div className="flex items-center gap-3 pt-3 border-t border-black/5">
                            <button
                              type="submit"
                              disabled={savingAddress}
                              className="py-2.5 px-6 bg-[#1C1B18] text-[#FEFCF9] hover:bg-[#8B672F] text-[0.65rem] font-bold tracking-widest uppercase transition-colors"
                              style={{ color: '#FEFCF9' }}
                            >
                              {savingAddress ? 'Saving...' : 'Save and Select'}
                            </button>
                            {addresses.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowAddAddressForm(false)}
                                className="py-2.5 px-6 border border-black/10 text-black/60 hover:text-black text-[0.65rem] font-bold tracking-widest uppercase transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Mobile Summary Panel */}
                    <div className="checkout-mobile-summary-wrapper">
                      {renderOrderSummary(true)}
                    </div>

                    {/* Step 1 Actions */}
                    <div className="checkout-step-actions">
                      <button
                        onClick={() => setIsCheckingOut(false)}
                        className="checkout-back-btn"
                      >
                        Cancel Checkout
                      </button>
                      <button
                        disabled={!selectedAddressId}
                        onClick={() => setCheckoutStep(2)}
                        className="checkout-primary-btn"
                      >
                        Continue to Delivery
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: DELIVERY METHOD */}
                {checkoutStep === 2 && (
                  <div className="space-y-6">
                    <div className="step-header pb-4 border-b border-black/8">
                      <h3 className="font-heading text-2xl font-light uppercase tracking-wide">2. Delivery Method</h3>
                      <p className="text-xs text-black/45 font-body">Choose a transit speed and method for your order shipping.</p>
                    </div>

                    <div className="space-y-3 max-w-xl">
                      <div 
                        onClick={() => setDeliveryMethod('STANDARD')}
                        className={`delivery-option-box ${deliveryMethod === 'STANDARD' ? 'active' : ''}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold">Standard Atelier Delivery</span>
                          <span className="text-xs font-bold text-[#8B672F]">
                            ₹{storeSettings ? parseFloat(storeSettings.shippingCharges) : 149}
                          </span>
                        </div>
                        <p className="text-[0.68rem] text-black/60 leading-relaxed font-body">
                          Arrives in 9 business days.
                        </p>
                      </div>

                      <div 
                        onClick={() => setDeliveryMethod('OWNER')}
                        className={`delivery-option-box ${deliveryMethod === 'OWNER' ? 'active' : ''}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold">Owner Delivery</span>
                          <span className="text-xs font-bold text-[#8B672F]">₹5,000</span>
                        </div>
                        <p className="text-[0.68rem] text-black/60 leading-relaxed font-body">
                          Hand-delivered by the store owner.
                        </p>
                      </div>
                    </div>

                    {/* Mobile Summary Panel */}
                    <div className="checkout-mobile-summary-wrapper">
                      {renderOrderSummary(true)}
                    </div>

                    {/* Step 2 Actions */}
                    <div className="checkout-step-actions">
                      <button
                        onClick={() => setCheckoutStep(1)}
                        className="checkout-back-btn"
                      >
                        Back to Address
                      </button>
                      <button
                        onClick={() => setCheckoutStep(3)}
                        className="checkout-primary-btn"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: PAYMENT METHOD */}
                {checkoutStep === 3 && (
                  <div className="space-y-6">
                    <div className="step-header pb-4 border-b border-black/8">
                      <h3 className="font-heading text-2xl font-light uppercase tracking-wide">3. Payment Method</h3>
                      <p className="text-xs text-black/45 font-body">Select your preferred payment method to complete your order.</p>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-3 max-w-xl">
                      <div 
                        onClick={() => {
                          setPaymentMethod('RAZORPAY');
                          window.dispatchEvent(new CustomEvent('payment_method_selected', { detail: { method: 'RAZORPAY' } }));
                        }}
                        className={`payment-option-box ${paymentMethod === 'RAZORPAY' ? 'active' : ''}`}
                        role="radio"
                        aria-checked={paymentMethod === 'RAZORPAY'}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setPaymentMethod('RAZORPAY')}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'RAZORPAY' ? 'border-[#1C1B18]' : 'border-black/20'}`}>
                            {paymentMethod === 'RAZORPAY' && <div className="w-2 h-2 rounded-full bg-[#1C1B18]" />}
                          </div>
                          <span className="text-xs font-bold">Secure Online Payment</span>
                        </div>
                        <p className="text-[0.68rem] text-black/60 leading-relaxed font-body pl-7">
                          Cards • UPI • Net Banking • Wallets
                        </p>
                      </div>

                      {COD_ENABLED && (
                        <div 
                          onClick={() => {
                            setPaymentMethod('COD');
                            window.dispatchEvent(new CustomEvent('payment_method_selected', { detail: { method: 'COD' } }));
                          }}
                          className={`payment-option-box ${paymentMethod === 'COD' ? 'active' : ''}`}
                          role="radio"
                          aria-checked={paymentMethod === 'COD'}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setPaymentMethod('COD')}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === 'COD' ? 'border-[#1C1B18]' : 'border-black/20'}`}>
                              {paymentMethod === 'COD' && <div className="w-2 h-2 rounded-full bg-[#1C1B18]" />}
                            </div>
                            <span className="text-xs font-bold">Cash on Delivery (COD)</span>
                          </div>
                          <p className="text-[0.68rem] text-black/60 leading-relaxed font-body pl-7">
                            Pay with cash upon delivery. No card details required.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mobile Summary Panel */}
                    <div className="checkout-mobile-summary-wrapper">
                      {renderOrderSummary(true)}
                    </div>

                    {/* Step Actions */}
                    <div className="checkout-step-actions">
                      <button
                        onClick={() => setCheckoutStep(2)}
                        className="checkout-back-btn"
                      >
                        Back to Delivery
                      </button>
                      <button
                        onClick={() => setCheckoutStep(4)}
                        className="checkout-primary-btn"
                      >
                        Continue to Review
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW ORDER */}
                {checkoutStep === 4 && (
                  <div className="space-y-6">
                    <div className="step-header pb-4 border-b border-black/8">
                      <h3 className="font-heading text-2xl font-light uppercase tracking-wide">4. Review and Place</h3>
                      <p className="text-xs text-black/45 font-body">Verify all delivery and ledger parameters before validating purchase.</p>
                    </div>

                    {/* Review Info Card */}
                    <div className="bg-[#FEFCF9] border border-black/5 p-6 space-y-6 text-left shadow-sm">
                      <div className="space-y-4">
                        {/* Shipping Destination */}
                        <div>
                          <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1.5">Shipping Destination</span>
                          {selectedAddress ? (
                            <div className="text-xs font-body text-black/80 leading-relaxed">
                              <p className="font-semibold text-black">{selectedAddress.fullName}</p>
                              <p>{selectedAddress.addressLine1}{selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''}</p>
                              <p>{selectedAddress.city}, {selectedAddress.state} - {selectedAddress.postalCode}</p>
                              <p className="text-[0.68rem] text-black/50 mt-1">📞 {selectedAddress.phone}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-[#FF003C] font-bold">No address selected. Please go back and select one.</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-black/5">
                          {/* Delivery Speed */}
                          <div>
                            <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Transit Method</span>
                            <span className="text-xs font-semibold text-black">
                              {deliveryMethod === 'STANDARD' && 'Standard Atelier Delivery'}
                              {deliveryMethod === 'EXPRESS' && 'Express Direct Air Courier'}
                              {deliveryMethod === 'OWNER' && 'Owner Hand-Delivery'}
                            </span>
                            <span className="text-[0.68rem] text-black/50 block mt-0.5">
                              {deliveryMethod === 'STANDARD' && `₹${shipping.toLocaleString('en-IN')} (Arrives in 9 days)`}
                              {deliveryMethod === 'EXPRESS' && `₹399 (Arrives in 3 days)`}
                              {deliveryMethod === 'OWNER' && `₹5,000 (Hand-delivered)`}
                            </span>
                          </div>

                          {/* Payment Preference */}
                          <div>
                            <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Payment Preference</span>
                            <span className="text-xs font-semibold text-[#8B672F] uppercase tracking-wider block">
                              {paymentMethod === 'RAZORPAY' ? 'Secure Online Payment (UPI / Card)' : 'Cash on Delivery (COD)'}
                            </span>
                            <span className="text-[0.68rem] text-black/50 block mt-0.5">
                              {paymentMethod === 'RAZORPAY' ? 'Processed via Razorpay gateway' : 'Pay at your doorstep'}
                            </span>
                          </div>
                        </div>

                        {/* Notes */}
                        {notes && (
                          <div className="pt-4 border-t border-black/5">
                            <span className="text-[0.62rem] font-bold text-black/40 uppercase tracking-widest block mb-1">Special Instructions / Notes</span>
                            <p className="text-xs font-body italic text-black/70 leading-relaxed bg-[#F7F3ED]/30 p-3 border border-black/5">
                              {notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mobile Summary Panel */}
                    <div className="checkout-mobile-summary-wrapper">
                      {renderOrderSummary(true)}
                    </div>

                    {/* Step Actions */}
                    <div className="checkout-step-actions">
                      <button
                        onClick={() => setCheckoutStep(3)}
                        className="checkout-back-btn"
                      >
                        Back to Payment
                      </button>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={placingOrder || !selectedAddressId}
                        className="checkout-primary-btn shadow-md"
                      >
                        {paymentMethod === 'RAZORPAY' ? 'Continue to Secure Payment' : 'Complete Purchase'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          <div className={`luxury-cart-summary-pane ${isCheckoutInProgress ? 'checkout-disabled-element' : ''}`}>
            {renderOrderSummary(false)}
          </div>

        </div>
      </main>

      {/* Custom Address Deletion Confirmation Modal */}
      {addressToDeleteId && (
        <div className="fixed inset-0 z-[11000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FEFCF9] border border-black/10 p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
            <h4 className="font-heading text-lg uppercase tracking-wide">Delete Address?</h4>
            <p className="text-xs text-black/60 font-body">Are you sure you want to permanently remove this delivery destination?</p>
            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={async () => {
                  const id = addressToDeleteId;
                  setAddressToDeleteId(null);
                  try {
                    const token = await getToken();
                    const res = await fetch(`${API_BASE_URL}/api/addresses/${id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                      setAddresses(addresses.filter(a => a.id !== id));
                      if (selectedAddressId === id) {
                        setSelectedAddressId('');
                      }
                      showToast('Address deleted successfully.', 'success');
                    } else {
                      const errData = await res.json();
                      showToast(errData.error || 'Failed to delete address.', 'error');
                    }
                  } catch (err) {
                    console.error(err);
                    showToast('Network error. Failed to delete address.', 'error');
                  }
                }}
                className="py-2 px-5 bg-[#FF003C] hover:bg-[#D00030] text-[#FEFCF9] text-[0.65rem] font-bold tracking-widest uppercase transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setAddressToDeleteId(null)}
                className="py-2 px-5 border border-black/10 text-black/60 hover:text-black text-[0.65rem] font-bold tracking-widest uppercase transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Checkout State Loading Overlay */}
      {isCheckoutInProgress && (
        <div className="checkout-overlay-loading">
          <div className="checkout-loading-spinner" />
          <div className="checkout-loading-text">
            {checkoutState === 'CREATING_ORDER' && 'Securing your fragrance order...'}
            {checkoutState === 'OPENING_RAZORPAY' && 'Initializing payment gateway...'}
            {checkoutState === 'VERIFYING_PAYMENT' && 'Verifying transaction signature...'}
          </div>
        </div>
      )}
    </div>
  );
}
