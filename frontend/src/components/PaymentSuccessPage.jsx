import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { API_BASE_URL } from '../utils/config.js';
import { clearCart } from '../utils/cartHelper.js';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSignedIn, getToken } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    // Clear cart immediately upon landing on the success page using the authoritative helper
    clearCart();

    // Analytics hook
    window.dispatchEvent(new CustomEvent('payment_success', {
      detail: { orderId, paymentId }
    }));

    async function fetchOrderDetails() {
      if (!orderId) {
        setError('Missing Order ID parameter.');
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          setError('Authentication token unavailable.');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to retrieve order details.');
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Network error. Failed to connect to server.');
      } finally {
        setLoading(false);
      }
    }

    if (isSignedIn) {
      fetchOrderDetails();
    } else {
      const timer = setTimeout(() => {
        if (!isSignedIn) {
          setError('Please sign in to view your order details.');
          setLoading(false);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F3ED] flex items-center justify-center font-body">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border border-[#B08A50] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[0.62rem] tracking-widest text-[#B08A50] uppercase">Confirming Your Order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3ED] font-body text-[#1C1B18] pb-24 pt-12 select-none px-4">
      <div className="max-w-2xl mx-auto">

        {/* Success Icon & Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-[#1C1B18] flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FEFCF9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-[0.58rem] font-bold tracking-[0.2em] text-[#B08A50] uppercase block mb-3">Decant Atelier</span>
          <h1 className="font-heading text-3xl font-light uppercase tracking-wide mb-2">Payment Successful</h1>
          <p className="text-xs text-black/45 font-body tracking-wide">Order Confirmed</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-[#FEFCF9] border border-black/5 shadow-sm mb-6">

          {/* Order Reference */}
          <div className="px-8 py-6 border-b border-black/5 flex justify-between items-center">
            <div>
              <span className="text-[0.58rem] font-bold tracking-[0.16em] text-black/35 uppercase block mb-1">Order Reference</span>
              <span className="text-sm font-bold text-[#1C1B18]">{order?.orderReference ? `#${order.orderReference}` : `#${(orderId || '').slice(-8).toUpperCase()}`}</span>
            </div>
            <div className="text-right">
              <span className="text-[0.58rem] font-bold tracking-[0.16em] text-black/35 uppercase block mb-1">
                {order?.paymentMethod === 'RAZORPAY' ? 'Payment ID' : 'Method'}
              </span>
              <span className="text-xs text-[#1C1B18] font-semibold">
                {order?.paymentMethod === 'RAZORPAY'
                  ? (paymentId || order?.payment?.transactionId || '—')
                  : 'Cash on Delivery'}
              </span>
            </div>
          </div>

          {/* Order Items */}
          {order?.orderItems && order.orderItems.length > 0 && (
            <div className="px-8 py-6 border-b border-black/5">
              <span className="text-[0.58rem] font-bold tracking-[0.16em] text-black/35 uppercase block mb-4">Items Ordered</span>
              <div className="space-y-3">
                {order.orderItems.map(item => {
                  const bottleName = item.bottleName;
                  const bottleColor = item.bottleColor;
                  const bottlePriceAdj = Number(item.bottlePriceAdjustment || 0);
                  const bottleText = bottleName 
                    ? `${bottleName}${bottleColor ? ` (${bottleColor})` : ''}` 
                    : null;

                  return (
                    <div key={item.id} className="flex justify-between items-start py-3 border-b border-black/5 last:border-0 gap-3">
                      <div className="flex gap-3 items-start">
                        {item.bottleImage && (
                          <img
                            src={item.bottleImage}
                            alt={item.bottleName || 'Bottle'}
                            className="w-10 h-10 object-cover rounded border border-black/10 flex-shrink-0 mt-0.5"
                          />
                        )}
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-[#1C1B18] block">{item.productName}</span>
                          <span className="text-[0.7rem] text-black/60 block">Size: {item.size}</span>
                          {bottleText && (
                            <div className="mt-1">
                              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-black/40 block">Bottle Selected</span>
                              <span className="text-[0.7rem] text-[#8B672F] font-semibold block">{bottleText}</span>
                              {bottlePriceAdj > 0 && (
                                <span className="text-[0.65rem] text-[#8B672F] font-bold uppercase tracking-wider block mt-0.5">
                                  Upgrade +₹{bottlePriceAdj.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          )}
                          <span className="text-[0.68rem] text-black/50 block">Qty: {item.quantity}</span>
                          {item.bottleSku && (
                            <span className="text-[0.62rem] text-black/35 font-mono block">SKU: {item.bottleSku}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold whitespace-nowrap pt-0.5">₹{(Number(item.priceAtPurchase) * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delivery Address */}
          {order?.address && (
            <div className="px-8 py-6 border-b border-black/5">
              <span className="text-[0.58rem] font-bold tracking-[0.16em] text-black/35 uppercase block mb-3">Delivery Address</span>
              <div className="text-xs text-black/65 leading-relaxed font-body space-y-0.5">
                <p className="font-semibold text-[#1C1B18]">{order.address.fullName}</p>
                <p>{order.address.addressLine1}{order.address.addressLine2 && `, ${order.address.addressLine2}`}</p>
                <p>{order.address.city}, {order.address.state} — {order.address.postalCode}</p>
                <p className="text-black/40 pt-1">📞 {order.address.phone}</p>
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="px-8 py-6 border-b border-black/5 space-y-2">
            {order && (
              <>
                <div className="flex justify-between text-xs text-black/50">
                  <span>Subtotal</span>
                  <span>₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</span>
                </div>
                {order.couponCode && (
                  <div className="flex justify-between items-start text-xs text-[#8B672F] py-1">
                    <div className="text-left">
                      <span className="font-bold block uppercase tracking-wider" style={{ fontSize: '0.62rem', letterSpacing: '0.05em' }}>Launch Invitation Applied</span>
                      <span className="font-heading font-light block" style={{ fontSize: '0.72rem' }}>{order.couponCode}</span>
                    </div>
                    <span className="font-semibold text-right">You saved ₹{Number(order.discountAmount || 0).toLocaleString('en-IN')} on this order.</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-black/50">
                  <span>Shipping</span>
                  <span className="text-[#B08A50]">{Number(order.shippingFee || 0) === 0 ? 'Free' : `₹${Number(order.shippingFee).toLocaleString('en-IN')}`}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-black/5">
              <span className="text-[0.62rem] font-bold uppercase tracking-wider">Total Paid</span>
              <span className="font-heading text-xl font-semibold text-[#B08A50]">
                ₹{Number(order?.total || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Estimated Delivery */}
          <div className="px-8 py-5 border-b border-black/5 flex justify-between items-center">
            <span className="text-[0.58rem] font-bold tracking-[0.16em] text-black/35 uppercase">Estimated Delivery</span>
            <span className="text-xs font-semibold text-[#1C1B18]">3–5 Business Days</span>
          </div>

          {/* Help */}
          <div className="px-8 py-5 bg-[#F7F3ED]/60">
            <p className="text-[0.62rem] text-black/40 text-center">
              Need help with your order?{' '}
              <a href="mailto:support@decantatelier.in" className="text-[#B08A50] underline underline-offset-2 hover:text-[#1C1B18] transition-colors">
                support@decantatelier.in
              </a>
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { navigate('/profile'); }}
            className="flex-1 btn-lux-primary"
          >
            View Orders
          </button>
          <button
            onClick={() => { navigate('/shop'); }}
            className="flex-1 btn-lux-secondary"
          >
            Continue Shopping
          </button>
        </div>

      </div>
    </div>
  );
}
