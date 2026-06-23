// Centralized Cart Helper to synchronize cart state in localStorage or database
// and dispatch custom events to update components like the Navbar.
import { showToast } from './toast.js';

export const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem('cartItems') || '[]');
  } catch (e) {
    console.error('Failed to parse cart items:', e);
    return [];
  }
};

export const saveCart = (cart) => {
  try {
    localStorage.setItem('cartItems', JSON.stringify(cart));
    // Dispatch event to sync navbar and other active listeners
    window.dispatchEvent(new Event('cart-updated'));
  } catch (e) {
    console.error('Failed to save cart items:', e);
  }
};

// Sync database cart items to local storage cache
export const syncDbCartWithCache = async (token) => {
  if (!token) return false;
  if (import.meta.env.DEV) {
    console.log('[Diagnostics] Cart Sync: Fetching cart items from Neon DB...');
  }
  try {
    const res = await fetch('http://localhost:5000/api/cart', {
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
      saveCart(mappedCart);
      if (import.meta.env.DEV) {
        console.log('[Diagnostics] Cart Sync: Successfully updated local cache from DB:', mappedCart);
      }
      return true;
    }
    if (import.meta.env.DEV) {
      console.warn(`[Diagnostics] Cart Sync: Fetch failed with server status ${res.status}`);
    }
    return false;
  } catch (err) {
    console.error('Failed to sync DB cart:', err);
    return false;
  }
};

// Merge guest local cart items into database cart on login
export const mergeCartToDb = async (token) => {
  if (!token) return;
  const localCart = getCart();

  if (import.meta.env.DEV) {
    console.log('[Diagnostics] Merge Cart: Guest cart queue checked.', localCart);
  }

  // If guest cart is empty, simply sync the database cart down to local
  if (localCart.length === 0) {
    const syncSuccess = await syncDbCartWithCache(token);
    if (!syncSuccess && import.meta.env.DEV) {
      console.warn('[Diagnostics] Merge Cart: Initial DB sync failed.');
    }
    return;
  }

  if (import.meta.env.DEV) {
    console.log(`[Diagnostics] Merge Cart: Processing merge for ${localCart.length} local item(s)`);
  }

  try {
    let allUploaded = true;
    for (const item of localCart) {
      if (item.variantId) {
        if (import.meta.env.DEV) {
          console.log(`[Diagnostics] Merge Cart: POSTing variant ${item.variantId} (qty: ${item.quantity})`);
        }
        const res = await fetch('http://localhost:5000/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            variantId: item.variantId,
            quantity: item.quantity
          })
        });

        if (!res.ok) {
          allUploaded = false;
          if (import.meta.env.DEV) {
            console.error(`[Diagnostics] Merge Cart: Failed to upload variant ${item.variantId} (status: ${res.status})`);
          }
          break; // Abort cycle immediately on error
        }
      }
    }

    if (allUploaded) {
      // Step 2: Fetch and verify DB cart response
      const syncSuccess = await syncDbCartWithCache(token);
      if (syncSuccess) {
        // Step 3: Atomic cache switch: local guest cache has been successfully replaced by the DB cart in syncDbCartWithCache
        showToast('Olfactory collection synchronized successfully.', 'success');
        if (import.meta.env.DEV) {
          console.log('[Diagnostics] Merge Cart: DB sync complete. Local cache replaced with DB cart.');
        }
      } else {
        if (import.meta.env.DEV) {
          console.error('[Diagnostics] Merge Cart: Local items merged, but final DB fetch failed.');
        }
        showToast('Account synchronized, but database cart view failed to load.', 'warning');
      }
    } else {
      showToast('Account cart synchronization failed. Preserving local selections.', 'error');
    }
  } catch (err) {
    console.error('Failed to merge guest cart to DB:', err);
    showToast('Database synchronization error occurred. Preserving local selections.', 'error');
  }
};

