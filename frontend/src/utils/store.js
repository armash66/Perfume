// Centralized State Store for Cart and Wishlist
// Pub/Sub subscription pattern for immediate react updates without localStorage polling.

import { showToast } from './toast.js';
import { API_BASE_URL } from './config.js';

let cartListeners = [];
let cartState = [];
let confirmedCartState = [];

let wishlistListeners = [];
let wishlistState = [];
let mutatingListeners = [];
let mutatingItems = new Set();

export const CartStore = {
  getMutatingItems() {
    return mutatingItems;
  },

  startMutation(itemKey) {
    mutatingItems.add(itemKey);
    this.dispatchMutating();
  },

  endMutation(itemKey) {
    mutatingItems.delete(itemKey);
    this.dispatchMutating();
  },

  subscribeMutating(listener) {
    mutatingListeners.push(listener);
    // Invoke immediately with current set copy
    listener(new Set(mutatingItems));
    return () => {
      mutatingListeners = mutatingListeners.filter(l => l !== listener);
    };
  },

  dispatchMutating() {
    const copy = new Set(mutatingItems);
    mutatingListeners.forEach(listener => {
      try {
        listener(copy);
      } catch (e) {
        console.error('Error in mutating listener:', e);
      }
    });
  },

  load() {
    try {
      cartState = JSON.parse(localStorage.getItem('cartItems') || '[]');
    } catch (e) {
      console.error('Failed to parse cart items:', e);
      cartState = [];
    }
    confirmedCartState = JSON.parse(JSON.stringify(cartState));
    this.dispatch();
    return cartState;
  },

  save(newCart) {
    cartState = newCart;
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartState));
    } catch (e) {
      console.error('Failed to save cart items:', e);
    }
    this.dispatch();
    // Dispatch standard window event for backward compatibility
    window.dispatchEvent(new Event('cart-updated'));
  },

  commit() {
    confirmedCartState = JSON.parse(JSON.stringify(cartState));
  },

  rollback() {
    cartState = JSON.parse(JSON.stringify(confirmedCartState));
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartState));
    } catch (e) {
      console.error('Failed to rollback cart items:', e);
    }
    this.dispatch();
    window.dispatchEvent(new Event('cart-updated'));
  },

  dispatch() {
    cartListeners.forEach(listener => {
      try {
        listener(cartState);
      } catch (e) {
        console.error('Error in CartStore listener:', e);
      }
    });
  },

  subscribe(listener) {
    cartListeners.push(listener);
    // Immediately invoke with current state
    listener(cartState);
    return () => {
      cartListeners = cartListeners.filter(l => l !== listener);
    };
  },

  getState() {
    return cartState;
  },

  async sync(token) {
    if (!token) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const dbCartItems = await res.json();
        const mappedCart = dbCartItems.map(item => {
          const prod = item.variant?.product || {};
          return {
            id: prod.id,
            productId: prod.id,
            variantId: item.variantId,
            dbCartItemId: item.id, // Store database CartItem CUID
            name: prod.name,
            brand: prod.brand,
            image: (prod.images && prod.images[0]?.imageUrl) || prod.image || '',
            size: item.variant?.size || 'Default Size',
            price: item.variant ? parseFloat(item.variant.price) : 0,
            quantity: item.quantity,
            label: ''
          };
        });
        this.save(mappedCart);
        this.commit();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to sync DB cart:', err);
      return false;
    }
  },

  async merge(token) {
    if (!token) return;
    const localCart = [...cartState];

    // If guest cart is empty, simply sync the database cart down to local
    if (localCart.length === 0) {
      await this.sync(token);
      return;
    }

    try {
      // 1. Fetch remote cart to compare
      const res = await fetch(`${API_BASE_URL}/api/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch remote cart for comparison');
      }
      const dbCartItems = await res.json();

      const remoteCart = dbCartItems.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
        dbCartItemId: item.id
      }));

      // Check if carts are identical (same variantIds and same quantities)
      const isIdentical = localCart.length === remoteCart.length && localCart.every(localItem => {
        const remoteItem = remoteCart.find(r => r.variantId === localItem.variantId);
        return remoteItem && remoteItem.quantity === localItem.quantity;
      });

      if (isIdentical) {
        // Load the server cart directly into cache without alerting the user
        const mappedCart = dbCartItems.map(item => {
          const prod = item.variant?.product || {};
          return {
            id: prod.id,
            productId: prod.id,
            variantId: item.variantId,
            dbCartItemId: item.id,
            name: prod.name,
            brand: prod.brand,
            image: (prod.images && prod.images[0]?.imageUrl) || prod.image || '',
            size: item.variant?.size || 'Default Size',
            price: item.variant ? parseFloat(item.variant.price) : 0,
            quantity: item.quantity,
            label: ''
          };
        });
        this.save(mappedCart);
        return;
      }

      // Merge:
      // Loop through local items and update or create them on the database
      let allUploaded = true;
      for (const localItem of localCart) {
        if (!localItem.variantId) continue;
        const remoteItem = remoteCart.find(r => r.variantId === localItem.variantId);
        
        let newQty = localItem.quantity;
        if (remoteItem) {
          // Sum quantities for matching variantId matches
          newQty = localItem.quantity + remoteItem.quantity;
        }

        const endpoint = remoteItem 
          ? `${API_BASE_URL}/api/cart/${remoteItem.dbCartItemId}`
          : `${API_BASE_URL}/api/cart`;
        
        const method = remoteItem ? 'PATCH' : 'POST';
        const bodyObj = remoteItem 
          ? { quantity: newQty } 
          : { variantId: localItem.variantId, quantity: newQty };

        const uploadRes = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bodyObj)
        });

        if (!uploadRes.ok) {
          allUploaded = false;
          console.error(`Failed to upload merged cart item: ${localItem.variantId}`);
          break;
        }
      }

      if (allUploaded) {
        await this.sync(token);
        showToast('Shopping bag synchronized.', 'success');
      } else {
        showToast('Failed to synchronize shopping bag.', 'warning');
      }
    } catch (err) {
      console.error('Failed to merge guest cart to DB:', err);
      showToast('Synchronization error occurred.', 'error');
    }
  }
};

export const WishlistStore = {
  load() {
    try {
      wishlistState = JSON.parse(localStorage.getItem('wishlist') || '[]');
    } catch (e) {
      console.error('Failed to parse wishlist:', e);
      wishlistState = [];
    }
    this.dispatch();
    return wishlistState;
  },

  save(newWishlist) {
    wishlistState = newWishlist;
    try {
      localStorage.setItem('wishlist', JSON.stringify(wishlistState));
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
    this.dispatch();
  },

  dispatch() {
    wishlistListeners.forEach(listener => {
      try {
        listener(wishlistState);
      } catch (e) {
        console.error('Error in WishlistStore listener:', e);
      }
    });
  },

  subscribe(listener) {
    wishlistListeners.push(listener);
    // Immediately invoke with current state
    listener(wishlistState);
    return () => {
      wishlistListeners = wishlistListeners.filter(l => l !== listener);
    };
  },

  getState() {
    return wishlistState;
  },

  toggle(itemId) {
    const exists = wishlistState.includes(itemId);
    const updated = exists 
      ? wishlistState.filter(id => id !== itemId) 
      : [...wishlistState, itemId];
    this.save(updated);
    return !exists; // returns true if added, false if removed
  }
};

// Initialize on load
CartStore.load();
WishlistStore.load();
