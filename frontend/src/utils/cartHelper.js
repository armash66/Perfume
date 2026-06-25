// Centralized Cart Helper to synchronize cart state in localStorage or database
// and dispatch custom events to update components like the Navbar.
import { showToast } from './toast.js';
import { CartStore } from './store.js';
import { API_BASE_URL } from './config.js';

export const getCart = () => {
  return CartStore.load();
};

export const saveCart = (cart) => {
  CartStore.save(cart);
};

// Sync database cart items to local storage cache
export const syncDbCartWithCache = async (token) => {
  return CartStore.sync(token);
};

// Merge guest local cart items into database cart on login
export const mergeCartToDb = async (token) => {
  return CartStore.merge(token);
};

let transactionCounter = 0;

const logMutation = (action, details) => {
  if (import.meta.env.DEV) {
    transactionCounter++;
    console.log(`\n====== Cart Mutation #${transactionCounter} ======`);
    console.log(`Action: ${action}`);
    console.log(`Item Key: ${details.itemKey || 'N/A'}`);
    console.log(`Old Qty: ${details.oldQty}`);
    console.log(`New Qty: ${details.newQty}`);
    console.log(`Status: ${details.status}`);
    if (details.error) console.log(`Error: ${details.error}`);
    console.log(`===================================\n`);
  }
};

const getItemKey = (id, size) => {
  return id + (size ? '_' + size : '');
};

const inFlightRequests = {};
const pendingQuantities = {};
const originalSnapshots = {};

const getRollbackItem = (oldItem, variantId, productId, size) => {
  const currentCart = [...CartStore.getState()];
  const idx = currentCart.findIndex(item => {
    if (item.variantId && variantId && item.variantId === variantId) {
      return true;
    }
    const itemProdId = item.productId || item.id;
    return itemProdId === productId && item.size === size;
  });
  return { currentCart, idx };
};

