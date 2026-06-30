import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function PaymentFailurePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orderRef = searchParams.get('orderRef') || searchParams.get('orderReference');
  const reason = searchParams.get('reason') || 'failed'; // failed, cancelled, verification_failed

  useEffect(() => {
    // Dispatch payment_failed analytics event
    window.dispatchEvent(new CustomEvent('payment_failed', {
      detail: { orderId, reason }
    }));
  }, [orderId, reason]);

  const getContent = () => {
    switch (reason) {
      case 'cancelled':
        return {
          badge: 'Transaction Cancelled',
          title: 'Checkout Dismissed',
          description: 'The payment window was closed before completion. No funds have been deducted from your account. Your selections remain saved in your shopping bag.',
          iconColor: '#B08A50',
          iconSvg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )
        };
      case 'verification_failed':
        return {
          badge: 'Authentication Error',
          title: 'Signature Verification Failed',
          description: 'We encountered a secure handshake failure verifying your transaction with the payment gateway. If any amount has been debited, it will be automatically refunded within 3–5 business days.',
          iconColor: '#FF3B30',
          iconSvg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <line x1="12" y1="15" x2="12" y2="18" />
            </svg>
          )
        };
      case 'failed':
      default:
        return {
          badge: 'Payment Failure',
          title: 'Transaction Declined',
          description: 'The payment gateway was unable to authorize the transaction. This could be due to insufficient funds, card limitations, or a temporary gateway issue. Please try again or use another payment method.',
          iconColor: '#FF3B30',
          iconSvg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-[#F7F3ED] font-body text-[#1C1B18] pb-24 pt-12 select-none px-4">
      <div className="max-w-2xl mx-auto w-full">

        {/* Failure Icon & Header */}
        <div className="text-center mb-10">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-300"
            style={{ backgroundColor: '#1C1B18', color: content.iconColor }}
          >
            {content.iconSvg}
          </div>
          <span className="text-[0.58rem] font-bold tracking-[0.2em] text-[#B08A50] uppercase block mb-3">
            {content.badge}
          </span>
          <h1 className="font-heading text-3xl font-light uppercase tracking-wide mb-2">
            {content.title}
          </h1>
          <p className="text-xs text-black/45 font-body tracking-wide">
            Checkout was not completed successfully.
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-[#FEFCF9] border border-black/5 shadow-sm mb-6">
          <div className="px-8 py-8 border-b border-black/5">
            <p className="text-sm font-light text-black/70 leading-relaxed text-center max-w-md mx-auto">
              {content.description}
            </p>
          </div>

          {(orderRef || orderId) && (
            <div className="px-8 py-4 border-b border-black/5 flex justify-between items-center text-[0.62rem] font-bold tracking-wider text-black/40 uppercase">
              <span>Reference Order</span>
              <span className="font-mono text-xs text-[#1C1B18] font-bold">
                {orderRef ? `#${orderRef.toUpperCase()}` : `#${orderId.slice(-8).toUpperCase()}`}
              </span>
            </div>
          )}

          <div className="px-8 py-5 bg-[#F7F3ED]/40 text-center">
            <p className="text-[0.62rem] text-black/40">
              For assistance, contact our Concierge at{' '}
              <a href="mailto:support@decantatelier.in" className="text-[#B08A50] underline underline-offset-2 hover:text-[#1C1B18] transition-colors">
                support@decantatelier.in
              </a>
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { navigate('/cart'); }}
            className="flex-1 btn-lux-primary"
          >
            Retry Secure Payment
          </button>
          <button
            onClick={() => { navigate('/cart'); }}
            className="flex-1 btn-lux-secondary"
          >
            Return to Bag
          </button>
          <button
            onClick={() => { navigate('/shop'); }}
            className="flex-1 btn-lux-secondary"
          >
            Back to Shop
          </button>
        </div>

      </div>
    </div>
  );
}
