import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { Webhook } from 'svix';
import { prisma } from './lib/prisma.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite client (port 5173 by default)
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Webhook endpoint uses raw body parser for svix signature verification
app.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || 'whsec_placeholder';
  const payload = req.body.toString();
  const headers = req.headers;

  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(webhookSecret);
  let evt;

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook verification failed' });
  }

  const eventType = evt.type;
  console.log(`Received Clerk webhook event: ${eventType}`);

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, phone_numbers } = evt.data;
    const email = email_addresses[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim() || null;
    const phone = phone_numbers?.[0]?.phone_number || null;

    try {
      await prisma.user.upsert({
        where: { clerkId: id },
        update: { email, name, phone },
        create: {
          clerkId: id,
          email,
          name,
          phone,
          role: 'USER',
        },
      });
      console.log(`User synced to database: ${id}`);
    } catch (err) {
      console.error('Error saving user to DB:', err);
      return res.status(500).json({ error: 'Database write error' });
    }
  }

  return res.status(200).json({ success: true });
});

// For all other routes, parse JSON body
app.use(express.json());

// Set up Clerk Node SDK auth middleware
app.use(ClerkExpressWithAuth({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY
}));

// Middleware to enforce authentication
const requireAuth = (req, res, next) => {
  // Support local mock auth header for local testing/verification
  if (req.headers['x-mock-user-id']) {
    req.auth = { userId: req.headers['x-mock-user-id'] };
    return next();
  }
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  next();
};

// Helper: Get or create DB User from Clerk Auth ID (robust fallback if webhook is pending)
async function getOrCreateDbUser(clerkId) {
  let user = await prisma.user.findUnique({
    where: { clerkId }
  });

  if (!user) {
    // Basic fallback user creation
    user = await prisma.user.create({
      data: {
        clerkId: clerkId,
        email: `${clerkId}@clerk.local`, // Fallback email
        role: 'USER'
      }
    });
  }
  return user;
}

// ============================================================
// ADDRESS MANAGEMENT ROUTES
// ============================================================

// GET user addresses
app.get('/api/addresses', requireAuth, async (req, res) => {
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    const addresses = await prisma.address.findMany({
      where: { userId: dbUser.id },
      orderBy: { isDefault: 'desc' }
    });
    return res.status(200).json(addresses);
  } catch (err) {
    console.error('Failed to fetch addresses:', err);
    return res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// POST save address
app.post('/api/addresses', requireAuth, async (req, res) => {
  const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, isDefault } = req.body;

  if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
    return res.status(400).json({ error: 'Missing required address fields' });
  }

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);

    // If setting as default, clear previous default flag for this user
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: dbUser.id, isDefault: true },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: dbUser.id,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        isDefault: !!isDefault
      }
    });

    return res.status(201).json(newAddress);
  } catch (err) {
    console.error('Failed to create address:', err);
    return res.status(500).json({ error: 'Failed to save address' });
  }
});

// ============================================================
// ORDER MANAGEMENT ROUTES
// ============================================================

// GET user orders
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    const orders = await prisma.order.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        address: true,
        orderItems: true
      }
    });
    return res.status(200).json(orders);
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST place order
app.post('/api/orders', requireAuth, async (req, res) => {
  const { addressId, items, paymentMethod, notes } = req.body;

  if (!addressId || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required order details' });
  }

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: dbUser.id }
    });
    if (!address) {
      return res.status(404).json({ error: 'Shipping address not found' });
    }

    // Calculate subtotal and total
    let subtotal = 0;
    for (const item of items) {
      const price = parseFloat(item.price);
      const qty = parseInt(item.quantity) || 1;
      subtotal += price * qty;
    }

    const shippingFee = 0; // Free shipping
    const total = subtotal + shippingFee;

    // Place order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const newOrder = await tx.order.create({
        data: {
          userId: dbUser.id,
          addressId: addressId,
          subtotal,
          shippingFee,
          total,
          paymentMethod,
          status: 'PENDING',
          notes,
          orderItems: {
            create: items.map(item => ({
              productId: item.productId || item.id, // Support different object formats
              variantId: item.variantId || 'default-variant', // Fallback identifier
              productName: item.name,
              size: item.size || '2ml Decant',
              priceAtPurchase: parseFloat(item.price),
              quantity: parseInt(item.quantity) || 1
            }))
          }
        },
        include: {
          orderItems: true
        }
      });

      // 2. Initialize Payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          provider: paymentMethod,
          amount: total,
          status: 'PENDING'
        }
      });

      return newOrder;
    });

    console.log(`Order placed successfully: ${order.id}`);
    return res.status(201).json(order);
  } catch (err) {
    console.error('Failed to place order:', err);
    return res.status(500).json({ error: 'Failed to place order' });
  }
});

