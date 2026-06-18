"use client";

import { useState, useEffect, useMemo } from 'react';
import { getCart, updateQuantity, removeFromCart } from '../utils/cartHelper';

export default function CartPage({ onBackToShop }) {
  const [cartItems, setCartItems] = useState([]);

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

  // Calculate Subtotal
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  // Free Shipping configuration
  const FREE_SHIPPING_THRESHOLD = 1000;
  const SHIPPING_COST = 90;

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
    alert(`Proceeding to checkout with total amount: ₹${grandTotal.toLocaleString('en-IN')}`);
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-empty-container font-body select-none">
        <div className="cart-empty-content">
          <div className="cart-empty-icon-wrapper">
            <svg className="cart-empty-icon" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h2 className="cart-empty-title font-heading">Your Shopping Bag is Empty</h2>
          <p className="cart-empty-text">Looks like you haven't added any premium fragrances to your collection yet.</p>
          <button onClick={handleBackToShop} className="cart-empty-btn uppercase tracking-wider font-bold">
            Shop Our Collection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-wrapper bg-[#FCFAF7] min-h-screen py-10 font-body select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb */}
        <div className="text-[0.6rem] font-bold tracking-[3px] text-[#C4A85A] uppercase mb-8">
          <span className="cursor-pointer text-[#C4A85A]/60 hover:text-[#0F3D3E] transition-colors" onClick={handleBackToShop}>HOME</span>
          <span className="mx-2 text-[#C4A85A]/40">&gt;</span>
          <span className="text-[#0F3D3E]">YOUR SHOPPING BAG</span>
        </div>

        <h1 className="cart-page-title font-heading mb-10 text-3xl font-extrabold text-[#0F3D3E] tracking-wide">
          Your Shopping Bag
        </h1>

        <div className="cart-grid">
          
          {/* LEFT COLUMN: Cart Items */}
          <div className="cart-items-column">
            {cartItems.map((item) => {
              const itemTotal = item.price * item.quantity;
              return (
                <div key={`${item.id}-${item.size}`} className="cart-item-card">
                  {/* Square Image */}
                  <div className="cart-item-img-container bg-[#FFF8E7]/30">
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
            })}
          </div>

          {/* RIGHT COLUMN: Order Summary */}
          <div className="cart-summary-column">
            <div className="cart-summary-card">
              <h2 className="cart-summary-title font-heading">ORDER SUMMARY</h2>
              
              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span>SUBTOTAL</span>
                  <span className="font-bold text-[#0F3D3E]">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="cart-summary-row">
                  <span>SHIPPING</span>
                  <span className="font-bold text-[#0F3D3E]">
                    {shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>

              {/* Free Delivery Banner */}
              {subtotal > 0 && (
                <div className={`cart-shipping-banner ${subtotal >= FREE_SHIPPING_THRESHOLD ? 'free-unlocked' : ''}`}>
                  {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                    <div className="shipping-banner-text font-bold text-center text-xs text-[#10B981] flex items-center justify-center gap-1.5 py-1">
                      <i className="fas fa-circle-check"></i>
                      <span>CONGRATULATIONS! FREE SHIPPING UNLOCKED</span>
                    </div>
                  ) : (
                    <div className="shipping-banner-inner">
                      <span className="shipping-banner-text">
                        ADD ₹{neededForFreeShipping.toLocaleString('en-IN')} MORE TO UNLOCK FREE DELIVERY
                      </span>
                      <button onClick={handleBackToShop} className="shipping-add-more-btn">
                        ADD MORE
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

              <button onClick={handleContinueToCheckout} className="cart-checkout-btn">
                <span>CONTINUE TO CHECKOUT</span>
                <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
