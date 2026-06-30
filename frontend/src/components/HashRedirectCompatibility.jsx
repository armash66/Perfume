import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Intercepts legacy hash-based URLs (e.g. /#shop, /#product-lattafa-khamrah)
 * and permanently redirects them to clean path equivalents.
 *
 * Only routing hashes are redirected. Legitimate scroll anchors like
 * #reviews, #collection, #top are preserved.
 */
export default function HashRedirectCompatibility() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#' || hash === '#main') return;

    const raw = hash.replace('#', '');
    const [segment, queryString] = raw.split('?');

    // Map old hash routes to new clean paths
    const routeMap = {
      shop: '/shop',
      collection: '/shop',
      wishlist: '/wishlist',
      cart: '/cart',
      categories: '/categories',
      gifting: '/gifting',
      profile: '/profile',
      admin: '/admin',
      about: '/about',
      shipping: '/shipping',
      returns: '/refund',
      terms: '/terms',
      privacy: '/privacy',
      authenticity: '/authenticity',
      'payment-success': '/payment/success',
      'payment-failure': '/payment/failure',
    };

    let cleanPath = null;

    if (routeMap[segment]) {
      cleanPath = routeMap[segment];
    } else if (segment.startsWith('product-')) {
      const slug = segment.replace('product-', '');
      cleanPath = `/product/${slug}`;
    } else if (segment.startsWith('product/')) {
      const slug = segment.replace('product/', '');
      cleanPath = `/product/${slug}`;
    }

    // Only redirect if this is a routing hash, not a scroll anchor
    if (cleanPath) {
      const search = queryString ? `?${queryString}` : '';
      navigate(`${cleanPath}${search}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
}