// Admin role requirement middleware
const requireAdmin = async (req, res, next) => {
  if (req.headers['x-mock-user-id']) {
    req.auth = { userId: req.headers['x-mock-user-id'] };
  }
  
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: req.auth.userId }
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  } catch (err) {
    console.error('Admin check failed:', err);
    return res.status(500).json({ error: 'Internal server error during authorization' });
  }
};

// ============================================================
// PRODUCT MANAGEMENT ROUTES
// ============================================================

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        images: {
          orderBy: { position: 'asc' }
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' }
        },
        category: true,
        reviews: {
          where: { approved: true },
          select: { rating: true }
        }
      }
    });

    const response = products.map(p => {
      const startingPrice = p.variants[0] ? parseFloat(p.variants[0].price) : 0;
      const image = p.images[0] ? p.images[0].imageUrl : null;
      const ratings = p.reviews.map(r => r.rating);
      const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : 0;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        featured: p.featured,
        description: p.description,
        category: p.category ? p.category.slug : null,
        image,
        images: p.images.map(img => img.imageUrl),
        price: startingPrice,
        sizes: p.variants.map(v => ({
          size: v.size,
          price: parseFloat(v.price),
          label: v.size.includes('2ml') ? 'Perfect for testing' : 
                 v.size.includes('5ml') ? 'Travel friendly' : 
                 v.size.includes('10ml') ? 'Best value' : 'Collector size',
          stock: v.stock,
          sku: v.sku
        })),
        avgRating: parseFloat(avgRating.toFixed(1))
      };
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product by slug
app.get('/api/products/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { position: 'asc' }
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' }
        },
        category: true,
        reviews: {
          where: { approved: true },
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error('Failed to fetch product by slug:', err);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create product (admin only)
app.post('/api/products', requireAuth, requireAdmin, async (req, res) => {
  const { name, slug, description, brand, featured, categoryId, images, variants } = req.body;

  if (!name || !slug || !variants || !Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'Missing required product fields or variants' });
  }

  try {
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          slug,
          description,
          brand,
          featured: !!featured,
          categoryId: categoryId || null,
          images: {
            create: (images || []).map(img => ({
              imageUrl: img.imageUrl,
              altText: img.altText || null,
              position: img.position || 0
            }))
          },
          variants: {
            create: variants.map(v => ({
              size: v.size,
              price: parseFloat(v.price),
              stock: parseInt(v.stock) || 0,
              sku: v.sku
            }))
          }
        },
        include: {
          images: true,
          variants: true
        }
      });
      return product;
    });

    return res.status(201).json(newProduct);
  } catch (err) {
    console.error('Failed to create product:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

// PATCH update product (admin only)
app.patch('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, brand, featured, categoryId, images, variants } = req.body;

  try {
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          brand,
          featured: featured !== undefined ? !!featured : undefined,
          categoryId: categoryId !== undefined ? (categoryId || null) : undefined
        }
      });

      if (images && Array.isArray(images)) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map(img => ({
            productId: id,
            imageUrl: img.imageUrl,
            altText: img.altText || null,
            position: img.position || 0
          }))
        });
      }

      if (variants && Array.isArray(variants)) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productVariant.createMany({
          data: variants.map(v => ({
            productId: id,
            size: v.size,
            price: parseFloat(v.price),
            stock: parseInt(v.stock) || 0,
            sku: v.sku
          }))
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          images: true,
          variants: true
        }
      });
    });

    return res.status(200).json(updatedProduct);
  } catch (err) {
    console.error('Failed to update product:', err);
    return res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE soft delete product (admin only)
app.delete('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
    return res.status(200).json({ success: true, message: 'Product soft deleted', product });
  } catch (err) {
    console.error('Failed to delete product:', err);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ============================================================
// CATEGORY ROUTES
// ============================================================

// GET all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    return res.status(200).json(categories);
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST create category (admin only)
app.post('/api/categories', requireAuth, requireAdmin, async (req, res) => {
  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Missing name or slug for category' });
  }

  try {
    const newCategory = await prisma.category.create({
      data: { name, slug }
    });
    return res.status(201).json(newCategory);
  } catch (err) {
    console.error('Failed to create category:', err);
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

// ============================================================
// USER PROFILE ROUTES
// ============================================================

// GET logged in user profile
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    const profileUser = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            createdAt: true,
            status: true,
            total: true
          }
        }
      }
    });

    return res.status(200).json(profileUser);
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PATCH update user profile
app.patch('/api/user/profile', requireAuth, async (req, res) => {
  const { name, phone } = req.body;
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { name, phone },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });
    return res.status(200).json(updatedUser);
  } catch (err) {
    console.error('Failed to update user profile:', err);
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// POST elevate user to admin with secret passcode
app.post('/api/user/elevate', requireAuth, async (req, res) => {
  const { passcode } = req.body;
  if (passcode !== 'AtelierAdmin2026') {
    return res.status(400).json({ error: 'Invalid secret passcode' });
  }

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    return res.status(200).json({ success: true, role: updatedUser.role });
  } catch (err) {
    console.error('Failed to elevate user role:', err);
    return res.status(500).json({ error: 'Failed to elevate user role' });
  }
});


