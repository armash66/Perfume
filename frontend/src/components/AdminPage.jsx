import { useState, useEffect, useMemo } from 'react';
import { useAuth, useUser, SignInButton, SignOutButton } from '@clerk/clerk-react';
import { showToast } from '../utils/toast.js';
import { clearCart } from '../utils/cartHelper.js';
import { CartStore } from '../utils/store.js';
import './AdminPage.css';
import { API_BASE_URL, sanitizeImageUrl } from '../utils/config.js';

export default function AdminPage() {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: userLoaded } = useUser();


  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Core Data Lists
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Settings states
  const [settingsTab, setSettingsTab] = useState('store');
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'Decant Atelier',
    supportEmail: 'concierge@decantatelier.com',
    supportPhone: '+91 97681 88453',
    codEnabled: true,
    shippingCharges: 100,
    freeShippingThreshold: 1999,
    razorpayKey: 'rzp_test_AtelierKey2026',
    razorpaySecret: '••••••••••••••••••••••••'
  });

  // Operators user management (derived from database users where role is ADMIN)
  const operators = useMemo(() => {
    return users.filter(u => u.role === 'ADMIN').map(u => ({
      id: u.id,
      name: u.name || 'Co-Administrator',
      email: u.email,
      role: 'ADMIN',
      permissions: { orders: true, catalog: true, customers: true, gateway: true }
    }));
  }, [users]);

  // Details Drawers & Modals State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProductAnalytics, setSelectedProductAnalytics] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Search, Filter & Sort States
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('');
  const [productSort, setProductSort] = useState({ field: 'name', direction: 'asc' });

  const [categorySearch, setCategorySearch] = useState('');
  const [categorySort, setCategorySort] = useState({ field: 'name', direction: 'asc' });

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('ALL');
  const [inventorySort, setInventorySort] = useState({ field: 'productName', direction: 'asc' });

  const [logSearch, setLogSearch] = useState('');
  const [logReasonFilter, setLogReasonFilter] = useState('ALL');
  const [logSort, setLogSort] = useState({ field: 'date', direction: 'desc' });

  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [orderSort, setOrderSort] = useState({ field: 'createdAt', direction: 'desc' });

  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [paymentSort, setPaymentSort] = useState({ field: 'paidDate', direction: 'desc' });

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSort, setCustomerSort] = useState({ field: 'totalSpent', direction: 'desc' });

  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState('ALL');
  const [reviewSort, setReviewSort] = useState({ field: 'productName', direction: 'asc' });

  const [dashboardTimeframe, setDashboardTimeframe] = useState('ALL'); // ALL, 24H, 7D, 30D

  // Form States
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    brand: '',
    featured: false,
    isActive: true,
    categoryId: '',
    images: [{ imageUrl: '', altText: '', position: 0 }],
    variants: [
      { size: '2ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true },
      { size: '5ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true },
      { size: '10ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true }
    ]
  });

  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' });

  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Helper to construct request headers
  const getAdminHeaders = async () => {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const token = await getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Clerk token retrieval failed:', err);
    }
    return headers;
  };

  // 1. Verify admin role on load
  useEffect(() => {
    async function checkAdminRole() {
      if (!isSignedIn) {
        setIsAdmin(false);
        setCheckingRole(false);
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          setIsAdmin(false);
          setCheckingRole(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const profile = await res.json();
          setIsAdmin(profile.role === 'ADMIN');
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Error checking admin role:', err);
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    }

    if (authLoaded) {
      checkAdminRole();
    }
  }, [isSignedIn, authLoaded]);

  async function fetchCoreData() {
    try {
      setLoadingData(true);
      const headers = await getAdminHeaders();

      // Fetch Categories
      const catRes = await fetch(`${API_BASE_URL}/api/categories`);
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }

      // Fetch Admin Products (all details, variants, image sets, metrics)
      const prodRes = await fetch(`${API_BASE_URL}/api/admin/products`, { headers });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // Fetch Orders
      const orderRes = await fetch(`${API_BASE_URL}/api/admin/orders?status=ALL`, { headers });
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(orderData);
      }

      // Fetch Users
      const userRes = await fetch(`${API_BASE_URL}/api/admin/users`, { headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }

      // Fetch Reviews Moderation list
      const revRes = await fetch(`${API_BASE_URL}/api/admin/reviews`, { headers });
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviews(revData);
      }

      // Fetch Inventory Audit Logs
      const logRes = await fetch(`${API_BASE_URL}/api/admin/inventory-logs`, { headers });
      if (logRes.ok) {
        const logData = await logRes.json();
        setInventoryLogs(logData);
      }

      // Fetch Dashboard Stats
      try {
        const dashRes = await fetch(`${API_BASE_URL}/api/admin/dashboard`, { headers });
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setDashboardStats(dashData);
        }
      } catch (dashErr) {
        console.error('Failed to fetch admin dashboard stats:', dashErr);
      }

      // Fetch Store Settings
      try {
        const settingsRes = await fetch(`${API_BASE_URL}/api/admin/settings`, { headers });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setStoreSettings({
            ...settingsData,
            razorpaySecret: settingsData.razorpaySecret ? '••••••••••••••••••••••••' : ''
          });
        }
      } catch (settingsErr) {
        console.error('Failed to fetch store settings from DB:', settingsErr);
      }

      // Fetch Payments Ledger
      try {
        const payRes = await fetch(`${API_BASE_URL}/api/admin/payments`, { headers });
        if (payRes.ok) {
          const payData = await payRes.json();
          setPayments(payData);
        }
      } catch (payErr) {
        console.error('Failed to fetch payments ledger:', payErr);
      }

    } catch (err) {
      console.error('Error syncing admin console data feeds:', err);
    } finally {
      setLoadingData(false);
    }
  }

  // 2. Fetch data based on active tab
  useEffect(() => {
    if (!isAdmin) return;
    fetchCoreData();
  }, [isAdmin]);

  // Bypasses removed for Production Hardening

  // --- ACTION HANDLERS ---

  // Order status update timeline pipeline
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  // Product submission handler (supports general, dynamic variants, dynamic image collections)
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const headers = await getAdminHeaders();
      const method = editingProduct ? 'PATCH' : 'POST';
      const url = editingProduct 
        ? `${API_BASE_URL}/api/products/${editingProduct.id}` 
        : `${API_BASE_URL}/api/products`;

      const payload = {
        ...productForm,
        categoryId: productForm.categoryId || null,
        variants: productForm.variants.map(v => ({
          ...v,
          price: parseFloat(v.price),
          stock: parseInt(v.stock) || 0,
          lowStockThreshold: parseInt(v.lowStockThreshold) || 5
        }))
      };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowProductModal(false);
        setEditingProduct(null);
        fetchCoreData();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to save product configurations');
      }
    } catch (err) {
      setErrorMsg('Network error saving product.');
    }
  };

  // Delete product configuration
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product? This action is permanent.')) return;
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchCoreData();
      }
    } catch (err) {
      console.error('Delete product failed:', err);
    }
  };

  // Archive / toggle product active status
  const handleToggleProductActive = async (prod) => {
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/products/${prod.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: !prod.isActive })
      });
      if (res.ok) {
        fetchCoreData();
      }
    } catch (err) {
      console.error('Toggle active status failed:', err);
    }
  };

  // Create category configuration
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.slug) return;
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: categoryForm.name, slug: categoryForm.slug })
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories([...categories, newCat]);
        setCategoryForm({ name: '', slug: '' });
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  // Duplicate product template
  const handleDuplicateProduct = (prod) => {
    setEditingProduct(null);
    setProductForm({
      name: `${prod.name} (Copy)`,
      slug: `${prod.slug}-copy`,
      description: prod.description || '',
      brand: prod.brand || '',
      featured: false,
      isActive: true,
      categoryId: prod.categoryId || '',
      images: prod.images && prod.images.length > 0 
        ? prod.images.map(img => ({ imageUrl: img.imageUrl, altText: img.altText || '', position: img.position })) 
        : [{ imageUrl: '', altText: '', position: 0 }],
      variants: prod.variants && prod.variants.length > 0 
        ? prod.variants.map(v => ({ size: v.size, price: v.price.toString(), stock: v.stock.toString(), sku: `${v.sku}-COPY`, lowStockThreshold: v.lowStockThreshold || 5, isActive: true })) 
        : [
            { size: '2ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true },
            { size: '5ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true },
            { size: '10ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true }
          ]
    });
    setErrorMsg('');
    setShowProductModal(true);
  };

  // DB-Backed Single Variant manual stock adjustment
  const handleRestockInventory = async (sku, newStock) => {
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/admin/inventory/adjust`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sku,
          newStock: parseInt(newStock),
          reason: 'RESTOCK',
          note: 'Operator Manual Adjustment'
        })
      });
      if (res.ok) {
        fetchCoreData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to adjust stock count', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // DB-Backed Bulk restock of all low stock variants (+20 units)
  const handleBulkRestock = async () => {
    const lowStockItems = inventoryItems.filter(item => item.status !== 'In Stock');
    if (lowStockItems.length === 0) {
      showToast('All items are currently fully stocked.', 'success');
      return;
    }
    
    setLoadingData(true);
    try {
      const headers = await getAdminHeaders();
      for (const item of lowStockItems) {
        const newStock = item.stock + 20;
        await fetch(`${API_BASE_URL}/api/admin/inventory/adjust`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sku: item.sku,
            newStock,
            reason: 'RESTOCK',
            note: 'System Bulk Restock trigger'
          })
        });
      }
      showToast(`Bulk restock complete! Elevated ${lowStockItems.length} low stock variants by +20 units.`, 'success');
      fetchCoreData();
    } catch (err) {
      console.error('Bulk restock failed:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Review status approval/hide moderation
  const handleReviewStatus = async (reviewId, approve) => {
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ approved: approve })
      });
      if (res.ok) {
        setReviews(reviews.map(r => r.id === reviewId ? { ...r, approved: approve } : r));
      }
    } catch (err) {
      console.error('Failed to moderate review:', err);
    }
  };

  // Review delete moderation
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Moderator Action: Are you sure you want to delete this review?')) return;
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setReviews(reviews.filter(r => r.id !== reviewId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Settings saving and operator role toggle handler
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(storeSettings)
      });
      if (res.ok) {
        const updated = await res.json();
        setStoreSettings({
          ...updated,
          razorpaySecret: updated.razorpaySecret ? '••••••••••••••••••••••••' : ''
        });
        showToast('Configurations saved successfully.', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save settings.', 'error');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Network error saving settings.', 'error');
    }
  };

  const handleToggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (newRole === 'USER' && users.filter(u => u.role === 'ADMIN').length <= 1) {
      showToast('Security Protocol: You must keep at least one administrator to avoid lockout.', 'warning');
      return;
    }
    
    setLoadingData(true);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        fetchCoreData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update user role', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error updating user role.', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  // Product edit modal opener
  const startEditProduct = async (prod) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name || '',
      slug: prod.slug || '',
      description: prod.description || '',
      brand: prod.brand || '',
      featured: !!prod.featured,
      isActive: prod.isActive !== undefined ? prod.isActive : true,
      categoryId: prod.categoryId || '',
      images: prod.images && prod.images.length > 0 
        ? prod.images.map(img => ({ imageUrl: img.imageUrl, altText: img.altText || '', position: img.position })) 
        : [{ imageUrl: '', altText: '', position: 0 }],
      variants: prod.variants && prod.variants.length > 0 
        ? prod.variants.map(v => ({ size: v.size, price: v.price.toString(), stock: v.stock.toString(), sku: v.sku || '', lowStockThreshold: v.lowStockThreshold || 5, isActive: v.isActive })) 
        : [
            { size: '2ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true },
            { size: '5ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true },
            { size: '10ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true }
          ]
    });
    setErrorMsg('');
    setShowProductModal(true);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      slug: '',
      description: '',
      brand: '',
      featured: false,
      isActive: true,
      categoryId: '',
      images: [{ imageUrl: '', altText: '', position: 0 }],
      variants: [
        { size: '2ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true },
        { size: '5ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true },
        { size: '10ml Decant', price: '', stock: '20', sku: '', lowStockThreshold: 5, isActive: true }
      ]
    });
    setErrorMsg('');
    setShowProductModal(true);
  };

  // Dynamic Product Form Fields helpers
  const addImageField = () => {
    setProductForm({
      ...productForm,
      images: [...productForm.images, { imageUrl: '', altText: '', position: productForm.images.length }]
    });
  };

  const removeImageField = (idx) => {
    setProductForm({
      ...productForm,
      images: productForm.images.filter((_, i) => i !== idx)
    });
  };

  const updateImageField = (idx, field, val) => {
    const updated = productForm.images.map((img, i) => 
      i === idx ? { ...img, [field]: val } : img
    );
    setProductForm({ ...productForm, images: updated });
  };

  const addVariantField = () => {
    setProductForm({
      ...productForm,
      variants: [...productForm.variants, { size: '', price: '', stock: '0', sku: '', lowStockThreshold: 5, isActive: true }]
    });
  };

  const removeVariantField = (idx) => {
    setProductForm({
      ...productForm,
      variants: productForm.variants.filter((_, i) => i !== idx)
    });
  };

  const updateVariantField = (idx, field, val) => {
    const updated = productForm.variants.map((v, i) => 
      i === idx ? { ...v, [field]: val } : v
    );
    setProductForm({ ...productForm, variants: updated });
  };

  // --- GENERAL HELPER FOR SORTING ---
  const sortData = (list, sortState, defaultField = 'name') => {
    const { field, direction } = sortState;
    if (!field) return list;
    const sorted = [...list];
    sorted.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (field === 'date' || field === 'createdAt' || field === 'paidDate' || field === 'joinedDate') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      } else {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // --- MEMORIZED / CALCULATED ANALYTICS METRICS ---

  // Dynamic Dashboard Timeframe Filtered Orders
  const filteredOrdersForStats = useMemo(() => {
    if (dashboardTimeframe === 'ALL') return orders;
    const now = new Date().getTime();
    let limitMs = 0;
    if (dashboardTimeframe === '24H') limitMs = 24 * 60 * 60 * 1000;
    else if (dashboardTimeframe === '7D') limitMs = 7 * 24 * 60 * 60 * 1000;
    else if (dashboardTimeframe === '30D') limitMs = 30 * 24 * 60 * 60 * 1000;
    
    const cutoff = now - limitMs;
    return orders.filter(o => {
      const orderTime = new Date(o.createdAt).getTime();
      return orderTime >= cutoff;
    });
  }, [orders, dashboardTimeframe]);

  // Product sales velocity chart calculations
  const productSalesChart = useMemo(() => {
    if (!selectedProductAnalytics) return null;
    
    const pointsCount = 7;
    const now = new Date();
    const bucketMs = 7 * 24 * 60 * 60 * 1000;
    
    const buckets = Array.from({ length: pointsCount }).map((_, idx) => {
      const start = new Date(now.getTime() - (pointsCount - 1 - idx) * bucketMs);
      const end = new Date(start.getTime() + bucketMs);
      return { start, end, count: 0 };
    });
    
    orders.forEach(o => {
      if (o.status === 'CANCELLED') return;
      const oTime = new Date(o.createdAt).getTime();
      
      o.orderItems.forEach(item => {
        if (item.productId === selectedProductAnalytics.id) {
          buckets.forEach(b => {
            if (oTime >= b.start.getTime() && oTime < b.end.getTime()) {
              b.count += item.quantity;
            }
          });
        }
      });
    });
    
    const maxCount = Math.max(...buckets.map(b => b.count), 2);
    
    const points = buckets.map((b, idx) => {
      const x = 10 + idx * 60;
      const y = 70 - (b.count / maxCount) * 55;
      return { x, y };
    });
    
    const makeDPath = (pts) => {
      if (pts.length === 0) return '';
      return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    };
    
    const makeDAreaPath = (pts) => {
      if (pts.length === 0) return '';
      const line = makeDPath(pts);
      return `${line} L ${pts[pts.length-1].x} 80 L ${pts[0].x} 80 Z`;
    };
    
    return {
      linePath: makeDPath(points),
      areaPath: makeDAreaPath(points),
      hasSales: buckets.some(b => b.count > 0)
    };
  }, [orders, selectedProductAnalytics]);

  const filteredProductsData = useMemo(() => {
    const list = products.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.brand?.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = productCatFilter === '' || p.categoryId === productCatFilter;
      return matchesSearch && matchesCategory;
    });
    return sortData(list, productSort);
  }, [products, productSearch, productCatFilter, productSort]);

  const filteredCategoriesData = useMemo(() => {
    const list = categories.filter(c => {
      return c.name?.toLowerCase().includes(categorySearch.toLowerCase()) || c.slug?.toLowerCase().includes(categorySearch.toLowerCase());
    });
    
    const { field, direction } = categorySort;
    if (field === 'productCount') {
      const sorted = [...list];
      sorted.sort((a, b) => {
        const countA = products.filter(p => p.categoryId === a.id).length;
        const countB = products.filter(p => p.categoryId === b.id).length;
        return direction === 'asc' ? countA - countB : countB - countA;
      });
      return sorted;
    }
    return sortData(list, categorySort);
  }, [categories, categorySearch, categorySort, products]);

  const inventoryItems = useMemo(() => {
    const items = [];
    products.forEach(p => {
      if (!p.variants) return;
      p.variants.forEach(v => {
        let status = 'In Stock';
        if (v.stock === 0) status = 'Out of Stock';
        else if (v.stock <= v.lowStockThreshold) status = 'Low Stock';

        items.push({
          productName: p.name,
          sku: v.sku,
          size: v.size,
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
          status,
          isActive: v.isActive && p.isActive,
          productId: p.id
        });
      });
    });
    
    const list = items.filter(item => {
      const matchesSearch = item.productName?.toLowerCase().includes(inventorySearch.toLowerCase()) || item.sku?.toLowerCase().includes(inventorySearch.toLowerCase());
      
      let matchesFilter = true;
      if (inventoryFilter === 'LOW_STOCK') matchesFilter = item.status === 'Low Stock';
      else if (inventoryFilter === 'OUT_OF_STOCK') matchesFilter = item.status === 'Out of Stock';
      else if (inventoryFilter === 'ACTIVE') matchesFilter = item.isActive;
      else if (inventoryFilter === 'INACTIVE') matchesFilter = !item.isActive;
      
      return matchesSearch && matchesFilter;
    });

    return sortData(list, inventorySort, 'productName');
  }, [products, inventoryFilter, inventorySearch, inventorySort]);

  const filteredLogs = useMemo(() => {
    const list = inventoryLogs.filter(log => {
      const matchesSearch = log.productName?.toLowerCase().includes(logSearch.toLowerCase()) || log.variantSize?.toLowerCase().includes(logSearch.toLowerCase()) || log.adminUser?.toLowerCase().includes(logSearch.toLowerCase());
      const matchesFilter = logReasonFilter === 'ALL' || log.reason === logReasonFilter;
      return matchesSearch && matchesFilter;
    });
    return sortData(list, logSort, 'date');
  }, [inventoryLogs, logReasonFilter, logSearch, logSort]);

  const filteredOrdersData = useMemo(() => {
    const list = orders.filter(o => {
      const clientName = o.user?.name || 'Collector';
      const matchesSearch = o.id?.toLowerCase().includes(orderSearch.toLowerCase()) || clientName.toLowerCase().includes(orderSearch.toLowerCase()) || o.user?.email?.toLowerCase().includes(orderSearch.toLowerCase());
      const matchesStatus = orderFilter === 'ALL' || o.status === orderFilter;
      return matchesSearch && matchesStatus;
    });
    
    const { field, direction } = orderSort;
    if (field === 'customer') {
      const sorted = [...list];
      sorted.sort((a, b) => {
        const nameA = (a.user?.name || 'Collector').toLowerCase();
        const nameB = (b.user?.name || 'Collector').toLowerCase();
        return direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
      return sorted;
    }
    return sortData(list, orderSort, 'createdAt');
  }, [orders, orderSearch, orderFilter, orderSort]);

  const paymentsData = useMemo(() => {
    const list = payments.filter(p => {
      const matchesSearch = (p.id || '').toLowerCase().includes(paymentSearch.toLowerCase()) || 
                            (p.orderId || '').toLowerCase().includes(paymentSearch.toLowerCase()) || 
                            (p.customerName || '').toLowerCase().includes(paymentSearch.toLowerCase()) || 
                            (p.transactionId || '').toLowerCase().includes(paymentSearch.toLowerCase());
      let matchesFilter = true;
      if (paymentFilter === 'FAILED') matchesFilter = p.status === 'FAILED';
      else if (paymentFilter === 'PENDING_COD') matchesFilter = p.status === 'PENDING' && p.provider === 'COD';
      else if (paymentFilter === 'SUCCESS') matchesFilter = p.status === 'SUCCESS';
      return matchesSearch && matchesFilter;
    });
    
    return sortData(list, paymentSort, 'paidDate');
  }, [payments, paymentFilter, paymentSearch, paymentSort]);

  const customersData = useMemo(() => {
    const list = users.map(u => {
      const ordersCount = u.orders?.length || 0;
      const totalSpent = u.orders?.reduce((sum, o) => sum + parseFloat(o.total), 0) || 0;
      return {
        name: u.name || 'Collector',
        email: u.email,
        phone: u.phone || 'N/A',
        ordersCount,
        totalSpent,
        joinedDate: u.createdAt,
        addresses: u.addresses || []
      };
    });

    const filtered = list.filter(c => {
      return (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) || 
             (c.email || '').toLowerCase().includes(customerSearch.toLowerCase()) || 
             (c.phone || '').toLowerCase().includes(customerSearch.toLowerCase());
    });

    return sortData(filtered, customerSort, 'totalSpent');
  }, [users, customerSearch, customerSort]);

  const filteredReviewsData = useMemo(() => {
    const list = reviews.filter(r => {
      const matchesSearch = r.productName?.toLowerCase().includes(reviewSearch.toLowerCase()) || r.customerName?.toLowerCase().includes(reviewSearch.toLowerCase()) || r.comment?.toLowerCase().includes(reviewSearch.toLowerCase());
      
      let matchesFilter = true;
      if (reviewFilter === 'APPROVED') matchesFilter = r.approved;
      else if (reviewFilter === 'PENDING') matchesFilter = !r.approved;
      
      return matchesSearch && matchesFilter;
    });
    return sortData(list, reviewSort, 'productName');
  }, [reviews, reviewFilter, reviewSearch, reviewSort]);

  // Star rating distributions breakdown (Star 1-5 percentages)
  const reviewsRatingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (counts[r.rating] !== undefined) counts[r.rating]++;
    });
    const total = reviews.length || 1;
    return Object.keys(counts).map(star => ({
      star: parseInt(star),
      count: counts[star],
      percentage: Math.round((counts[star] / total) * 100)
    })).sort((a,b) => b.star - a.star);
  }, [reviews]);

  // Dynamic category sales performance breakdown
  const categorySalesPerformance = useMemo(() => {
    const catSales = {};
    categories.forEach(c => {
      catSales[c.name] = { name: c.name, revenue: 0, units: 0 };
    });
    filteredOrdersForStats.forEach(o => {
      o.orderItems.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const catName = prod?.category || 'Uncategorized';
        if (!catSales[catName]) {
          catSales[catName] = { name: catName, revenue: 0, units: 0 };
        }
        catSales[catName].revenue += parseFloat(item.priceAtPurchase) * item.quantity;
        catSales[catName].units += item.quantity;
      });
    });
    const result = Object.values(catSales);
    const maxRevenue = Math.max(...result.map(c => c.revenue), 1);
    return result.map(c => ({
      ...c,
      percentage: Math.round((c.revenue / maxRevenue) * 100)
    })).sort((a,b) => b.revenue - a.revenue);
  }, [filteredOrdersForStats, categories, products]);

  // Dynamic KPI Aggregations
  const KPI = useMemo(() => {
    let revToday = 0;
    let revMonth = dashboardStats ? (dashboardStats.totalRevenue || 0) : 0;
    let ordsToday = 0;
    let pendingOrds = dashboardStats ? (dashboardStats.pendingOrders || 0) : 0;
    const todayStr = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    filteredOrdersForStats.forEach(o => {
      if (o.status === 'CANCELLED') return;
      const orderDate = new Date(o.createdAt);
      const totalAmount = parseFloat(o.total) || 0;
      
      if (orderDate.toDateString() === todayStr) {
        revToday += totalAmount;
        ordsToday += 1;
      }
      if (!dashboardStats && orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear) {
        revMonth += totalAmount;
      }
      if (!dashboardStats && o.status === 'PENDING') {
        pendingOrds += 1;
      }
    });

    const lowStockCount = dashboardStats 
      ? (dashboardStats.lowStockVariants ? dashboardStats.lowStockVariants.length : 0)
      : inventoryItems.filter(i => i.status !== 'In Stock').length;

    return {
      revenueToday: revToday,
      revenueThisMonth: revMonth,
      ordersToday: ordsToday,
      pendingOrders: pendingOrds,
      totalCustomers: dashboardStats ? (dashboardStats.totalUsers || 0) : customersData.length,
      totalProducts: products.length,
      lowStockVariants: lowStockCount,
      aov: dashboardStats 
        ? (dashboardStats.totalOrders > 0 ? (dashboardStats.totalRevenue || 0) / dashboardStats.totalOrders : 0)
        : (filteredOrdersForStats.length > 0 ? (revMonth / filteredOrdersForStats.length) : 0)
    };
  }, [filteredOrdersForStats, products, inventoryItems, customersData, dashboardStats]);

  const generateChartPaths = useMemo(() => {
    // We will generate 7 points
    const pointsCount = 7;
    const now = new Date();
    
    // Determine time buckets based on dashboardTimeframe
    let bucketMs = 24 * 60 * 60 * 1000; // default 1 day buckets for 7 days
    if (dashboardTimeframe === '24H') {
      bucketMs = 4 * 60 * 60 * 1000; // 4 hours buckets
    } else if (dashboardTimeframe === '30D') {
      bucketMs = 5 * 24 * 60 * 60 * 1000; // 5 days buckets
    } else if (dashboardTimeframe === 'ALL') {
      bucketMs = 30 * 24 * 60 * 60 * 1000; // 30 days buckets
    }
    
    const buckets = Array.from({ length: pointsCount }).map((_, idx) => {
      const start = new Date(now.getTime() - (pointsCount - 1 - idx) * bucketMs);
      const end = new Date(start.getTime() + bucketMs);
      return { start, end, revenue: 0, count: 0, label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) };
    });
    
    // Populate buckets
    orders.forEach(o => {
      if (o.status === 'CANCELLED') return;
      const oTime = new Date(o.createdAt).getTime();
      buckets.forEach(b => {
        if (oTime >= b.start.getTime() && oTime < b.end.getTime()) {
          b.revenue += parseFloat(o.total) || 0;
          b.count += 1;
        }
      });
    });
    
    // Scale points to fit a viewBox of 500x120
    const maxRev = Math.max(...buckets.map(b => b.revenue), 1000);
    const maxCount = Math.max(...buckets.map(b => b.count), 5);
    
    const revPoints = buckets.map((b, idx) => {
      const x = 10 + idx * 80; // 10 to 490
      const y = 110 - (b.revenue / maxRev) * 90; // y goes from 110 (min) to 20 (max)
      return { x, y };
    });
    
    const countPoints = buckets.map((b, idx) => {
      const x = 10 + idx * 80;
      const y = 110 - (b.count / maxCount) * 90;
      return { x, y };
    });
    
    const makeDPath = (pts) => {
      if (pts.length === 0) return '';
      return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    };
    
    const makeDAreaPath = (pts) => {
      if (pts.length === 0) return '';
      const line = makeDPath(pts);
      return `${line} L ${pts[pts.length-1].x} 120 L ${pts[0].x} 120 Z`;
    };
    
    return {
      revenueLine: makeDPath(revPoints),
      revenueArea: makeDAreaPath(revPoints),
      countLine: makeDPath(countPoints),
      countArea: makeDAreaPath(countPoints),
      buckets
    };
  }, [orders, dashboardTimeframe]);


  // CSV Exports helpers
  const downloadCsv = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventoryCsv = () => {
    let csv = 'Product,SKU,Size,Current Stock,Low Stock Threshold,Status\n';
    inventoryItems.forEach(i => {
      csv += `"${i.productName}","${i.sku}","${i.size}",${i.stock},${i.lowStockThreshold},"${i.status}"\n`;
    });
    downloadCsv(csv, 'decant_atelier_inventory_manifest.csv');
  };

  const exportProductsCsv = () => {
    let csv = 'Product,Brand,Category,Variants,Rating,Sold Units,Revenue,Status\n';
    filteredProductsData.forEach(p => {
      csv += `"${p.name}","${p.brand}","${p.category || ''}",${p.variantsCount},${p.avgRating || 0},${p.unitsSold},${p.revenueGenerated},"${p.isActive ? 'Active' : 'Archived'}"\n`;
    });
    downloadCsv(csv, 'decant_atelier_products_catalog.csv');
  };

  const exportCategoriesCsv = () => {
    let csv = 'Category Name,Slug,Products Count\n';
    filteredCategoriesData.forEach(c => {
      csv += `"${c.name}","${c.slug}",${getProductCountForCategory(c.id)}\n`;
    });
    downloadCsv(csv, 'decant_atelier_categories.csv');
  };

  const exportOrdersCsv = () => {
    let csv = 'Order ID,Date,Customer Name,Customer Email,Items Count,Total,Payment Method,Status\n';
    filteredOrdersData.forEach(o => {
      csv += `"${o.id}","${new Date(o.createdAt).toLocaleString('en-IN')}","${o.user?.name || 'Collector'}","${o.user?.email || 'N/A'}",${o.orderItems?.length || 1},${o.total},"${o.paymentMethod}","${o.status}"\n`;
    });
    downloadCsv(csv, 'decant_atelier_orders_ledger.csv');
  };

  const exportPaymentsCsv = () => {
    let csv = 'Ledger ID,Order ID,Customer,Method,Transaction ID,Amount,Status,Date\n';
    paymentsData.forEach(p => {
      csv += `"${p.id}","${p.orderId}","${p.customerName}","${p.provider}","${p.transactionId}",${p.amount},"${p.status}","${new Date(p.paidDate).toLocaleString('en-IN')}"\n`;
    });
    downloadCsv(csv, 'decant_atelier_payments_settlement.csv');
  };

  const exportCustomersCsv = () => {
    let csv = 'Customer Name,Email,Phone,Orders Count,LTV (Total Spent),Joined Date\n';
    customersData.forEach(c => {
      csv += `"${c.name}","${c.email}","${c.phone}",${c.ordersCount},${c.totalSpent},"${new Date(c.joinedDate).toLocaleDateString('en-IN')}"\n`;
    });
    downloadCsv(csv, 'decant_atelier_customers_directory.csv');
  };

  const exportReviewsCsv = () => {
    let csv = 'Product Name,Customer Name,Email,Rating,Title,Comment,Status\n';
    filteredReviewsData.forEach(r => {
      csv += `"${r.productName}","${r.customerName}","${r.customerEmail}",${r.rating},"${r.title || ''}","${r.comment.replace(/"/g, '""') || ''}","${r.approved ? 'Approved' : 'Pending'}"\n`;
    });
    downloadCsv(csv, 'decant_atelier_reviews_moderation.csv');
  };

  const exportLogsCsv = () => {
    let csv = 'Audit ID,Date,Product,Variant,Old Stock,New Stock,Change,Reason,Note\n';
    filteredLogs.forEach(l => {
      csv += `"${l.id}","${new Date(l.date).toLocaleString('en-IN')}","${l.productName}","${l.variantSize}",${l.oldStock},${l.newStock},${l.changeAmount},"${l.reason}","${l.adminUser}"\n`;
    });
    downloadCsv(csv, 'decant_atelier_inventory_audit_logs.csv');
  };

  const handleSortToggle = (field, currentSort, setSort) => {
    const isAsc = currentSort.field === field && currentSort.direction === 'asc';
    setSort({ field, direction: isAsc ? 'desc' : 'asc' });
  };

  const renderSortIndicator = (field, currentSort) => {
    if (currentSort.field !== field) return null;
    return <span className="admin-sort-indicator">{currentSort.direction === 'asc' ? ' ▲' : ' ▼'}</span>;
  };

  // Category counts details
  const getProductCountForCategory = (catId) => {
    return products.filter(p => p.categoryId === catId).length;
  };

  // --- SCREEN RENDERS ---

  if (!authLoaded || !userLoaded || checkingRole) {
    return (
      <div className="min-h-screen bg-[#F7F3ED] text-gray-800 flex items-center justify-center font-sans">
        <div className="text-center bg-white border border-black/8 p-8 rounded-xl shadow-sm">
          <p className="text-gray-900 mb-2 font-bold text-xl tracking-wide animate-pulse">Accessing Secure Vault...</p>
          <p className="text-xs text-gray-500">Verifying administrative credentials.</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#F7F3ED] text-gray-800 flex items-center justify-center font-sans px-4">
        <div className="max-w-md w-full text-center bg-white border border-black/8 p-8 rounded-xl shadow-sm relative overflow-hidden">
          <h2 className="text-2xl font-bold tracking-tight mb-3 text-gray-900">Admin Control Panel</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Administrative access is restricted to authorized coordinators. Please authenticate to continue.
          </p>
          <SignInButton mode="modal">
            <button className="w-full py-3 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-all duration-200 cursor-pointer">
              Admin Authenticate
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F3ED] text-gray-800 flex items-center justify-center font-sans px-4">
        <div className="max-w-md w-full text-center bg-white border border-black/8 p-8 rounded-xl shadow-sm relative overflow-hidden">
          <h2 className="text-2xl font-bold tracking-tight mb-3 text-red-600">Access Denied</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Forbidden: Your account does not have administrative privileges. Please switch to an authorized coordinator account.
          </p>
          <SignOutButton>
            <button onClick={() => { CartStore.setAuthenticated(false); clearCart(); }} className="w-full py-3 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-all duration-200 cursor-pointer">
              Sign Out / Switch Account
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">Decant Atelier Admin</div>
        <ul className="admin-sidebar-menu">
          <li>
            <button onClick={() => setActiveTab('dashboard')} className={`admin-sidebar-btn ${activeTab === 'dashboard' ? 'active' : ''}`}>
              <span>Dashboard</span>
              {KPI.pendingOrders > 0 && <span className="admin-badge pending">{KPI.pendingOrders}</span>}
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('products')} className={`admin-sidebar-btn ${activeTab === 'products' ? 'active' : ''}`}>
              <span>Products</span>
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('categories')} className={`admin-sidebar-btn ${activeTab === 'categories' ? 'active' : ''}`}>
              <span>Categories</span>
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('inventory')} className={`admin-sidebar-btn ${activeTab === 'inventory' ? 'active' : ''}`}>
              <span>Inventory</span>
              {KPI.lowStockVariants > 0 && <span className="admin-badge pending">{KPI.lowStockVariants}</span>}
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('inventory_logs')} className={`admin-sidebar-btn ${activeTab === 'inventory_logs' ? 'active' : ''}`}>
              <span>Inventory Logs</span>
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('orders')} className={`admin-sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}>
              <span>Orders</span>
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('payments')} className={`admin-sidebar-btn ${activeTab === 'payments' ? 'active' : ''}`}>
              <span>Payments</span>
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('customers')} className={`admin-sidebar-btn ${activeTab === 'customers' ? 'active' : ''}`}>
              <span>Customers</span>
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('reviews')} className={`admin-sidebar-btn ${activeTab === 'reviews' ? 'active' : ''}`}>
              <span>Reviews</span>
              {reviews.filter(r => !r.approved).length > 0 && <span className="admin-badge pending">{reviews.filter(r => !r.approved).length}</span>}
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab('settings')} className={`admin-sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`}>
              <span>Settings</span>
            </button>
          </li>
        </ul>
        <div className="admin-sidebar-footer">
          <button onClick={() => { window.location.hash = ''; }} className="admin-btn-secondary">
            Storefront
          </button>
          <SignOutButton redirectUrl="/">
            <button onClick={() => { CartStore.setAuthenticated(false); clearCart(); }} className="admin-btn-danger">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content">
        
        {/* Header Title Banner */}
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-title">
              {activeTab === 'dashboard' && 'Dashboard Summary'}
              {activeTab === 'products' && 'Product Configurations'}
              {activeTab === 'categories' && 'Fragrance Category Index'}
              {activeTab === 'inventory' && 'Inventory Control Center'}
              {activeTab === 'inventory_logs' && 'Inventory Ledger Logs'}
              {activeTab === 'orders' && 'Orders Pipeline Fulfillments'}
              {activeTab === 'payments' && 'Payments Ledger Audit'}
              {activeTab === 'customers' && 'Registered Collectors Profile'}
              {activeTab === 'reviews' && 'Reviews & Moderation Center'}
              {activeTab === 'settings' && 'Store Settings & Permissions'}
            </h1>
            <div className="admin-page-subtitle">Atelier Control Console | Production Live</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {activeTab === 'dashboard' && (
              <select
                className="admin-select"
                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                value={dashboardTimeframe}
                onChange={(e) => setDashboardTimeframe(e.target.value)}
              >
                <option value="ALL">All-Time Trends</option>
                <option value="24H">Last 24 Hours</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
              </select>
            )}
            <button onClick={fetchCoreData} className="admin-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>Sync Live Feeds</button>
          </div>
        </header>

        {/* Global Loading Overlay Indicator */}
        {loadingData && (
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600 }}>
            Syncing data feeds with live database...
          </div>
        )}

        {/* --- TABS RENDERING --- */}

        {/* 1. Dashboard View */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* KPI Cards Grid */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-label">Revenue Today</div>
                <div className="admin-stat-value">₹{KPI.revenueToday.toLocaleString('en-IN')}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Revenue ({dashboardTimeframe === 'ALL' ? 'All Time' : (dashboardTimeframe === '24H' ? '24h' : (dashboardTimeframe === '7D' ? '7d' : '30d'))})</div>
                <div className="admin-stat-value">₹{KPI.revenueThisMonth.toLocaleString('en-IN')}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Orders Today</div>
                <div className="admin-stat-value">{KPI.ordersToday}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Pending Orders</div>
                <div className="admin-stat-value">{KPI.pendingOrders}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Total Customers</div>
                <div className="admin-stat-value">{KPI.totalCustomers}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Total Products</div>
                <div className="admin-stat-value">{KPI.totalProducts}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Low Stock Variants</div>
                <div className="admin-stat-value">{KPI.lowStockVariants}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Average Order Value</div>
                <div className="admin-stat-value">₹{Math.round(KPI.aov).toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Visual Charts Row */}
            <div className="admin-grid-2">
              <div className="admin-card">
                <h3 className="admin-card-title">Revenue Trend ({dashboardTimeframe === 'ALL' ? 'All-Time' : (dashboardTimeframe === '24H' ? '24 Hours' : (dashboardTimeframe === '7D' ? 'Last 7 Days' : 'Last 30 Days'))})</h3>
                <svg className="admin-chart-svg" viewBox="0 0 500 155" style={{ height: '155px' }}>
                  <line x1="0" y1="90" x2="100%" y2="90" className="admin-chart-grid" />
                  <line x1="0" y1="60" x2="100%" y2="60" className="admin-chart-grid" />
                  <line x1="0" y1="30" x2="100%" y2="30" className="admin-chart-grid" />
                  {generateChartPaths.revenueLine ? (
                    <>
                      <path d={generateChartPaths.revenueLine} className="admin-chart-line" />
                      <path d={generateChartPaths.revenueArea} className="admin-chart-area" />
                    </>
                  ) : (
                    <text x="250" y="70" textAnchor="middle" style={{ fill: '#9ca3af', fontSize: '11px' }}>No revenue logs in this period</text>
                  )}
                  {generateChartPaths.buckets.map((b, idx) => (
                    <text key={idx} x={10 + idx * 80} y={145} textAnchor="middle" className="admin-chart-axis-text">
                      {b.label}
                    </text>
                  ))}
                </svg>
              </div>

              <div className="admin-card">
                <h3 className="admin-card-title">Orders Volume ({dashboardTimeframe === 'ALL' ? 'All-Time' : (dashboardTimeframe === '24H' ? '24 Hours' : (dashboardTimeframe === '7D' ? 'Last 7 Days' : 'Last 30 Days'))})</h3>
                <svg className="admin-chart-svg" viewBox="0 0 500 155" style={{ height: '155px' }}>
                  <line x1="0" y1="90" x2="100%" y2="90" className="admin-chart-grid" />
                  <line x1="0" y1="60" x2="100%" y2="60" className="admin-chart-grid" />
                  <line x1="0" y1="30" x2="100%" y2="30" className="admin-chart-grid" />
                  {generateChartPaths.countLine ? (
                    <>
                      <path d={generateChartPaths.countLine} className="admin-chart-line" style={{ stroke: '#10b981' }} />
                      <path d={generateChartPaths.countArea} className="admin-chart-area" style={{ fill: 'rgba(16, 185, 129, 0.04)' }} />
                    </>
                  ) : (
                    <text x="250" y="70" textAnchor="middle" style={{ fill: '#9ca3af', fontSize: '11px' }}>No orders in this period</text>
                  )}
                  {generateChartPaths.buckets.map((b, idx) => (
                    <text key={idx} x={10 + idx * 80} y={145} textAnchor="middle" className="admin-chart-axis-text">
                      {b.label}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Performance Breakdowns Grid */}
            <div className="admin-grid-3">
              {/* Best Selling Perfumes */}
              <div className="admin-card">
                <h3 className="admin-card-title">Top Selling Perfumes</h3>
                <div className="admin-table-wrapper" style={{ border: 'none' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Fragrance</th>
                        <th style={{ textAlign: 'right' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.filter(p => p.unitsSold > 0).slice(0, 5).map(prod => (
                        <tr key={prod.id}>
                          <td style={{ fontWeight: 600 }}>{prod.name}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₹{prod.revenueGenerated.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                      {products.filter(p => p.unitsSold > 0).length === 0 && (
                        <tr>
                          <td colSpan="2" style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>No products sold yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Best Performing Categories */}
              <div className="admin-card">
                <h3 className="admin-card-title">Category Revenue</h3>
                <div className="admin-category-distribution">
                  {categorySalesPerformance.map(cat => (
                    <div className="admin-category-row" key={cat.name}>
                      <div className="admin-category-label">
                        <span>{cat.name}</span>
                        <span>₹{cat.revenue.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="admin-category-bar-bg">
                        <div className="admin-category-bar-fill" style={{ width: `${cat.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method Distribution */}
              <div className="admin-card">
                <h3 className="admin-card-title">Payment Method Share</h3>
                <div className="admin-category-distribution" style={{ marginTop: '0.5rem' }}>
                  <div className="admin-category-row">
                    <div className="admin-category-label">
                      <span>Cash on Delivery (COD)</span>
                      <span>{orders.filter(o => o.paymentMethod === 'COD').length} Orders</span>
                    </div>
                    <div className="admin-category-bar-bg">
                      <div className="admin-category-bar-fill" style={{ width: `${Math.round((orders.filter(o => o.paymentMethod === 'COD').length / (orders.length || 1)) * 100)}%`, backgroundColor: '#f59e0b' }} />
                    </div>
                  </div>
                  <div className="admin-category-row" style={{ marginTop: '1rem' }}>
                    <div className="admin-category-label">
                      <span>Razorpay gateway</span>
                      <span>{orders.filter(o => o.paymentMethod === 'RAZORPAY').length} Orders</span>
                    </div>
                    <div className="admin-category-bar-bg">
                      <div className="admin-category-bar-fill" style={{ width: `${Math.round((orders.filter(o => o.paymentMethod === 'RAZORPAY').length / (orders.length || 1)) * 100)}%`, backgroundColor: '#2563eb' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Operational Alerts / Widgets Section */}
            <div className="admin-grid-2">
              {/* Failed Payments Alerts */}
              <div className="admin-card">
                <h3 className="admin-card-title">Failed Gateway Payments</h3>
                <div className="admin-dashboard-alerts">
                  {paymentsData.filter(p => p.status === 'Failed').slice(0, 4).map(p => (
                    <div className="admin-alert-item danger" key={p.id}>
                      <div style={{ flexGrow: 1 }}>
                        <strong>Payment Failure:</strong> Failed transaction ID {p.transactionId} on order #{p.orderId.slice(-6).toUpperCase()} by {p.customerName}
                      </div>
                      <span className="admin-badge cancelled">₹{p.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {paymentsData.filter(p => p.status === 'Failed').length === 0 && (
                    <div className="admin-alert-item success">
                      All online transactions executing cleanly. No gateway alerts.
                    </div>
                  )}
                </div>
              </div>

              {/* Pending Orders requiring confirmation */}
              <div className="admin-card">
                <h3 className="admin-card-title">Pending Orders Confirmation</h3>
                <div className="admin-dashboard-alerts">
                  {orders.filter(o => o.status === 'PENDING').slice(0, 4).map(o => (
                    <div className="admin-alert-item warning" key={o.id}>
                      <div style={{ flexGrow: 1 }}>
                        <strong>Fulfillment:</strong> Order #{o.id.slice(-6).toUpperCase()} (₹{parseFloat(o.total).toLocaleString('en-IN')}) requires verification
                      </div>
                      <button onClick={() => handleUpdateOrderStatus(o.id, 'CONFIRMED')} className="admin-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                        Confirm
                      </button>
                    </div>
                  ))}
                  {orders.filter(o => o.status === 'PENDING').length === 0 && (
                    <div className="admin-alert-item success">
                      No pending orders. Fulfillment pipelines clear.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Low Stock Alerts & Conversion Funnel */}
            <div className="admin-grid-2">
              {/* Low stock visual alarm widget */}
              <div className={`admin-card ${inventoryItems.filter(i => i.status !== 'In Stock').length > 0 ? 'alarm-active' : ''}`} style={{ transition: 'all 0.3s ease' }}>
                <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {inventoryItems.filter(i => i.status !== 'In Stock').length > 0 && (
                    <span className="alarm-pulsate-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse-alarm 1.2s infinite' }} />
                  )}
                  Inventory Low Stock Alarm
                </h3>
                <div className="admin-table-wrapper" style={{ border: 'none' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Stock</th>
                        <th>Quick Restock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.filter(i => i.status !== 'In Stock').slice(0, 4).map((item, idx) => (
                        <tr key={idx} className={item.stock === 0 ? 'row-out-of-stock' : 'row-low-stock'}>
                          <td style={{ fontWeight: 600 }}>{item.productName}</td>
                          <td>{item.size}</td>
                          <td style={{ fontFamily: 'monospace', color: item.stock === 0 ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }}>
                            {item.stock === 0 ? 'OUT' : item.stock}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button 
                                onClick={() => handleRestockInventory(item.sku, item.stock + 20)} 
                                className="admin-btn" 
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.62rem', backgroundColor: '#10b981', borderColor: '#10b981', color: 'white', cursor: 'pointer' }}
                                title="Instantly Restock +20 units"
                              >
                                +20
                              </button>
                              <button 
                                onClick={() => handleRestockInventory(item.sku, item.stock + 50)} 
                                className="admin-btn" 
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.62rem', backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: 'white', cursor: 'pointer' }}
                                title="Instantly Restock +50 units"
                              >
                                +50
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {inventoryItems.filter(i => i.status !== 'In Stock').length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ color: '#10b981', textAlign: 'center', padding: '1.25rem', fontWeight: 600 }}>All atomizers fully stocked.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SVG Conversion Funnel */}
              <div className="admin-card">
                <h3 className="admin-card-title">Atelier Conversion Funnel</h3>
                <div style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg className="admin-funnel-svg" viewBox="0 0 400 130" style={{ width: '100%', height: 'auto', maxWidth: '360px' }}>
                    {/* Tier 1: Add to Cart */}
                    <polygon points="10,10 390,10 340,42 60,42" fill="#1C1B18" opacity="0.9" />
                    <text x="200" y="27" fill="#FEFCF9" textAnchor="middle" fontSize="10" fontWeight="bold" letterSpacing="0.5">
                      ADD TO BAG: {Math.round(orders.length * 1.5) + 3} SESSIONS (100%)
                    </text>

                    {/* Tier 2: Checkout */}
                    <polygon points="62,45 338,45 288,77 112,77" fill="#8B672F" opacity="0.95" />
                    <text x="200" y="62" fill="#FEFCF9" textAnchor="middle" fontSize="10" fontWeight="bold" letterSpacing="0.5">
                      CHECKOUT: {orders.length} ({Math.round(orders.length / (orders.length * 1.5 + 3) * 100) || 0}%)
                    </text>

                    {/* Tier 3: Completed */}
                    <polygon points="114,80 286,80 236,112 164,112" fill="#4CAF7D" opacity="0.95" />
                    <text x="200" y="97" fill="#FEFCF9" textAnchor="middle" fontSize="10" fontWeight="bold" letterSpacing="0.5">
                      COMPLETED: {orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING').length} ({Math.round(orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING').length / (orders.length * 1.5 + 3) * 100) || 0}%)
                    </text>
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '360px', marginTop: '0.75rem', fontSize: '0.68rem', color: '#6b7280' }}>
                    <span>Add to Bag</span>
                    <span>→</span>
                    <span>Checkout ({Math.round(orders.length / (orders.length * 1.5 + 3) * 100) || 0}%)</span>
                    <span>→</span>
                    <span>Purchase ({orders.length > 0 ? Math.round(orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PENDING').length / orders.length * 100) : 0}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Reviews Moderation Grid */}
            <div className="admin-grid-1" style={{ marginTop: '1.5rem' }}>
              {/* Recent reviews moderation widget */}
              <div className="admin-card">
                <h3 className="admin-card-title">Reviews Pending Moderation</h3>
                <div className="admin-dashboard-alerts">
                  {reviews.filter(r => !r.approved).slice(0, 4).map(r => (
                    <div className="admin-alert-item warning" key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span><strong>{r.customerName}</strong> ({r.rating}★) on <em>{r.productName}</em></span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button onClick={() => handleReviewStatus(r.id, true)} className="admin-btn" style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem', backgroundColor: '#10b981', borderColor: '#10b981' }}>
                            Approve
                          </button>
                          <button onClick={() => handleDeleteReview(r.id)} className="admin-btn-danger" style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#555' }}>"{r.comment}"</div>
                    </div>
                  ))}
                  {reviews.filter(r => !r.approved).length === 0 && (
                    <div className="admin-alert-item success" style={{ width: '100%' }}>
                      No reviews pending moderation. Reviews auto-approved or moderated.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Products View */}
        {activeTab === 'products' && (
          <div className="admin-card">
            <div className="admin-filters-bar">
              <input
                type="text"
                placeholder="Search products by brand or name..."
                className="admin-input admin-search-input"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <select
                className="admin-select"
                style={{ width: 'auto' }}
                value={productCatFilter}
                onChange={(e) => setProductCatFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={exportProductsCsv} className="admin-btn-secondary">
                Export Catalog (CSV)
              </button>
              <button onClick={openCreateModal} className="admin-btn" style={{ marginLeft: 'auto' }}>
                + Add Product
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th className="sortable" onClick={() => handleSortToggle('name', productSort, setProductSort)}>
                      Product {renderSortIndicator('name', productSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('brand', productSort, setProductSort)}>
                      Brand {renderSortIndicator('brand', productSort)}
                    </th>
                    <th>Category</th>
                    <th>Variants</th>
                    <th className="sortable" onClick={() => handleSortToggle('avgRating', productSort, setProductSort)}>
                      Rating {renderSortIndicator('avgRating', productSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('unitsSold', productSort, setProductSort)}>
                      Sold {renderSortIndicator('unitsSold', productSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('revenueGenerated', productSort, setProductSort)}>
                      Revenue {renderSortIndicator('revenueGenerated', productSort)}
                    </th>
                    <th>Featured</th>
                    <th className="sortable" onClick={() => handleSortToggle('isActive', productSort, setProductSort)}>
                      Status {renderSortIndicator('isActive', productSort)}
                    </th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProductsData.map(p => {
                    const thumb = p.images?.[0]?.imageUrl || '';
                    return (
                      <tr key={p.id}>
                        <td>
                          {thumb ? (
                            <img src={sanitizeImageUrl(thumb)} alt={p.name} className="admin-product-thumb" />
                          ) : (
                            <div className="admin-product-thumb">BOX</div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>/{p.slug}</div>
                        </td>
                        <td>{p.brand}</td>
                        <td>{p.category || 'N/A'}</td>
                        <td>{p.variantsCount} sizes</td>
                        <td style={{ fontWeight: 'bold', color: '#f59e0b' }}>
                          {p.avgRating > 0 ? `${p.avgRating} ★` : 'N/A'}
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{p.unitsSold} units</td>
                        <td style={{ fontFamily: 'monospace' }}>₹{p.revenueGenerated.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`admin-badge ${p.featured ? 'featured' : 'standard'}`}>
                            {p.featured ? 'Featured' : 'Standard'}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-status-dot ${p.isActive ? 'active' : 'inactive'}`} />
                          {p.isActive ? 'Active' : 'Archived'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => setSelectedProductAnalytics(p)} className="admin-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', marginRight: '0.25rem' }}>
                            Analytics
                          </button>
                          <button onClick={() => startEditProduct(p)} className="admin-btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', marginRight: '0.25rem' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDuplicateProduct(p)} className="admin-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', marginRight: '0.25rem' }}>
                            Copy
                          </button>
                          <button onClick={() => handleToggleProductActive(p)} className="admin-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', marginRight: '0.25rem', color: p.isActive ? '#e59800' : '#10b981' }}>
                            {p.isActive ? 'Archive' : 'Restore'}
                          </button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="admin-btn-danger" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProductsData.length === 0 && (
                    <tr>
                      <td colSpan="11" style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No products match filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Categories View */}
        {activeTab === 'categories' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
            <div className="admin-card">
              <h3 className="admin-card-title">Fragrance Catalog Categories</h3>
              
              <div className="admin-filters-bar" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Search categories..."
                  className="admin-input admin-search-input"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
                <button onClick={exportCategoriesCsv} className="admin-btn-secondary">
                  Export (CSV)
                </button>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="sortable" onClick={() => handleSortToggle('name', categorySort, setCategorySort)}>
                        Name {renderSortIndicator('name', categorySort)}
                      </th>
                      <th className="sortable" onClick={() => handleSortToggle('slug', categorySort, setCategorySort)}>
                        Slug {renderSortIndicator('slug', categorySort)}
                      </th>
                      <th className="sortable" onClick={() => handleSortToggle('productCount', categorySort, setCategorySort)}>
                        Products count {renderSortIndicator('productCount', categorySort)}
                      </th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategoriesData.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                        <td style={{ fontFamily: 'monospace', color: '#6b7280' }}>{c.slug}</td>
                        <td>{getProductCountForCategory(c.id)} products</td>
                        <td>
                          <span className="admin-badge success">Active</span>
                        </td>
                      </tr>
                    ))}
                    {filteredCategoriesData.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No categories match search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-card">
              <h3 className="admin-card-title">Create New Category</h3>
              <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="admin-form-group">
                  <label className="admin-label">Category Name</label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    placeholder="Fresh Aquatic"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Slug</label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    placeholder="fresh-aquatic"
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  />
                </div>
                <button type="submit" className="admin-btn">Add Category</button>
              </form>
            </div>
          </div>
        )}

        {/* 4. Inventory View */}
        {activeTab === 'inventory' && (
          <div className="admin-card">
            <div className="admin-filters-bar">
              <input
                type="text"
                placeholder="Search SKU or product..."
                className="admin-input admin-search-input"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
              />
              <select
                className="admin-select"
                style={{ width: 'auto' }}
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
              >
                <option value="ALL">All Stock Levels</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="ACTIVE">Active Variants</option>
                <option value="INACTIVE">Inactive Variants</option>
              </select>

              <button onClick={handleBulkRestock} className="admin-btn">
                Bulk Restock Low Stock (+20)
              </button>

              <button onClick={exportInventoryCsv} className="admin-btn-secondary" style={{ marginLeft: 'auto' }}>
                Export Inventory Manifest (CSV)
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSortToggle('productName', inventorySort, setInventorySort)}>
                      Product {renderSortIndicator('productName', inventorySort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('sku', inventorySort, setInventorySort)}>
                      SKU {renderSortIndicator('sku', inventorySort)}
                    </th>
                    <th>Size</th>
                    <th className="sortable" onClick={() => handleSortToggle('stock', inventorySort, setInventorySort)}>
                      Current Stock {renderSortIndicator('stock', inventorySort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('lowStockThreshold', inventorySort, setInventorySort)}>
                      Limit Threshold {renderSortIndicator('lowStockThreshold', inventorySort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('status', inventorySort, setInventorySort)}>
                      Status {renderSortIndicator('status', inventorySort)}
                    </th>
                    <th>Restock Recommendation</th>
                    <th style={{ textAlign: 'right' }}>Restock Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 'bold' }}>{item.productName}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.sku}</td>
                      <td>{item.size}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: item.status !== 'In Stock' ? 'bold' : 'normal', color: item.status === 'Out of Stock' ? 'red' : (item.status === 'Low Stock' ? '#ea580c' : 'inherit') }}>
                        {item.stock} units
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{item.lowStockThreshold} units</td>
                      <td>
                        <span className={`admin-badge ${item.status === 'In Stock' ? 'success' : (item.status === 'Low Stock' ? 'pending' : 'failed')}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.status !== 'In Stock' ? (
                          <span style={{ color: '#1d4ed8', fontWeight: 600 }}>Recommend adding +{20 - item.stock > 0 ? 20 - item.stock + 15 : 20} units</span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>Fully Stocked</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            const newStock = parseInt(prompt(`Enter new stock count for SKU ${item.sku}:`, item.stock));
                            if (!isNaN(newStock)) {
                              handleRestockInventory(item.sku, newStock);
                            }
                          }}
                          className="admin-btn"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                  {inventoryItems.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No variants found matching selection.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. Inventory Logs View */}
        {activeTab === 'inventory_logs' && (
          <div className="admin-card">
            <div className="admin-filters-bar">
              <input
                type="text"
                placeholder="Search logs (product, operator)..."
                className="admin-input admin-search-input"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
              <select
                className="admin-select"
                style={{ width: 'auto' }}
                value={logReasonFilter}
                onChange={(e) => setLogReasonFilter(e.target.value)}
              >
                <option value="ALL">All Audit Log Reasons</option>
                <option value="RESTOCK">RESTOCK</option>
                <option value="ORDER">ORDER</option>
                <option value="MANUAL_EDIT">MANUAL_EDIT</option>
              </select>
              <button onClick={exportLogsCsv} className="admin-btn-secondary" style={{ marginLeft: 'auto' }}>
                Export Logs (CSV)
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSortToggle('id', logSort, setLogSort)}>
                      Audit ID {renderSortIndicator('id', logSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('date', logSort, setLogSort)}>
                      Date / Time {renderSortIndicator('date', logSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('productName', logSort, setLogSort)}>
                      Product {renderSortIndicator('productName', logSort)}
                    </th>
                    <th>Variant</th>
                    <th className="sortable" onClick={() => handleSortToggle('oldStock', logSort, setLogSort)}>
                      Old Stock {renderSortIndicator('oldStock', logSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('newStock', logSort, setLogSort)}>
                      New Stock {renderSortIndicator('newStock', logSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('changeAmount', logSort, setLogSort)}>
                      Change {renderSortIndicator('changeAmount', logSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('reason', logSort, setLogSort)}>
                      Reason {renderSortIndicator('reason', logSort)}
                    </th>
                    <th>Operator Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace' }}>{log.id}</td>
                      <td>{new Date(log.date).toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 'bold' }}>{log.productName}</td>
                      <td>{log.variantSize}</td>
                      <td style={{ fontFamily: 'monospace' }}>{log.oldStock}</td>
                      <td style={{ fontFamily: 'monospace' }}>{log.newStock}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: log.changeAmount >= 0 ? '#10b981' : '#dc2626' }}>
                        {log.changeAmount >= 0 ? `+${log.changeAmount}` : log.changeAmount}
                      </td>
                      <td>
                        <span className={`admin-badge ${log.reason === 'RESTOCK' ? 'success' : (log.reason === 'ORDER' ? 'processing' : 'pending')}`}>
                          {log.reason}
                        </span>
                      </td>
                      <td>{log.adminUser}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No inventory logs logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Orders Pipeline */}
        {activeTab === 'orders' && (
          <div className="admin-card">
            <div className="admin-filters-bar">
              <input
                type="text"
                placeholder="Search orders by ID, name, email..."
                className="admin-input admin-search-input"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
              <select
                className="admin-select"
                style={{ width: 'auto' }}
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button onClick={exportOrdersCsv} className="admin-btn-secondary" style={{ marginLeft: 'auto' }}>
                Export Orders (CSV)
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSortToggle('id', orderSort, setOrderSort)}>
                      Order ID {renderSortIndicator('id', orderSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('createdAt', orderSort, setOrderSort)}>
                      Order Date {renderSortIndicator('createdAt', orderSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('customer', orderSort, setOrderSort)}>
                      Customer {renderSortIndicator('customer', orderSort)}
                    </th>
                    <th>Items</th>
                    <th className="sortable" onClick={() => handleSortToggle('total', orderSort, setOrderSort)}>
                      Total {renderSortIndicator('total', orderSort)}
                    </th>
                    <th>Payment</th>
                    <th className="sortable" onClick={() => handleSortToggle('status', orderSort, setOrderSort)}>
                      Fulfillment Status {renderSortIndicator('status', orderSort)}
                    </th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrdersData.map(o => {
                    const clientName = o.user?.name || 'Collector';
                    const clientEmail = o.user?.email || 'N/A';
                    const orderDate = new Date(o.createdAt).toLocaleDateString('en-IN');
                    return (
                      <tr key={o.id}>
                        <td>
                          <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>#{o.id.slice(-8).toUpperCase()}</div>
                        </td>
                        <td>{orderDate}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{clientName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace' }}>{clientEmail}</div>
                        </td>
                        <td>{o.orderItems?.length || 1} items</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>₹{parseFloat(o.total).toLocaleString('en-IN')}</td>
                        <td>
                          <span className="admin-badge standard">{o.paymentMethod}</span>
                        </td>
                        <td>
                          <span className={`admin-badge ${o.status.toLowerCase()}`}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => setSelectedOrder(o)} className="admin-btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
                            Inspect Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrdersData.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No orders found matching criteria.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. Payments Ledger View */}
        {activeTab === 'payments' && (
          <div className="admin-card">
            <div className="admin-filters-bar">
              <input
                type="text"
                placeholder="Search payments..."
                className="admin-input admin-search-input"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
              />
              <select
                className="admin-select"
                style={{ width: 'auto' }}
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING_COD">Pending COD</option>
                <option value="FAILED">Failed</option>
              </select>
              <button onClick={exportPaymentsCsv} className="admin-btn-secondary" style={{ marginLeft: 'auto' }}>
                Export Settlements (CSV)
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSortToggle('id', paymentSort, setPaymentSort)}>
                      Ledger ID {renderSortIndicator('id', paymentSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('orderId', paymentSort, setPaymentSort)}>
                      Order Reference {renderSortIndicator('orderId', paymentSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('customerName', paymentSort, setPaymentSort)}>
                      Customer {renderSortIndicator('customerName', paymentSort)}
                    </th>
                    <th>Gateway Provider</th>
                    <th>Transaction / Order ID</th>
                    <th className="sortable" onClick={() => handleSortToggle('amount', paymentSort, setPaymentSort)}>
                      Amount {renderSortIndicator('amount', paymentSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('status', paymentSort, setPaymentSort)}>
                      Status {renderSortIndicator('status', paymentSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('paidDate', paymentSort, setPaymentSort)}>
                      Audit Date {renderSortIndicator('paidDate', paymentSort)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsData.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace' }}>{p.id}</td>
                      <td style={{ fontFamily: 'monospace' }}>#{p.orderId.slice(-8).toUpperCase()}</td>
                      <td style={{ fontWeight: 'bold' }}>{p.customerName}</td>
                      <td>{p.provider}</td>
                      <td style={{ fontFamily: 'monospace' }}>{p.transactionId}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>₹{parseFloat(p.amount).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`admin-badge ${p.status === 'Success' ? 'success' : (p.status === 'Pending' ? 'pending' : 'failed')}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>{new Date(p.paidDate).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                  {paymentsData.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No payments logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. Customers Profile database */}
        {activeTab === 'customers' && (
          <div className="admin-card">
            <div className="admin-filters-bar">
              <input
                type="text"
                placeholder="Search customers (name, email, phone)..."
                className="admin-input admin-search-input"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ flexGrow: 1 }}
              />
              <button onClick={exportCustomersCsv} className="admin-btn-secondary" style={{ marginLeft: 'auto' }}>
                Export Directory (CSV)
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSortToggle('name', customerSort, setCustomerSort)}>
                      Collector Name {renderSortIndicator('name', customerSort)}
                    </th>
                    <th>Contact Email</th>
                    <th>Contact Phone</th>
                    <th className="sortable" onClick={() => handleSortToggle('ordersCount', customerSort, setCustomerSort)}>
                      Orders Logged {renderSortIndicator('ordersCount', customerSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('totalSpent', customerSort, setCustomerSort)}>
                      LTV (Lifetime Value) {renderSortIndicator('totalSpent', customerSort)}
                    </th>
                    <th className="sortable" onClick={() => handleSortToggle('joinedDate', customerSort, setCustomerSort)}>
                      Joined {renderSortIndicator('joinedDate', customerSort)}
                    </th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customersData.map((c, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                      <td style={{ fontFamily: 'monospace' }}>{c.ordersCount} orders</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>₹{c.totalSpent.toLocaleString('en-IN')}</td>
                      <td>{new Date(c.joinedDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => setSelectedCustomer(c)} className="admin-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customersData.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No registered customers profile yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. Reviews Moderation */}
        {activeTab === 'reviews' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
            <div className="admin-card">
              <div className="admin-filters-bar">
                <input
                  type="text"
                  placeholder="Search reviews..."
                  className="admin-input admin-search-input"
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                />
                <select
                  className="admin-select"
                  style={{ width: 'auto' }}
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                >
                  <option value="ALL">All Reviews</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending Moderation</option>
                </select>
                <button onClick={exportReviewsCsv} className="admin-btn-secondary" style={{ marginLeft: 'auto' }}>
                  Export (CSV)
                </button>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="sortable" onClick={() => handleSortToggle('productName', reviewSort, setReviewSort)}>
                        Product {renderSortIndicator('productName', reviewSort)}
                      </th>
                      <th className="sortable" onClick={() => handleSortToggle('customerName', reviewSort, setReviewSort)}>
                        Collector {renderSortIndicator('customerName', reviewSort)}
                      </th>
                      <th className="sortable" onClick={() => handleSortToggle('rating', reviewSort, setReviewSort)}>
                        Rating {renderSortIndicator('rating', reviewSort)}
                      </th>
                      <th>Review Content</th>
                      <th className="sortable" onClick={() => handleSortToggle('approved', reviewSort, setReviewSort)}>
                        Status {renderSortIndicator('approved', reviewSort)}
                      </th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviewsData.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 'bold' }}>{r.productName}</td>
                        <td>
                          <div>{r.customerName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{r.customerEmail}</div>
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#f59e0b' }}>{r.rating} / 5</td>
                        <td style={{ maxWidth: '250px', fontSize: '0.75rem', lineHeight: 1.4 }}>
                          {r.title && <strong>{r.title}<br /></strong>}
                          {r.comment}
                        </td>
                        <td>
                          <span className={`admin-badge ${r.approved ? 'success' : 'pending'}`}>
                            {r.approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {!r.approved ? (
                            <button onClick={() => handleReviewStatus(r.id, true)} className="admin-btn" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', marginRight: '0.25rem', backgroundColor: '#10b981', borderColor: '#10b981' }}>
                              Approve
                            </button>
                          ) : (
                            <button onClick={() => handleReviewStatus(r.id, false)} className="admin-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', marginRight: '0.25rem' }}>
                              Hide
                            </button>
                          )}
                          <button onClick={() => handleDeleteReview(r.id)} className="admin-btn-danger" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredReviewsData.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No reviews match settings.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviews Statistics Widgets */}
            <div className="admin-card">
              <h3 className="admin-card-title">Reviews Satisfaction</h3>
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '0.25rem' }}>Out of 5 stars (based on {reviews.length} reviews)</div>
              </div>
              <h4 style={{ fontSize: '0.8rem', margin: '1rem 0 0.5rem 0', textTransform: 'uppercase', color: '#4b5563' }}>Rating Distribution</h4>
              <div className="admin-rating-distribution">
                {reviewsRatingDistribution.map(dist => (
                  <div className="admin-rating-row" key={dist.star}>
                    <span className="admin-rating-stars">{dist.star} Star</span>
                    <div className="admin-rating-bar-bg">
                      <div className="admin-rating-bar-fill" style={{ width: `${dist.percentage}%` }} />
                    </div>
                    <span className="admin-rating-count">{dist.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 10. Settings Configuration */}
        {activeTab === 'settings' && (
          <div className="admin-card">
            <nav className="admin-settings-nav">
              <button onClick={() => setSettingsTab('store')} className={`admin-settings-tab ${settingsTab === 'store' ? 'active' : ''}`}>Store parameters</button>
              <button onClick={() => setSettingsTab('shipping')} className={`admin-settings-tab ${settingsTab === 'shipping' ? 'active' : ''}`}>Shipping rules</button>
              <button onClick={() => setSettingsTab('payment')} className={`admin-settings-tab ${settingsTab === 'payment' ? 'active' : ''}`}>Gateway credentials</button>
              <button onClick={() => setSettingsTab('user')} className={`admin-settings-tab ${settingsTab === 'user' ? 'active' : ''}`}>User management & permissions</button>
            </nav>

            <form onSubmit={handleSaveSettings} style={{ maxWidth: '35rem' }}>
              {settingsTab === 'store' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-label">Store name</label>
                    <input type="text" className="admin-input" value={storeSettings.storeName} onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Support email address</label>
                    <input type="email" className="admin-input" value={storeSettings.supportEmail} onChange={(e) => setStoreSettings({ ...storeSettings, supportEmail: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Support phone number</label>
                    <input type="text" className="admin-input" value={storeSettings.supportPhone} onChange={(e) => setStoreSettings({ ...storeSettings, supportPhone: e.target.value })} />
                  </div>
                  <button type="submit" className="admin-btn">Save store settings</button>
                </div>
              )}

              {settingsTab === 'shipping' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <div onClick={() => setStoreSettings({ ...storeSettings, codEnabled: !storeSettings.codEnabled })} className="admin-switch-container">
                      <div className={`admin-switch ${storeSettings.codEnabled ? 'active' : ''}`} />
                      <span className="admin-label" style={{ margin: 0, cursor: 'pointer' }}>Enable Cash on Delivery (COD)</span>
                    </div>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Standard Shipping Charges (INR)</label>
                    <input type="number" className="admin-input" value={storeSettings.shippingCharges} onChange={(e) => setStoreSettings({ ...storeSettings, shippingCharges: parseInt(e.target.value) })} />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Free Shipping Minimum Threshold (INR)</label>
                    <input type="number" className="admin-input" value={storeSettings.freeShippingThreshold} onChange={(e) => setStoreSettings({ ...storeSettings, freeShippingThreshold: parseInt(e.target.value) })} />
                  </div>
                  <button type="submit" className="admin-btn">Save shipping rules</button>
                </div>
              )}

              {settingsTab === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label className="admin-label">Razorpay Key ID</label>
                    <input type="text" className="admin-input" value={storeSettings.razorpayKey} onChange={(e) => setStoreSettings({ ...storeSettings, razorpayKey: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Razorpay Key Secret</label>
                    <input type="password" className="admin-input" value={storeSettings.razorpaySecret} onChange={(e) => setStoreSettings({ ...storeSettings, razorpaySecret: e.target.value })} />
                  </div>
                  <button type="submit" className="admin-btn">Update gateway keys</button>
                </div>
              )}

              {settingsTab === 'user' && (
                <div>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>Administrator Operators Matrix (Neon DB)</h4>
                  <div className="admin-table-wrapper" style={{ marginBottom: '1.5rem' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Operator</th>
                          <th>Role</th>
                          <th>Orders Pipeline</th>
                          <th>Products Catalog</th>
                          <th>Customer DB</th>
                          <th>Gateway Keys</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operators.map((op, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 'bold' }}>
                              <div>{op.name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{op.email}</div>
                            </td>
                            <td>
                              <span className="admin-badge success">{op.role}</span>
                            </td>
                            <td>
                              <input type="checkbox" checked={op.permissions.orders} readOnly disabled style={{ cursor: 'default' }} />
                            </td>
                            <td>
                              <input type="checkbox" checked={op.permissions.catalog} readOnly disabled style={{ cursor: 'default' }} />
                            </td>
                            <td>
                              <input type="checkbox" checked={op.permissions.customers} readOnly disabled style={{ cursor: 'default' }} />
                            </td>
                            <td>
                              <input type="checkbox" checked={op.permissions.gateway} readOnly disabled style={{ cursor: 'default' }} />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleToggleUserRole(op.id, 'ADMIN')}
                                className="admin-btn-danger"
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}
                              >
                                Revoke Admin
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <h4 style={{ margin: '1.5rem 0 1rem 0', fontSize: '0.85rem' }}>Promote Registrants to Administrator</h4>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Collector Name</th>
                          <th>Email Address</th>
                          <th>Current Role</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.role !== 'ADMIN').map((u) => (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 'bold' }}>{u.name || 'Collector'}</td>
                            <td style={{ fontFamily: 'monospace' }}>{u.email}</td>
                            <td>
                              <span className="admin-badge standard">{u.role}</span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleToggleUserRole(u.id, 'USER')}
                                className="admin-btn"
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', backgroundColor: '#10b981', borderColor: '#10b981' }}
                              >
                                Promote to Admin
                              </button>
                            </td>
                          </tr>
                        ))}
                        {users.filter(u => u.role !== 'ADMIN').length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>No other registered users available.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

      </main>

      {/* --- DRAWERS AND DIALOGS --- */}

      {/* Product Create/Edit Modal Dialog */}
      {showProductModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--admin-border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: 0 }}>
                {editingProduct ? 'Edit Fragrance Parameters' : 'Register New Fragrance'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="admin-drawer-close">&times;</button>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: 'var(--admin-danger-light)', color: 'var(--admin-danger)', border: '1px solid #fecaca', fontSize: '0.75rem', padding: '0.5rem', borderRadius: '6px', marginBottom: '1rem', textAlign: 'center', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8rem' }}>
              <div className="admin-grid-2">
                <div className="admin-form-group">
                  <label className="admin-label">Product Name</label>
                  <input type="text" required className="admin-input" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Slug</label>
                  <input type="text" required className="admin-input" value={productForm.slug} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} />
                </div>
              </div>

              <div className="admin-grid-3">
                <div className="admin-form-group">
                  <label className="admin-label">Brand House</label>
                  <input type="text" required className="admin-input" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Category</label>
                  <select className="admin-select" value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}>
                    <option value="">Uncategorized</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '1.25rem', gap: '1rem' }}>
                  <div onClick={() => setProductForm({ ...productForm, featured: !productForm.featured })} className="admin-switch-container">
                    <div className={`admin-switch ${productForm.featured ? 'active' : ''}`} />
                    <span className="admin-label" style={{ margin: 0, cursor: 'pointer' }}>Featured</span>
                  </div>
                  <div onClick={() => setProductForm({ ...productForm, isActive: !productForm.isActive })} className="admin-switch-container">
                    <div className={`admin-switch ${productForm.isActive ? 'active' : ''}`} />
                    <span className="admin-label" style={{ margin: 0, cursor: 'pointer' }}>Active</span>
                  </div>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Fragrance Description</label>
                <textarea rows="2" className="admin-textarea" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
              </div>

              {/* Dynamic Images URLs */}
              <div style={{ border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.25rem' }}>
                  <span className="admin-label" style={{ margin: 0 }}>Product Images</span>
                  <button type="button" onClick={addImageField} className="admin-btn" style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }}>
                    + Add Image URL
                  </button>
                </div>
                {productForm.images.map((img, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" placeholder="Image URL (e.g. /images/perfume_x.jpeg)" required className="admin-input" style={{ flexGrow: 1 }} value={img.imageUrl} onChange={(e) => updateImageField(idx, 'imageUrl', e.target.value)} />
                    <input type="text" placeholder="Alt Text" className="admin-input" style={{ width: '8rem' }} value={img.altText} onChange={(e) => updateImageField(idx, 'altText', e.target.value)} />
                    <button type="button" onClick={() => removeImageField(idx)} disabled={productForm.images.length === 1} className="admin-btn-danger" style={{ padding: '0.25rem 0.5rem', opacity: productForm.images.length === 1 ? 0.5 : 1 }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Dynamic Variants list */}
              <div style={{ border: '1px solid var(--admin-border)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.25rem' }}>
                  <span className="admin-label" style={{ margin: 0 }}>Product Sizes & Pricing</span>
                  <button type="button" onClick={addVariantField} className="admin-btn" style={{ padding: '0.15rem 0.35rem', fontSize: '0.65rem' }}>
                    + Add Variant Size
                  </button>
                </div>
                {productForm.variants.map((v, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '0.375rem', alignItems: 'center' }}>
                    <input type="text" placeholder="Size (e.g. 5ml Decant)" required className="admin-input" value={v.size} onChange={(e) => updateVariantField(idx, 'size', e.target.value)} />
                    <input type="number" step="0.01" placeholder="Price (INR)" required className="admin-input" value={v.price} onChange={(e) => updateVariantField(idx, 'price', e.target.value)} />
                    <input type="number" placeholder="Stock" required className="admin-input" value={v.stock} onChange={(e) => updateVariantField(idx, 'stock', e.target.value)} />
                    <input type="text" placeholder="SKU Code" required className="admin-input" value={v.sku} onChange={(e) => updateVariantField(idx, 'sku', e.target.value)} />
                    <input type="number" placeholder="Low Threshold" required className="admin-input" value={v.lowStockThreshold} onChange={(e) => updateVariantField(idx, 'lowStockThreshold', e.target.value)} />
                    <button type="button" onClick={() => removeVariantField(idx)} disabled={productForm.variants.length === 1} className="admin-btn-danger" style={{ padding: '0.25rem 0.5rem', opacity: productForm.variants.length === 1 ? 0.5 : 1 }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                <button type="submit" className="admin-btn" style={{ flexGrow: 1 }}>
                  {editingProduct ? 'Save Product Configurations' : 'Register Product'}
                </button>
                <button type="button" onClick={() => setShowProductModal(false)} className="admin-btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Analytics Detail Drawer */}
      {selectedProductAnalytics && (
        <div className="admin-drawer-overlay" onClick={() => setSelectedProductAnalytics(null)}>
          <div className="admin-drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <h3 className="admin-drawer-title">Product Insights</h3>
              <button onClick={() => setSelectedProductAnalytics(null)} className="admin-drawer-close">&times;</button>
            </div>
            
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem 0', color: 'var(--admin-text-primary)' }}>{selectedProductAnalytics.name}</h2>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Brand House: <strong>{selectedProductAnalytics.brand}</strong> | Category: {selectedProductAnalytics.category || 'N/A'}</div>
            </div>

            {/* Metrics cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ border: '1px solid var(--admin-border)', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#f9fafb' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Units Sold</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{selectedProductAnalytics.unitsSold} units</div>
              </div>
              <div style={{ border: '1px solid var(--admin-border)', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#f9fafb' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Revenue Generated</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>₹{selectedProductAnalytics.revenueGenerated.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Satisfaction Rating */}
            <div>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563', margin: '0 0 0.5rem 0' }}>Customer Satisfaction</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {selectedProductAnalytics.avgRating > 0 ? selectedProductAnalytics.avgRating : '5.0'}
                </div>
                <div>
                  <div style={{ color: '#f59e0b', fontSize: '1.1rem' }}>★★★★★</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Based on verified collector ratings</div>
                </div>
              </div>
            </div>

            {/* Trend chart plot */}
            <div>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563', margin: '0 0 0.5rem 0' }}>Weekly Sales Velocity</h4>
              <svg className="admin-chart-svg" style={{ height: '80px', viewBox: '0 0 400 80' }}>
                <line x1="0" y1="50" x2="100%" y2="50" className="admin-chart-grid" />
                <line x1="0" y1="25" x2="100%" y2="25" className="admin-chart-grid" />
                {productSalesChart && productSalesChart.hasSales ? (
                  <>
                    <path d={productSalesChart.linePath} className="admin-chart-line" />
                    <path d={productSalesChart.areaPath} className="admin-chart-area" />
                  </>
                ) : (
                  <text x="200" y="45" textAnchor="middle" style={{ fill: '#9ca3af', fontSize: '10px' }}>No sales logged for this perfume</text>
                )}
              </svg>
            </div>

            {/* Size Breakdown */}
            <div>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563', margin: '0 0 0.5rem 0' }}>Variants Configuration</h4>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>Stock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductAnalytics.variants?.map((v, idx) => (
                      <tr key={idx}>
                        <td>{v.size}</td>
                        <td style={{ fontFamily: 'monospace' }}>{v.sku}</td>
                        <td style={{ fontFamily: 'monospace' }}>₹{parseFloat(v.price).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`admin-badge ${v.stock === 0 ? 'failed' : (v.stock <= v.lowStockThreshold ? 'pending' : 'success')}`}>
                            {v.stock} units
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={() => setSelectedProductAnalytics(null)} className="admin-btn" style={{ marginTop: 'auto' }}>Close Insights Panel</button>
          </div>
        </div>
      )}

      {/* Order Details Modal Drawer */}
      {selectedOrder && (
        <div className="admin-drawer-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="admin-drawer-container" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <h3 className="admin-drawer-title">Order Fulfillments #{selectedOrder.id.slice(-8).toUpperCase()}</h3>
              <button onClick={() => setSelectedOrder(null)} className="admin-drawer-close">&times;</button>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563' }}>Collector Details</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.4 }}>
                Name: <strong>{selectedOrder.user?.name || 'Collector'}</strong><br />
                Email: {selectedOrder.user?.email || 'N/A'}<br />
                Phone: {selectedOrder.user?.phone || 'N/A'}
              </p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563' }}>Destination Shipping Address</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.4 }}>
                {selectedOrder.address?.fullName}<br />
                {selectedOrder.address?.addressLine1}<br />
                {selectedOrder.address?.addressLine2 && `${selectedOrder.address.addressLine2}, `}
                {selectedOrder.address?.city}, {selectedOrder.address?.state} - {selectedOrder.address?.postalCode}<br />
                India
              </p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563' }}>Fulfillment Timeline Control</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <label className="admin-label" style={{ margin: 0 }}>Fulfillment pipeline status</label>
                  <select 
                    className="admin-select"
                    value={selectedOrder.status}
                    onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value)}
                    style={{ padding: '0.25rem 1.5rem 0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto', display: 'inline-block' }}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <ul className="admin-timeline">
                  <li className="admin-timeline-item">
                    <span className="admin-timeline-dot active" />
                    <div className="admin-timeline-title">Order Created</div>
                    <div className="admin-timeline-date">{new Date(selectedOrder.createdAt).toLocaleString('en-IN')}</div>
                  </li>
                  <li className="admin-timeline-item">
                    <span className={`admin-timeline-dot ${selectedOrder.status !== 'PENDING' ? 'active' : ''}`} />
                    <div className="admin-timeline-title">Fulfillment Started</div>
                    <div className="admin-timeline-date">{selectedOrder.status !== 'PENDING' ? 'Confirmed & Processed' : 'Awaiting confirmation'}</div>
                  </li>
                  <li className="admin-timeline-item">
                    <span className={`admin-timeline-dot ${selectedOrder.status === 'DELIVERED' ? 'active' : ''}`} />
                    <div className="admin-timeline-title">Delivery Complete</div>
                    <div className="admin-timeline-date">{selectedOrder.status === 'DELIVERED' ? 'Delivered successfully' : 'Pending final drop-off'}</div>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563' }}>Purchased Items</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedOrder.orderItems?.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.375rem' }}>
                    <div>
                      <strong>{item.productName}</strong><br />
                      <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Size: {item.size} | Qty: {item.quantity}</span>
                    </div>
                    <span style={{ fontFamily: 'monospace' }}>₹{(parseFloat(item.priceAtPurchase) * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '2px solid var(--admin-border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span style={{ fontFamily: 'monospace' }}>₹{parseFloat(selectedOrder.subtotal).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Shipping charge</span>
                <span style={{ fontFamily: 'monospace' }}>₹{parseFloat(selectedOrder.shippingFee).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.375rem' }}>
                <span>Order Total</span>
                <span style={{ fontFamily: 'monospace' }}>₹{parseFloat(selectedOrder.total).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
              <button onClick={() => { window.print(); }} className="admin-btn" style={{ flexGrow: 1 }}>
                Print Invoice
              </button>
              <a href={`mailto:${selectedOrder.user?.email || ''}?subject=Decant Atelier Order #${selectedOrder.id.slice(-8).toUpperCase()}`} className="admin-btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexGrow: 1 }}>
                Contact Customer
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Customer Order History and details drawer */}
      {selectedCustomer && (
        <div className="admin-drawer-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="admin-drawer-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '35rem' }}>
            <div className="admin-drawer-header">
              <h3 className="admin-drawer-title">Customer History: {selectedCustomer.name}</h3>
              <button onClick={() => setSelectedCustomer(null)} className="admin-drawer-close">&times;</button>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563' }}>Profile Information</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.4 }}>
                Email: <strong>{selectedCustomer.email}</strong><br />
                Phone: {selectedCustomer.phone}<br />
                Customer Joined: {selectedCustomer.joinedDate}<br />
                Lifetime Value (LTV): <strong>₹{selectedCustomer.totalSpent.toLocaleString('en-IN')}</strong>
              </p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563' }}>Saved Address List</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedCustomer.addresses?.map((addr, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--admin-border)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', backgroundColor: '#f9fafb' }}>
                    <strong>{addr.fullName}</strong> ({addr.phone})<br />
                    {addr.addressLine1}<br />
                    {addr.addressLine2 && `${addr.addressLine2}, `}
                    {addr.city}, {addr.state} - {addr.postalCode}
                  </div>
                ))}
                {selectedCustomer.addresses?.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>No addresses saved.</div>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase', color: '#4b5563' }}>Orders Logged</h4>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o => o.user?.email === selectedCustomer.email).map(o => (
                      <tr key={o.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>#{o.id.slice(-6).toUpperCase()}</td>
                        <td>{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                        <td style={{ fontFamily: 'monospace' }}>₹{parseFloat(o.total).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`admin-badge ${o.status.toLowerCase()}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={() => setSelectedCustomer(null)} className="admin-btn" style={{ marginTop: 'auto' }}>Close Customer History</button>
          </div>
        </div>
      )}
    </div>
  );
}