export const addToCart = async (product, sizeOption, quantity = 1, token = null) => {
  if (import.meta.env.DEV) {
    console.log('[Diagnostics] Add To Cart: Initiated', product.name, sizeOption.size, 'Quantity:', quantity, 'Token:', !!token);
  }

  // Ensure sizeOption has a valid variantId
  if (!sizeOption.variantId) {
    const sizes = product.sizes || [];
    const match = sizes.find(s => s.size === sizeOption.size);
    if (match && match.variantId) {
      sizeOption.variantId = match.variantId;
    } else {
      showToast('Size variant is not available.', 'error');
      if (import.meta.env.DEV) {
        console.error(`[CRITICAL DEVELOPMENT ERROR] addToCart failed: Product "${product.name}" size "${sizeOption.size}" has no variantId in sizes:`, product.sizes);
      }
      return;
    }
  }

  const cart = getCart();
  const sizeLabel = sizeOption.size || 'Default Size';
  
  const existingItemIndex = cart.findIndex(item => {
    if (item.variantId && sizeOption.variantId && item.variantId === sizeOption.variantId) {
      return true;
    }
    const itemProdId = item.productId || item.id;
    const currProdId = product.id || product.productId;
    return itemProdId === currProdId && item.size === sizeLabel;
  });
  
  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      productId: product.id,
      variantId: sizeOption.variantId,
      name: product.name,
      brand: product.brand,
      image: product.image || (product.images && product.images[0]) || '',
      size: sizeLabel,
      price: sizeOption.price || product.price,
      quantity: quantity,
      label: sizeOption.label || ''
    });
  }
  
  // Instant local update to keep UI highly responsive
  saveCart(cart);
  showToast('Added to your local shopping bag.', 'success');

  if (token) {
    // Sync to database in the background
    fetch('http://localhost:5000/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        variantId: sizeOption.variantId,
        quantity
      })
    }).then(res => {
      if (res.ok) {
        syncDbCartWithCache(token);
      } else {
        console.warn('[Diagnostics] Background DB sync failed on item add.');
      }
    }).catch(err => {
      console.error('Failed to sync added item in background:', err);
    });
  }
};

export const updateQuantity = async (id, size, quantity, token = null) => {
  if (import.meta.env.DEV) {
    console.log('[Diagnostics] Update Qty: ID:', id, 'Size:', size, 'Quantity:', quantity, 'Token:', !!token);
  }

  let cart = getCart();
  const itemIndex = cart.findIndex(item => 
    (item.variantId && id === item.variantId) || 
    (item.id === id && item.size === size)
  );

  let dbCartItemId = null;
  if (itemIndex > -1) {
    dbCartItemId = cart[itemIndex].dbCartItemId;
    if (quantity <= 0) {
      cart = cart.filter((_, idx) => idx !== itemIndex);
    } else {
      cart[itemIndex].quantity = quantity;
    }
    saveCart(cart);
  }

  if (token && dbCartItemId) {
    // Sync to database in the background
    fetch(`http://localhost:5000/api/cart/${dbCartItemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quantity })
    }).then(res => {
      if (res.ok) {
        syncDbCartWithCache(token);
      } else {
        console.warn('[Diagnostics] Background DB sync failed on quantity update.');
      }
    }).catch(err => {
      console.error('Failed to sync updated quantity in background:', err);
    });
  }
};

export const removeFromCart = async (id, size, token = null) => {
  if (import.meta.env.DEV) {
    console.log('[Diagnostics] Remove From Cart: ID:', id, 'Size:', size, 'Token:', !!token);
  }

  let cart = getCart();
  const itemIndex = cart.findIndex(item => 
    (item.variantId && id === item.variantId) || 
    (item.id === id && item.size === size)
  );

  let dbCartItemId = null;
  if (itemIndex > -1) {
    dbCartItemId = cart[itemIndex].dbCartItemId;
    const updatedCart = cart.filter((_, idx) => idx !== itemIndex);
    saveCart(updatedCart);
    showToast('Selection removed.', 'success');
  }

  if (token && dbCartItemId) {
    // Sync to database in the background
    fetch(`http://localhost:5000/api/cart/${dbCartItemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => {
      if (res.ok) {
        syncDbCartWithCache(token);
      } else {
        console.warn('[Diagnostics] Background DB sync failed on item remove.');
      }
    }).catch(err => {
      console.error('Failed to sync item removal in background:', err);
    });
  }
};

export const clearCart = () => {
  saveCart([]);
};