// ============================================================
// ADMIN DASHBOARD & ORDERS MANAGEMENT ROUTES
// ============================================================

// GET admin dashboard summary statistics
app.get('/api/admin/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const revenueRes = await prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { total: true }
    });
    const totalRevenue = revenueRes._sum.total ? parseFloat(revenueRes._sum.total) : 0;

    const totalOrders = await prisma.order.count();
    const totalUsers = await prisma.user.count();
    const pendingOrders = await prisma.order.count({
      where: { status: 'PENDING' }
    });

    const lowStockVariants = await prisma.productVariant.findMany({
      where: { stock: { lte: prisma.productVariant.fields.lowStockThreshold } },
      include: {
        product: { select: { name: true } }
      }
    });
    const formattedLowStock = lowStockVariants.map(v => ({
      productName: v.product.name,
      size: v.size,
      sku: v.sku,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold
    }));

    const bestSellersGroupBy = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: 5
    });

    const bestSellers = [];
    for (const item of bestSellersGroupBy) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true }
      });
      if (product) {
        bestSellers.push({
          productName: product.name,
          totalQuantity: item._sum.quantity || 0
        });
      }
    }

    return res.status(200).json({
      totalRevenue,
      totalOrders,
      totalUsers,
      pendingOrders,
      lowStockVariants: formattedLowStock,
      bestSellers
    });
  } catch (err) {
    console.error('Failed to fetch admin dashboard stats:', err);
    return res.status(500).json({ error: 'Failed to fetch admin dashboard stats' });
  }
});

// GET all orders for admin
app.get('/api/admin/orders', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        address: true,
        orderItems: true
      }
    });

    return res.status(200).json(orders);
  } catch (err) {
    console.error('Failed to fetch admin orders:', err);
    return res.status(500).json({ error: 'Failed to fetch admin orders' });
  }
});

// PATCH update order status
app.patch('/api/admin/orders/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid or missing order status' });
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { name: true, email: true } },
        address: true,
        orderItems: true
      }
    });

    return res.status(200).json(updatedOrder);
  } catch (err) {
    console.error('Failed to update order status:', err);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET all users for admin
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        orders: {
          select: { id: true }
        }
      }
    });

    const response = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      orderCount: u.orders.length
    }));

    return res.status(200).json(response);
  } catch (err) {
    console.error('Failed to fetch admin users list:', err);
    return res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

// PATCH update user role (admin only)
app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (role !== 'USER' && role !== 'ADMIN') {
    return res.status(400).json({ error: 'Invalid user role' });
  }
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    return res.status(200).json(updatedUser);
  } catch (err) {
    console.error('Failed to update user role:', err);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
});