export const addToCart = async (product, sizeOption, quantity = 1, token = null) => {
  if (quantity <= 0) {
    return { success: false, reason: 'BAD_REQUEST', message: 'Quantity must be at least 1.' };
  }

  // Ensure sizeOption has a valid variantId
  if (!sizeOption.variantId) {
    const sizes = product.sizes || [];
    const match = sizes.find(s => s.size === sizeOption.size);
    if (match && match.variantId) {
      sizeOption.variantId = match.variantId;
    } else {
      showToast('Size variant is not available.', 'error');
      return { success: false, reason: 'BAD_REQUEST', message: 'Size variant not available.' };
    }
  }

  const itemKey = sizeOption.variantId || getItemKey(product.id, sizeOption.size);
  CartStore.startMutation(itemKey);

  const cart = [...CartStore.getState()];
  const sizeLabel = sizeOption.size || 'Default Size';
  
  const existingItemIndex = cart.findIndex(item => {
    if (item.variantId && sizeOption.variantId && item.variantId === sizeOption.variantId) {
      return true;
    }
    const itemProdId = item.productId || item.id;
    const currProdId = product.id || product.productId;
    return itemProdId === currProdId && item.size === sizeLabel;
  });

  const oldQty = existingItemIndex > -1 ? cart[existingItemIndex].quantity : 0;
  const newQty = oldQty + quantity;

  // Exact snapshot for rollback: deep clone before mutation
  const oldItem = existingItemIndex > -1 ? JSON.parse(JSON.stringify(cart[existingItemIndex])) : null;

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
  CartStore.save(cart);

  if (token) {
    try {
      logMutation('CREATE', { itemKey, oldQty, newQty, status: 'REQUESTING' });
      const res = await fetch(`${API_BASE_URL}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          variantId: sizeOption.variantId,
          quantity
        })
      });

      if (res.ok) {
        await CartStore.sync(token);
        CartStore.commit();
        showToast('Added to your shopping bag.', 'success');
        logMutation('CREATE', { itemKey, oldQty, newQty, status: 'SUCCESS' });

        // Dispatch custom event to trigger premium Mini Bag slide-out
        window.dispatchEvent(new CustomEvent('open-mini-bag', {
          detail: {
            productId: product.id,
            variantId: sizeOption.variantId,
            name: product.name,
            brand: product.brand,
            image: product.image || (product.images && (product.images[0]?.imageUrl || product.images[0])) || '',
            size: sizeLabel,
            price: sizeOption.price || product.price,
            quantity: newQty
          }
        }));

        // Dispatch future-ready analytics event hook
        window.dispatchEvent(new CustomEvent('mini_bag_opened', {
          detail: {
            productId: product.id,
            variantId: sizeOption.variantId,
            quantity: newQty
          }
        }));

        return { success: true };
      } else {
        // Precise rollback
        const { currentCart, idx } = getRollbackItem(oldItem, sizeOption.variantId, product.id, sizeLabel);
        if (idx > -1) {
          if (oldItem) {
            currentCart[idx] = oldItem;
          } else {
            currentCart.splice(idx, 1);
          }
        }
        CartStore.save(currentCart);
        CartStore.commit();

        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || 'Failed to sync with database.';
        const errDisplayMsg = errData.message || errMsg;
        showToast(errDisplayMsg, 'error');

        let reason = 'BAD_REQUEST';
        if (res.status === 400 && (errMsg === 'INSUFFICIENT_STOCK' || errMsg.toLowerCase().includes('stock'))) reason = 'OUT_OF_STOCK';
        if (res.status === 401) reason = 'UNAUTHORIZED';
        
        logMutation('CREATE', { itemKey, oldQty, newQty, status: 'FAILED', error: errMsg });
        return { success: false, reason, message: errMsg };
      }
    } catch (err) {
      // Precise rollback
      const { currentCart, idx } = getRollbackItem(oldItem, sizeOption.variantId, product.id, sizeLabel);
      if (idx > -1) {
        if (oldItem) {
          currentCart[idx] = oldItem;
        } else {
          currentCart.splice(idx, 1);
        }
      }
      CartStore.save(currentCart);
      CartStore.commit();

      console.error("Cart sync failed", err);
      showToast('Network error: Failed to sync with server.', 'error');
      logMutation('CREATE', { itemKey, oldQty, newQty, status: 'FAILED', error: err.message });
      return { success: false, reason: 'NETWORK', message: err.message };
    } finally {
      CartStore.endMutation(itemKey);
    }
  } else {
    CartStore.commit();
    showToast('Added to your local shopping bag.', 'success');
    logMutation('CREATE', { itemKey, oldQty, newQty, status: 'SUCCESS' });

    // Dispatch custom event to trigger premium Mini Bag slide-out
    window.dispatchEvent(new CustomEvent('open-mini-bag', {
      detail: {
        productId: product.id,
        variantId: sizeOption.variantId,
        name: product.name,
        brand: product.brand,
        image: product.image || (product.images && (product.images[0]?.imageUrl || product.images[0])) || '',
        size: sizeLabel,
        price: sizeOption.price || product.price,
        quantity: newQty
      }
    }));

    CartStore.endMutation(itemKey);
    return { success: true };
  }
};

export const updateQuantity = async (id, size, quantity, token = null) => {
  const itemKey = id + (size ? '_' + size : '');
  
  let cart = [...CartStore.getState()];
  const itemIndex = cart.findIndex(item => 
    (item.variantId && id === item.variantId) || 
    (item.id === id && item.size === size)
  );

  if (itemIndex === -1) {
    return { success: false, reason: 'NOT_FOUND', message: 'Item not found in cart.' };
  }

  const currentQty = cart[itemIndex].quantity;
  if (currentQty === quantity && !inFlightRequests[itemKey]) {
    return { success: true, reason: 'NO_OP' };
  }

  const dbCartItemId = cart[itemIndex].dbCartItemId;

  // Track original snapshot for sequence of mutations if not already set
  if (!originalSnapshots[itemKey]) {
    originalSnapshots[itemKey] = JSON.parse(JSON.stringify(cart[itemIndex]));
  }

  // Optimistic Update immediately in UI/store cache
  if (quantity <= 0) {
    cart = cart.filter((_, idx) => idx !== itemIndex);
  } else {
    cart[itemIndex].quantity = quantity;
  }
  CartStore.save(cart);

  if (!token || !dbCartItemId) {
    CartStore.commit();
    delete originalSnapshots[itemKey];
    logMutation('UPDATE', { itemKey, oldQty: currentQty, newQty: quantity, status: 'SUCCESS' });
    return { success: true };
  }

  if (inFlightRequests[itemKey]) {
    pendingQuantities[itemKey] = quantity;
    logMutation('UPDATE', { itemKey, oldQty: currentQty, newQty: quantity, status: 'QUEUED' });
    return { success: true, reason: 'QUEUED' };
  }

  const runRequest = async (targetQty) => {
    inFlightRequests[itemKey] = true;
    CartStore.startMutation(itemKey);

    logMutation('UPDATE', { itemKey, oldQty: currentQty, newQty: targetQty, status: 'REQUESTING' });

    try {
      let res;
      if (targetQty <= 0) {
        res = await fetch(`${API_BASE_URL}/api/cart/${dbCartItemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        res = await fetch(`${API_BASE_URL}/api/cart/${dbCartItemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ quantity: targetQty })
        });
      }

      if (res.ok) {
        await CartStore.sync(token);
        CartStore.commit();
        logMutation('UPDATE', { itemKey, oldQty: currentQty, newQty: targetQty, status: 'SUCCESS' });
      } else {
        // If this is the last request in the queue, roll back to original snapshot
        if (pendingQuantities[itemKey] === undefined) {
          const oldItem = originalSnapshots[itemKey];
          if (oldItem) {
            const currentCart = [...CartStore.getState()];
            const idx = currentCart.findIndex(item => 
              (item.variantId && oldItem.variantId && item.variantId === oldItem.variantId) || 
              (item.id === oldItem.id && item.size === oldItem.size)
            );
            if (idx > -1) {
              currentCart[idx] = oldItem;
            } else {
              // Re-insert at its original index if it was removed optimistically
              currentCart.splice(itemIndex, 0, oldItem);
            }
            CartStore.save(currentCart);
            CartStore.commit();
          }
          delete originalSnapshots[itemKey];
        }

        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || 'Failed to update quantity.';
        const errDisplayMsg = errData.message || errMsg;
        showToast(errDisplayMsg, 'error');

        let reason = 'BAD_REQUEST';
        if (res.status === 400 && (errMsg === 'INSUFFICIENT_STOCK' || errMsg.toLowerCase().includes('stock'))) reason = 'OUT_OF_STOCK';
        if (res.status === 401) reason = 'UNAUTHORIZED';
        
        logMutation('UPDATE', { itemKey, oldQty: currentQty, newQty: targetQty, status: 'FAILED', error: errMsg });
        return { success: false, reason, message: errMsg };
      }
    } catch (err) {
      if (pendingQuantities[itemKey] === undefined) {
        const oldItem = originalSnapshots[itemKey];
        if (oldItem) {
          const currentCart = [...CartStore.getState()];
          const idx = currentCart.findIndex(item => 
            (item.variantId && oldItem.variantId && item.variantId === oldItem.variantId) || 
            (item.id === oldItem.id && item.size === oldItem.size)
          );
          if (idx > -1) {
            currentCart[idx] = oldItem;
          } else {
            currentCart.splice(itemIndex, 0, oldItem);
          }
          CartStore.save(currentCart);
          CartStore.commit();
        }
        delete originalSnapshots[itemKey];
      }

      console.error("Cart sync failed", err);
      showToast('Network error: Failed to update quantity.', 'error');
      
      logMutation('UPDATE', { itemKey, oldQty: currentQty, newQty: targetQty, status: 'FAILED', error: err.message });
      return { success: false, reason: 'NETWORK', message: err.message };
    } finally {
      inFlightRequests[itemKey] = false;
      if (pendingQuantities[itemKey] !== undefined) {
        const nextQty = pendingQuantities[itemKey];
        delete pendingQuantities[itemKey];
        await runRequest(nextQty);
      } else {
        // Safe check: clear snapshot on final success
        delete originalSnapshots[itemKey];
        CartStore.endMutation(itemKey);
      }
    }
    return { success: true };
  };

  return runRequest(quantity);
};

export const removeFromCart = async (id, size, token = null) => {
  const itemKey = id + (size ? '_' + size : '');
  
  let cart = [...CartStore.getState()];
  const itemIndex = cart.findIndex(item => 
    (item.variantId && id === item.variantId) || 
    (item.id === id && item.size === size)
  );

  if (itemIndex === -1) {
    return { success: false, reason: 'NOT_FOUND', message: 'Item not found in cart.' };
  }

  const dbCartItemId = cart[itemIndex].dbCartItemId;

  delete pendingQuantities[itemKey];
  delete inFlightRequests[itemKey];
  delete originalSnapshots[itemKey];

  const currentQty = cart[itemIndex].quantity;
  const oldItem = JSON.parse(JSON.stringify(cart[itemIndex]));
  const updatedCart = cart.filter((_, idx) => idx !== itemIndex);
  CartStore.save(updatedCart);

  if (token && dbCartItemId) {
    CartStore.startMutation(itemKey);
    try {
      logMutation('DELETE', { itemKey, oldQty: currentQty, newQty: 0, status: 'REQUESTING' });
      const res = await fetch(`${API_BASE_URL}/api/cart/${dbCartItemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        await CartStore.sync(token);
        CartStore.commit();
        showToast('Selection removed.', 'success');
        logMutation('DELETE', { itemKey, oldQty: currentQty, newQty: 0, status: 'SUCCESS' });
        return { success: true };
      } else {
        // Precise rollback
        const currentCart = [...CartStore.getState()];
        const idx = currentCart.findIndex(item => 
          (item.variantId && oldItem.variantId && item.variantId === oldItem.variantId) || 
          (item.id === oldItem.id && item.size === oldItem.size)
        );
        if (idx === -1) {
          currentCart.splice(itemIndex, 0, oldItem);
        } else {
          currentCart[idx] = oldItem;
        }
        CartStore.save(currentCart);
        CartStore.commit();

        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || 'Failed to remove item.';
        const errDisplayMsg = errData.message || errMsg;
        showToast(errDisplayMsg, 'error');

        let reason = 'BAD_REQUEST';
        if (res.status === 401) reason = 'UNAUTHORIZED';
        logMutation('DELETE', { itemKey, oldQty: currentQty, newQty: 0, status: 'FAILED', error: errMsg });
        return { success: false, reason, message: errMsg };
      }
    } catch (err) {
      // Precise rollback
      const currentCart = [...CartStore.getState()];
      const idx = currentCart.findIndex(item => 
        (item.variantId && oldItem.variantId && item.variantId === oldItem.variantId) || 
        (item.id === oldItem.id && item.size === oldItem.size)
      );
      if (idx === -1) {
        currentCart.splice(itemIndex, 0, oldItem);
      } else {
        currentCart[idx] = oldItem;
      }
      CartStore.save(currentCart);
      CartStore.commit();

      console.error("Cart sync failed", err);
      showToast('Network error: Failed to remove item.', 'error');
      logMutation('DELETE', { itemKey, oldQty: currentQty, newQty: 0, status: 'FAILED', error: err.message });
      return { success: false, reason: 'NETWORK', message: err.message };
    } finally {
      CartStore.endMutation(itemKey);
    }
  } else {
    CartStore.commit();
    showToast('Selection removed.', 'success');
    logMutation('DELETE', { itemKey, oldQty: currentQty, newQty: 0, status: 'SUCCESS' });
    return { success: true };
  }
};

export const clearCart = () => {
  Object.keys(pendingQuantities).forEach(key => delete pendingQuantities[key]);
  Object.keys(inFlightRequests).forEach(key => delete inFlightRequests[key]);
  Object.keys(originalSnapshots).forEach(key => delete originalSnapshots[key]);
  
  CartStore.save([]);
  CartStore.commit();
  
  if (import.meta.env.DEV) {
    console.log('====== Cart Mutation clearCart ======');
    console.log('Status: SUCCESS (Memory and localStorage cleared)');
    console.log('=====================================\n');
  }
};
