// Centralized Cart Helper to synchronize cart state in localStorage
// and dispatch custom events to update components like the Navbar.

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
    
    // Calculate total item count
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    localStorage.setItem('cartCount', totalCount.toString());
    
    // Dispatch event to sync navbar and other active listeners
    window.dispatchEvent(new Event('cart-updated'));
  } catch (e) {
    console.error('Failed to save cart items:', e);
  }
};

export const addToCart = (product, sizeOption, quantity = 1) => {
  const cart = getCart();
  
  // Format size option fields (e.g. "5ml Decant" -> "5ML Decant")
  const sizeLabel = sizeOption.size || 'Default Size';
  
  // Check if item already exists with the same ID and Size
  const existingItemIndex = cart.findIndex(
    item => item.id === product.id && item.size === sizeLabel
  );
  
  if (existingItemIndex > -1) {
    // Increment quantity
    cart[existingItemIndex].quantity += quantity;
  } else {
    // Add new item with necessary visual fields
    cart.push({
      id: product.id,
      productId: product.id,
      variantId: sizeOption.id,
      name: product.name,
      brand: product.brand,
      image: product.image,
      size: sizeLabel,
      price: sizeOption.price || product.price,
      quantity: quantity,
      label: sizeOption.label || ''
    });
  }
  
  saveCart(cart);
};

export const updateQuantity = (id, size, quantity) => {
  let cart = getCart();
  
  const itemIndex = cart.findIndex(item => item.id === id && item.size === size);
  if (itemIndex > -1) {
    if (quantity <= 0) {
      // Remove item
      cart = cart.filter(item => !(item.id === id && item.size === size));
    } else {
      cart[itemIndex].quantity = quantity;
    }
    saveCart(cart);
  }
};

export const removeFromCart = (id, size) => {
  const cart = getCart();
  const updatedCart = cart.filter(item => !(item.id === id && item.size === size));
  saveCart(updatedCart);
};

export const clearCart = () => {
  saveCart([]);
};