// GET all products for admin console with detailed variants and sales aggregation
app.get('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          orderBy: { position: 'asc' }
        },
        variants: {
          orderBy: { price: 'asc' }
        },
        category: true,
        orderItems: {
          select: {
            quantity: true,
            priceAtPurchase: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      }
    });

    const response = products.map(p => {
      // Calculate units sold and revenue generated
      let unitsSold = 0;
      let revenueGenerated = 0;
      p.orderItems.forEach(item => {
        unitsSold += item.quantity;
        revenueGenerated += parseFloat(item.priceAtPurchase) * item.quantity;
      });

      // Calculate average rating
      const ratings = p.reviews.map(r => r.rating);
      const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length) : 0;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        featured: p.featured,
        isActive: p.isActive,
        categoryId: p.categoryId,
        category: p.category ? p.category.name : null,
        images: p.images,
        variants: p.variants,
        variantsCount: p.variants.length,
        avgRating: parseFloat(avgRating.toFixed(1)),
        unitsSold,
        revenueGenerated
      };
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error('Failed to fetch admin products:', err);
    return res.status(500).json({ error: 'Failed to fetch admin products' });
  }
});

// GET all reviews for admin
app.get('/api/admin/reviews', requireAuth, requireAdmin, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true } },
        user: { select: { name: true, email: true } }
      }
    });
    const response = reviews.map(r => ({
      id: r.id,
      productName: r.product.name,
      customerName: r.user.name || 'Collector',
      customerEmail: r.user.email,
      rating: r.rating,
      comment: r.comment,
      title: r.title,
      approved: r.approved,
      createdAt: r.createdAt
    }));
    return res.status(200).json(response);
  } catch (err) {
    console.error('Failed to fetch reviews:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// PATCH approve/disapprove review
app.patch('/api/admin/reviews/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;
  try {
    const updated = await prisma.review.update({
      where: { id },
      data: { approved: !!approved }
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Failed to update review:', err);
    return res.status(500).json({ error: 'Failed to update review' });
  }
});

// DELETE review
app.delete('/api/admin/reviews/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.review.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to delete review:', err);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
});

// GET all inventory logs for admin
app.get('/api/admin/inventory-logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        variant: {
          include: {
            product: { select: { name: true } }
          }
        }
      }
    });
    const response = logs.map(l => ({
      id: l.id,
      date: l.createdAt,
      productName: l.variant.product.name,
      variantSize: l.variant.size,
      oldStock: l.oldStock,
      newStock: l.newStock,
      changeAmount: l.newStock - l.oldStock,
      reason: l.changeType,
      adminUser: l.note || 'System Autopilot'
    }));
    return res.status(200).json(response);
  } catch (err) {
    console.error('Failed to fetch inventory logs:', err);
    return res.status(500).json({ error: 'Failed to fetch inventory logs' });
  }
});

// POST adjust variant inventory stock
app.post('/api/admin/inventory/adjust', requireAuth, requireAdmin, async (req, res) => {
  const { sku, newStock, reason, note } = req.body;
  if (!sku || newStock === undefined) {
    return res.status(400).json({ error: 'Missing SKU or new stock count' });
  }
  try {
    const variant = await prisma.productVariant.findUnique({
      where: { sku }
    });
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found with this SKU' });
    }

    const oldStock = variant.stock;
    const updatedVariant = await prisma.productVariant.update({
      where: { sku },
      data: { stock: parseInt(newStock) }
    });

    // Create log
    await prisma.inventoryLog.create({
      data: {
        variantId: variant.id,
        oldStock,
        newStock: parseInt(newStock),
        changeType: reason || 'MANUAL_EDIT',
        note: note || 'Manual adjustment'
      }
    });

    return res.status(200).json(updatedVariant);
  } catch (err) {
    console.error('Failed to adjust inventory:', err);
    return res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

// Default root status route
app.get('/api/status', (req, res) => {
  return res.json({ status: 'healthy', database: 'connected' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Express API server running on http://localhost:${PORT}`);
});
