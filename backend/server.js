import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import clerk, { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { Webhook } from 'svix';
import { prisma, verifyDatabaseSchema } from './lib/prisma.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Load environment variables
dotenv.config();

console.log('====== STARTUP ENV DIAGNOSTIC ======');
console.log('process.cwd():', process.cwd());
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET length:', process.env.RAZORPAY_KEY_SECRET?.length);
console.log('RAZORPAY_KEY_ID JSON:', JSON.stringify(process.env.RAZORPAY_KEY_ID));
console.log('====================================');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for localhost development, FRONTEND_URL, and dynamic Vercel previews/production
const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      /^http:\/\/localhost:\d+$/.test(origin) ||
                      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
                      
    if (isAllowed) {
      return callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Production-grade structured API error logging
function logApiError(route, method, req, err) {
  console.error(`\n====== API ERROR TRACE ======`);
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error(`Route: ${route}`);
  console.error(`Method: ${method}`);
  console.error(`Request URL: ${req.originalUrl}`);
  console.error(`User ID: ${req.auth?.userId || 'N/A'}`);
  if (err.code) {
    console.error(`Prisma/DB Error Code: ${err.code}`);
  }
  console.error(`Error Message: ${err.message || err}`);
  console.error(`Stack Trace:`, err.stack || err);
  console.error(`=============================\n`);
}

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return res.status(200).json({
      status: "ok",
      database: "connected",
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0"
    });
  } catch (err) {
    console.error("Healthcheck database query failed:", err);
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      error: err.message
    });
  }
});

// Standalone Razorpay Authentication Debug Route
app.get('/api/debug/razorpay', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Blocked attempt to access debug Razorpay route in production.');
    return res.status(404).json({ error: 'Not Found' });
  }

  console.log('====== DEBUG RAZORPAY AUTHENTICATION ======');
  console.log('process.cwd():', process.cwd());
  console.log('Key ID:', process.env.RAZORPAY_KEY_ID);
  console.log('Secret Length:', process.env.RAZORPAY_KEY_SECRET?.length);

  try {
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const rzpOrder = await rzp.orders.create({
      amount: 100,
      currency: "INR",
      receipt: "debug_test"
    });

    console.log('Debug Order Creation Success:', rzpOrder);
    return res.json(rzpOrder);
  } catch (err) {
    logApiError('/api/debug/razorpay', 'GET', req, err);
    return res.status(err?.statusCode || 400).json({
      success: false,
      message: 'Debug order creation failed.'
    });
  }
});

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

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id } = evt.data;
    const { email, name, phone } = extractClerkProfile(evt.data);

    try {
      await syncDbUserFromClerkProfile(id, { email, name, phone });
      console.log(`User synced to database: ${id} (${eventType})`);
    } catch (err) {
      console.error('Error saving user to DB:', err);
      return res.status(500).json({ error: 'Database write error' });
    }
  } else if (eventType === 'user.deleted') {
    const { id } = evt.data;
    try {
      // Set roles/deleted flag or delete record cleanly
      await prisma.user.delete({
        where: { clerkId: id }
      });
      console.log(`User deleted from database: ${id}`);
    } catch (err) {
      console.error('Error deleting user from DB:', err);
      // Don't fail the webhook if user doesn't exist anymore
      if (err.code !== 'P2025') {
        return res.status(500).json({ error: 'Database delete error' });
      }
    }
  }

  return res.status(200).json({ success: true });
});

// For all other routes, parse JSON body
app.use(express.json());

// Set up Clerk Node SDK auth middleware
if (process.env.CLERK_SECRET_KEY && (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY)) {
  app.use(ClerkExpressWithAuth({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY
  }));
} else {
  console.warn("\n[WARNING] CLERK_SECRET_KEY or CLERK_PUBLISHABLE_KEY is missing. Running in local dev-mode with mock authentication.\n");
  app.use(async (req, res, next) => {
    try {
      const firstUser = await prisma.user.findFirst();
      req.auth = {
        userId: firstUser ? firstUser.clerkId : 'mock_dev_user_123',
        sessionClaims: {}
      };
    } catch (e) {
      req.auth = {
        userId: 'mock_dev_user_123',
        sessionClaims: {}
      };
    }
    next();
  });
}


// Middleware to enforce authentication
const requireAuth = (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  next();
};

// Logging middleware for Cart operations
app.use('/api/cart', async (req, res, next) => {
  const originalJson = res.json;
  const originalStatus = res.status;
  let responseStatus = 200;

  res.status = function(code) {
    responseStatus = code;
    return originalStatus.apply(this, arguments);
  };

  res.json = async function(body) {
    try {
      console.log('\n====== CART OPERATION TRACE ======');
      console.log(`URL: ${req.originalUrl}`);
      console.log(`Method: ${req.method}`);
      console.log(`Clerk User ID: ${req.auth?.userId || 'N/A'}`);
      console.log(`Token Present: ${!!req.headers.authorization}`);

      let dbUserId = 'N/A';
      let countBefore = 'N/A';
      let countAfter = 'N/A';

      if (req.auth?.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { clerkId: req.auth.userId }
        });
        if (dbUser) {
          dbUserId = dbUser.id;
          countBefore = await prisma.cartItem.count({ where: { userId: dbUser.id } });
        }
      }

      console.log(`Database User ID: ${dbUserId}`);
      console.log(`Variant ID: ${req.body?.variantId || req.params?.id || 'N/A'}`);
      console.log(`CartItem Count (Before): ${countBefore}`);

      const result = originalJson.apply(this, arguments);

      if (dbUserId !== 'N/A') {
        countAfter = await prisma.cartItem.count({ where: { userId: dbUserId } });
      }

      console.log(`Response Status: ${responseStatus}`);
      console.log(`Response Body: ${JSON.stringify(body)}`);
      console.log(`CartItem Count (After): ${countAfter}`);
      console.log('==================================\n');

      return result;
    } catch (err) {
      console.error('Logging middleware error:', err);
      return originalJson.apply(this, arguments);
    }
  };

  next();
});

// Helper: Get or create DB User from Clerk Auth ID (robust fallback if webhook is pending)
async function getOrCreateDbUser(clerkId) {
  const clerkProfile = await fetchClerkProfile(clerkId);
  return syncDbUserFromClerkProfile(clerkId, clerkProfile);
}

function getPrimaryEmail(user) {
  if (!user) return null;
  if (user.primaryEmailAddress?.emailAddress) return user.primaryEmailAddress.emailAddress;
  const primaryEmailId = user.primaryEmailAddressId;
  const primaryEmail = user.emailAddresses?.find(email => email.id === primaryEmailId);
  return primaryEmail?.emailAddress || user.email_addresses?.[0]?.email_address || user.emailAddresses?.[0]?.emailAddress || null;
}

function getPrimaryPhone(user) {
  if (!user) return null;
  if (user.primaryPhoneNumber?.phoneNumber) return user.primaryPhoneNumber.phoneNumber;
  const primaryPhoneId = user.primaryPhoneNumberId;
  const primaryPhone = user.phoneNumbers?.find(phone => phone.id === primaryPhoneId);
  return primaryPhone?.phoneNumber || user.phone_numbers?.[0]?.phone_number || user.phoneNumbers?.[0]?.phoneNumber || null;
}

function extractClerkProfile(user) {
  const firstName = user?.firstName || user?.first_name || '';
  const lastName = user?.lastName || user?.last_name || '';
  const name = (user?.fullName || user?.full_name || `${firstName} ${lastName}`).trim() || null;
  return {
    email: getPrimaryEmail(user),
    name,
    phone: getPrimaryPhone(user)
  };
}

async function fetchClerkProfile(clerkId) {
  try {
    const clerkUser = await clerk.users.getUser(clerkId);
    return extractClerkProfile(clerkUser);
  } catch (err) {
    console.warn(`Unable to fetch Clerk profile for ${clerkId}:`, err.message);
    return { email: null, name: null, phone: null };
  }
}

function buildUserProfileUpdate(profile) {
  const update = {};
  if (profile.email) update.email = profile.email;
  if (profile.name) update.name = profile.name;
  if (profile.phone) update.phone = profile.phone;
  return update;
}

async function syncDbUserFromClerkProfile(clerkId, profile) {
  const updateData = buildUserProfileUpdate(profile);
  const existingUser = await prisma.user.findUnique({
    where: { clerkId }
  });

  if (existingUser) {
    if (Object.keys(updateData).length === 0) {
      return existingUser;
    }
    return prisma.user.update({
      where: { clerkId },
      data: updateData
    });
  }

  return prisma.user.create({
    data: {
      clerkId,
      email: profile.email || `${clerkId}@clerk.local`,
      name: profile.name,
      phone: profile.phone,
      role: 'USER'
    }
  });
}

function normalizeRequiredString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAddressPayload(body) {
  return {
    fullName: normalizeRequiredString(body.fullName),
    phone: normalizeRequiredString(body.phone),
    addressLine1: normalizeRequiredString(body.addressLine1),
    addressLine2: normalizeRequiredString(body.addressLine2),
    city: normalizeRequiredString(body.city),
    state: normalizeRequiredString(body.state),
    postalCode: normalizeRequiredString(body.postalCode),
    isDefault: !!body.isDefault
  };
}

function formatOrder(order) {
  if (!order) return null;
  const formatted = {
    ...order,
    subtotal: parseFloat(order.subtotal),
    shippingFee: parseFloat(order.shippingFee),
    total: parseFloat(order.total),
    amount: parseFloat(order.total),
    currency: 'INR',
    success: true
  };
  
  if (order.orderItems) {
    formatted.orderItems = order.orderItems.map(item => ({
      ...item,
      priceAtPurchase: parseFloat(item.priceAtPurchase)
    }));
  }
  
  if (order.payment) {
    formatted.payment = {
      ...order.payment,
      amount: parseFloat(order.payment.amount)
    };
  }
  
  return formatted;
}

// ============================================================
// ADDRESS MANAGEMENT ROUTES
// ============================================================

// GET user addresses
const getAddressesHandler = async (req, res) => {
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
};
app.get('/api/addresses', requireAuth, getAddressesHandler);
app.get('/api/user/addresses', requireAuth, getAddressesHandler);

// POST save address
const postAddressHandler = async (req, res) => {
  const addressData = normalizeAddressPayload(req.body);
  const { fullName, phone, addressLine1, city, state, postalCode } = addressData;

  if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
    return res.status(400).json({ error: 'Missing required address fields' });
  }

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);

    // If setting as default, clear previous default flag for this user
    if (addressData.isDefault) {
      await prisma.address.updateMany({
        where: { userId: dbUser.id, isDefault: true },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: dbUser.id,
        fullName: addressData.fullName,
        phone: addressData.phone,
        addressLine1: addressData.addressLine1,
        addressLine2: addressData.addressLine2 || null,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        isDefault: addressData.isDefault
      }
    });

    return res.status(201).json(newAddress);
  } catch (err) {
    console.error('Failed to create address:', err);
    return res.status(500).json({ error: 'Failed to save address' });
  }
};
app.post('/api/addresses', requireAuth, postAddressHandler);
app.post('/api/user/addresses', requireAuth, postAddressHandler);

// PUT/PATCH update address
const patchAddressHandler = async (req, res) => {
  const { id } = req.params;
  const addressData = normalizeAddressPayload(req.body);
  const { fullName, phone, addressLine1, city, state, postalCode } = addressData;

  if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
    return res.status(400).json({ error: 'Missing required address fields' });
  }

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id, userId: dbUser.id }
    });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, clear previous default flag for this user
    if (addressData.isDefault) {
      await prisma.address.updateMany({
        where: { userId: dbUser.id, isDefault: true },
        data: { isDefault: false }
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        fullName: addressData.fullName,
        phone: addressData.phone,
        addressLine1: addressData.addressLine1,
        addressLine2: addressData.addressLine2 || null,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        isDefault: addressData.isDefault
      }
    });

    return res.status(200).json(updatedAddress);
  } catch (err) {
    console.error('Failed to update address:', err);
    return res.status(500).json({ error: 'Failed to update address' });
  }
};
app.put('/api/addresses/:id', requireAuth, patchAddressHandler);
app.patch('/api/addresses/:id', requireAuth, patchAddressHandler);
app.put('/api/user/addresses/:id', requireAuth, patchAddressHandler);
app.patch('/api/user/addresses/:id', requireAuth, patchAddressHandler);

// DELETE address
const deleteAddressHandler = async (req, res) => {
  const { id } = req.params;

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id, userId: dbUser.id }
    });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Check if there are any orders attached to this address
    const linkedOrders = await prisma.order.count({
      where: { addressId: id }
    });
    if (linkedOrders > 0) {
      return res.status(400).json({ error: 'Cannot delete address because it has orders attached to it.' });
    }

    await prisma.address.delete({
      where: { id }
    });

    return res.status(200).json({ success: true, message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Failed to delete address:', err);
    return res.status(500).json({ error: 'Failed to delete address' });
  }
};
app.delete('/api/addresses/:id', requireAuth, deleteAddressHandler);
app.delete('/api/user/addresses/:id', requireAuth, deleteAddressHandler);

// PATCH set address as default
const setDefaultAddressHandler = async (req, res) => {
  const { id } = req.params;

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id, userId: dbUser.id }
    });
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Clear previous default flag for this user
    await prisma.address.updateMany({
      where: { userId: dbUser.id, isDefault: true },
      data: { isDefault: false }
    });

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true }
    });

    return res.status(200).json(updatedAddress);
  } catch (err) {
    console.error('Failed to set default address:', err);
    return res.status(500).json({ error: 'Failed to set default address' });
  }
};
app.patch('/api/addresses/:id/default', requireAuth, setDefaultAddressHandler);
app.patch('/api/user/addresses/:id/default', requireAuth, setDefaultAddressHandler);

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
    return res.status(200).json(orders.map(formatOrder));
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Reusable Razorpay instance is imported from ./lib/razorpay.js

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

    // Fetch store settings from DB
    const storeSettings = await prisma.storeSetting.findUnique({
      where: { id: 'default' }
    });
    const threshold = storeSettings ? parseFloat(storeSettings.freeShippingThreshold) : 1999;
    const charge = storeSettings ? parseFloat(storeSettings.shippingCharges) : 100;

    const shippingFee = subtotal >= threshold ? 0 : charge;
    const total = subtotal + shippingFee;

    // Place order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Validate variant stock and resolve missing variantIds
      for (const item of items) {
        let variantId = item.variantId;
        if (!variantId || variantId === 'default-variant') {
          const variant = await tx.productVariant.findFirst({
            where: { productId: item.productId || item.id, size: item.size }
          });
          if (!variant) {
            throw new Error(`Variant not found for product ${item.name} and size ${item.size}`);
          }
          item.variantId = variant.id;
          variantId = variant.id;
        }

        const variant = await tx.productVariant.findUnique({
          where: { id: variantId }
        });
        if (!variant) {
          throw new Error(`Variant not found: ${variantId}`);
        }
        if (variant.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.name} (${item.size}). Available: ${variant.stock}`);
        }
      }

      // 2. Create the order
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
              productId: item.productId || item.id,
              variantId: item.variantId,
              productName: item.name,
              size: item.size,
              priceAtPurchase: parseFloat(item.price),
              quantity: parseInt(item.quantity)
            }))
          }
        },
        include: {
          orderItems: true
        }
      });

      // 3. Deduct stock and log to InventoryLog
      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId }
        });
        const oldStock = variant.stock;
        const newStock = oldStock - item.quantity;

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: newStock }
        });

        await tx.inventoryLog.create({
          data: {
            variantId: item.variantId,
            oldStock,
            newStock,
            changeType: 'ORDER',
            note: `Order #${newOrder.id.slice(-8).toUpperCase()} placement`
          }
        });
      }

      // 4. Initialize Payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          provider: paymentMethod,
          amount: total,
          status: 'PENDING'
        }
      });

      // 5. Clear user cart in DB
      await tx.cartItem.deleteMany({
        where: { userId: dbUser.id }
      });

      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          orderItems: true,
          payment: true
        }
      });
    }, {
      timeout: 15000
    });

    if (paymentMethod === 'RAZORPAY') {
      let rzpOrder = null;
      try {
        console.log('====== RAZORPAY ORDERS API CALL ======');
        console.log('Client Config:');
        console.log('  Key ID:', razorpay.key_id);
        console.log('  Secret Length:', razorpay.key_secret?.length);
        console.log('Request Payload:');
        console.log('  amount:', Math.round(total * 100));
        console.log('  currency:', 'INR');
        console.log('  receipt:', `rcpt_${order.id.slice(-10)}`);
        console.log('======================================');

        rzpOrder = await razorpay.orders.create({
          amount: Math.round(total * 100),
          currency: 'INR',
          receipt: `rcpt_${order.id.slice(-10)}`
        });
        console.log('Razorpay Orders API Response:', rzpOrder);
      } catch (rzpErr) {
        console.error('====== RAZORPAY ORDER CREATION FAILED ======');
        console.error('statusCode:', rzpErr?.statusCode);
        console.error('message:', rzpErr?.message);
        console.error('description:', rzpErr?.description || rzpErr?.error?.description);
        console.error('error:', rzpErr?.error);
        console.error('raw:', rzpErr);
        console.error('============================================');
        
        // Roll back database changes since external payment gateway order creation failed
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' }
          });
          await tx.payment.update({
            where: { orderId: order.id },
            data: { status: 'FAILED' }
          });
          
          // Restore variant stock
          for (const item of order.orderItems) {
            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId }
            });
            if (variant) {
              const oldStock = variant.stock;
              const newStock = oldStock + item.quantity;
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: newStock }
              });
              await tx.inventoryLog.create({
                data: {
                  variantId: item.variantId,
                  oldStock,
                  newStock,
                  changeType: 'RESTOCK',
                  note: `Order #${order.id.slice(-8).toUpperCase()} placement rolled back due to Razorpay order creation failure`
                }
              });
            }
          }
        }, {
          timeout: 15000
        });

        const errorMsg = (rzpErr && rzpErr.description) || 
                         (rzpErr && rzpErr.error && rzpErr.error.description) || 
                         (rzpErr && rzpErr.message) || 
                         (typeof rzpErr === 'string' ? rzpErr : JSON.stringify(rzpErr));
        return res.status(400).json({ error: 'Failed to create payment gateway order: ' + errorMsg });
      }

      // If we generated a Razorpay order ID, update the order in the database
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: rzpOrder.id },
        include: {
          orderItems: true,
          payment: true
        }
      });
      
      console.log(`Order placed successfully with Razorpay: ${updatedOrder.id}`);
      return res.status(201).json({
        ...formatOrder(updatedOrder),
        razorpayKeyId: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.replace(/^["']|["']$/g, '').trim() : undefined
      });
    } else {
      console.log(`Order placed successfully: ${order.id}`);
      return res.status(201).json(formatOrder(order));
    }
  } catch (err) {
    console.error('Failed to place order:', err);
    return res.status(500).json({ error: err.message || 'Failed to place order' });
  }
});

// ============================================================
// PAYMENT INTEGRATION ROUTES
// ============================================================

// POST verify Razorpay signature and update payment status
app.post('/api/payments/verify', requireAuth, async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
    return res.status(400).json({ error: 'Missing payment verification details' });
  }

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log('Razorpay Verification Request Payload:', { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId });
  }

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);

    // Fetch order from DB including payment and items
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: dbUser.id },
      include: { payment: true, orderItems: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Duplicate payment / verification protection
    if (order.status === 'CONFIRMED' || order.payment?.status === 'SUCCESS') {
      await prisma.cartItem.deleteMany({
        where: { userId: dbUser.id }
      });
      return res.status(200).json({ success: true, message: 'Payment already verified and order confirmed.' });
    }

    // Block verification on already cancelled / failed orders
    if (order.status === 'CANCELLED' || order.payment?.status === 'FAILED') {
      return res.status(400).json({ error: 'Order or payment has already been cancelled/failed.' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const cleanedSecret = keySecret ? keySecret.replace(/^["']|["']$/g, '').trim() : '';

    if (!cleanedSecret || cleanedSecret === 'placeholder_secret' || cleanedSecret === 'rzp_secret_placeholder') {
      console.error("Razorpay secret missing or set to placeholder. Cannot verify signature.");
      return res.status(500).json({ error: 'Payment verification is unavailable. Gateway secret is missing.' });
    }

    // Verify signature using crypto
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', cleanedSecret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      // Signature mismatch - cancel order and restore stock inside transaction
      await prisma.$transaction(async (tx) => {
        const txOrder = await tx.order.findUnique({
          where: { id: orderId },
          include: { payment: true, orderItems: true }
        });

        // Double stock restoration check: skip if already failed/cancelled
        if (!txOrder || txOrder.status === 'CANCELLED' || txOrder.payment?.status === 'FAILED') {
          return;
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' }
        });

        await tx.payment.update({
          where: { orderId: orderId },
          data: { status: 'FAILED' }
        });

        // Restore variant stock
        for (const item of txOrder.orderItems) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId }
          });
          if (variant) {
            const oldStock = variant.stock;
            const newStock = oldStock + item.quantity;

            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: newStock }
            });

            await tx.inventoryLog.create({
              data: {
                variantId: item.variantId,
                oldStock,
                newStock,
                changeType: 'RESTOCK',
                note: `Order #${orderId.slice(-8).toUpperCase()} signature verification failed`
              }
            });
          }
        }
      }, {
        timeout: 15000
      });
      return res.status(400).json({ error: 'Payment signature verification failed. Possible fraud.' });
    }

    // Verification successful - update order and payment inside transaction
    await prisma.$transaction(async (tx) => {
      const txOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true }
      });

      if (!txOrder || txOrder.status === 'CONFIRMED' || txOrder.payment?.status === 'SUCCESS') {
        return;
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' }
      });

      await tx.payment.update({
        where: { orderId: orderId },
        data: {
          status: 'SUCCESS',
          transactionId: razorpayPaymentId,
          paidAt: new Date()
        }
      });

      await tx.cartItem.deleteMany({
        where: { userId: dbUser.id }
      });
    }, {
      timeout: 15000
    });

    return res.status(200).json({ success: true, message: 'Payment verified and order confirmed.' });
  } catch (err) {
    console.error('Failed to verify payment:', err);
    return res.status(500).json({ error: 'Internal server error during verification.' });
  }
});

// POST notify payment failure
app.post('/api/payments/fail', requireAuth, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log('Razorpay Failure Notification Request Payload:', { orderId });
  }
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: dbUser.id },
      include: { payment: true, orderItems: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Double stock restoration check: skip if already failed/cancelled
    if (order.status === 'CANCELLED' || order.payment?.status === 'FAILED') {
      return res.status(200).json({ success: true, message: 'Payment already recorded as failed/cancelled.' });
    }

    // Cancel order and restore stock inside transaction
    await prisma.$transaction(async (tx) => {
      const txOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { payment: true, orderItems: true }
      });

      if (!txOrder || txOrder.status === 'CANCELLED' || txOrder.payment?.status === 'FAILED') {
        return;
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      await tx.payment.update({
        where: { orderId },
        data: { status: 'FAILED' }
      });

      // Restore variant stock
      for (const item of txOrder.orderItems) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId }
        });
        if (variant) {
          const oldStock = variant.stock;
          const newStock = oldStock + item.quantity;

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: newStock }
          });

          await tx.inventoryLog.create({
            data: {
              variantId: item.variantId,
              oldStock,
              newStock,
              changeType: 'RESTOCK',
              note: `Order #${orderId.slice(-8).toUpperCase()} payment failure notification`
            }
          });
        }
      }
    }, {
      timeout: 15000
    });

    return res.status(200).json({ success: true, message: 'Payment recorded as failed and stock restored.' });
  } catch (err) {
    console.error('Failed to record payment failure:', err);
    return res.status(500).json({ error: 'Failed to record payment failure' });
  }
});

// POST Razorpay Webhooks (Optional/mocked, signature verified)
app.post('/api/webhooks/razorpay', express.json(), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!secret || secret === 'webhook_secret_placeholder') {
    console.log('Razorpay webhook secret is not configured. Webhook event ignored.');
    return res.status(200).json({ status: 'ignored', reason: 'unconfigured' });
  }

  if (!signature) {
    return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
  }

  try {
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.warn('Razorpay webhook signature mismatch.');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    console.log(`Razorpay webhook event received: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const payload = req.body.payload;
      const paymentObj = payload.payment?.entity;
      const rzpOrderId = paymentObj?.order_id;
      const transactionId = paymentObj?.id;

      if (rzpOrderId) {
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId: rzpOrderId },
          include: { payment: true }
        });

        if (order && order.status !== 'CONFIRMED') {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: { status: 'CONFIRMED' }
            });

            await tx.payment.update({
              where: { orderId: order.id },
              data: {
                status: 'SUCCESS',
                transactionId: transactionId || order.payment?.transactionId,
                paidAt: new Date()
              }
            });
          }, {
            timeout: 15000
          });
          console.log(`Order ${order.id} confirmed via webhook event ${event}.`);
        }
      }
    } else if (event === 'payment.failed') {
      const payload = req.body.payload;
      const paymentObj = payload.payment?.entity;
      const rzpOrderId = paymentObj?.order_id;

      if (rzpOrderId) {
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId: rzpOrderId },
          include: { payment: true, orderItems: true }
        });

        if (order && order.status !== 'CANCELLED') {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: { status: 'CANCELLED' }
            });

            await tx.payment.update({
              where: { orderId: order.id },
              data: { status: 'FAILED' }
            });

            // Restore variant stock
            for (const item of order.orderItems) {
              const variant = await tx.productVariant.findUnique({
                where: { id: item.variantId }
              });
              if (variant) {
                const oldStock = variant.stock;
                const newStock = oldStock + item.quantity;

                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { stock: newStock }
                });

                await tx.inventoryLog.create({
                  data: {
                    variantId: item.variantId,
                    oldStock,
                    newStock,
                    changeType: 'RESTOCK',
                    note: `Order #${order.id.slice(-8).toUpperCase()} payment failed via webhook`
                  }
                });
              }
            }
          }, {
            timeout: 15000
          });
          console.log(`Order ${order.id} cancelled via webhook event payment.failed.`);
        }
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Error handling Razorpay webhook:', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
});

// ============================================================
// CUSTOMER REVIEWS ROUTES
// ============================================================

// POST submit review
app.post('/api/reviews', requireAuth, async (req, res) => {
  const { productId, rating, title, comment, orderId } = req.body;

  if (!productId || rating === undefined) {
    return res.status(400).json({ error: 'Missing productId or rating' });
  }

  const rate = parseInt(rating);
  if (rate < 1 || rate > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);

    // Optional constraint: verify purchase
    const purchaseCount = await prisma.order.count({
      where: {
        userId: dbUser.id,
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        orderItems: {
          some: { productId }
        }
      }
    });

    if (purchaseCount === 0) {
      return res.status(403).json({ error: 'Verified purchase required. You can only review products you have purchased.' });
    }

    // Upsert review (one review per product)
    const review = await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: dbUser.id,
          productId
        }
      },
      update: {
        rating: rate,
        title,
        comment,
        orderId,
        approved: false // reset approval on edit
      },
      create: {
        userId: dbUser.id,
        productId,
        rating: rate,
        title,
        comment,
        orderId,
        approved: false // defaults to pending moderation
      }
    });

    return res.status(201).json(review);
  } catch (err) {
    console.error('Failed to submit review:', err);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});



// Admin role requirement middleware
const requireAdmin = async (req, res, next) => {
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
  const { search, category } = req.query;
  try {
    const where = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category && category !== 'shop-all') {
      where.category = {
        slug: category
      };
    }

    const products = await prisma.product.findMany({
      where,
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
          sku: v.sku,
          variantId: v.id
        })),
        avgRating: parseFloat(avgRating.toFixed(1))
      };
    });

    return res.status(200).json(response);
  } catch (err) {
    logApiError('/api/products', 'GET', req, err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product by slug or ID
app.get('/api/products/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { slug },
          { id: slug }
        ]
      },
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

    if (product.variants) {
      product.variants = product.variants.map(v => ({
        ...v,
        price: parseFloat(v.price)
      }));
    }

    return res.status(200).json(product);
  } catch (err) {
    logApiError('/api/products/:slug', 'GET', req, err);
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

    const formatted = {
      ...newProduct,
      variants: newProduct.variants.map(v => ({
        ...v,
        price: parseFloat(v.price)
      }))
    };
    return res.status(201).json(formatted);
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

    const formatted = {
      ...updatedProduct,
      variants: updatedProduct.variants.map(v => ({
        ...v,
        price: parseFloat(v.price)
      }))
    };
    return res.status(200).json(formatted);
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
    let categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Shop All', slug: 'shop-all' },
        { name: 'Decants', slug: 'decants' },
        { name: 'Full Bottles', slug: 'full-bottles' },
        { name: 'New Arrivals', slug: 'new-arrivals' },
        { name: 'Best Sellers', slug: 'best-sellers' },
        { name: 'Summer', slug: 'summer' },
        { name: 'Winter', slug: 'winter' },
        { name: 'For Him', slug: 'for-him' },
        { name: 'For Her', slug: 'for-her' }
      ];
      await prisma.category.createMany({
        data: defaultCategories,
        skipDuplicates: true
      });
      categories = await prisma.category.findMany({
        orderBy: { name: 'asc' }
      });
    }
    return res.status(200).json(categories);
  } catch (err) {
    logApiError('/api/categories', 'GET', req, err);
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

// PATCH update category (admin only)
app.patch('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, slug } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: 'Missing name or slug for category' });
  }
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name, slug }
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Failed to update category:', err);
    return res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category (admin only)
app.delete('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if any products are linked to this category
    const linkedProducts = await prisma.product.count({
      where: { categoryId: id }
    });
    if (linkedProducts > 0) {
      return res.status(400).json({ error: 'Cannot delete category because it has products linked to it.' });
    }

    await prisma.category.delete({
      where: { id }
    });
    return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete category:', err);
    return res.status(500).json({ error: 'Failed to delete category' });
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

    if (profileUser && profileUser.orders) {
      profileUser.orders = profileUser.orders.map(o => ({
        ...o,
        total: parseFloat(o.total)
      }));
    }

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
    const updateData = {
      name: normalizeRequiredString(name) || dbUser.name,
      phone: normalizeRequiredString(phone) || dbUser.phone
    };

    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: updateData,
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

// POST elevate user to admin with secret passcode - Removed for Security Hardening


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

    const allVariants = await prisma.productVariant.findMany({
      where: { isActive: true },
      include: {
        product: { select: { name: true } }
      }
    });
    const lowStockVariants = allVariants.filter(v => v.stock <= v.lowStockThreshold);
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

    const pendingReviews = await prisma.review.count({
      where: { approved: false }
    });

    const failedPayments = await prisma.payment.count({
      where: { status: 'FAILED' }
    });

    return res.status(200).json({
      totalRevenue,
      totalOrders,
      totalUsers,
      pendingOrders,
      lowStockVariants: formattedLowStock,
      bestSellers,
      pendingReviews,
      failedPayments
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
          select: { name: true, email: true, phone: true }
        },
        address: true,
        orderItems: true
      }
    });

    return res.status(200).json(orders.map(formatOrder));
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
        user: { select: { name: true, email: true, phone: true } },
        address: true,
        orderItems: true
      }
    });

    return res.status(200).json(formatOrder(updatedOrder));
  } catch (err) {
    console.error('Failed to update order status:', err);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET all payments ledger (admin only)
app.get('/api/admin/payments', requireAuth, requireAdmin, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            user: { select: { name: true, email: true, phone: true } }
          }
        }
      }
    });

    const response = payments.map(p => ({
      id: p.id,
      orderId: p.orderId,
      customerName: p.order?.user?.name || 'Collector',
      customerEmail: p.order?.user?.email || 'N/A',
      customerPhone: p.order?.user?.phone || 'N/A',
      provider: p.provider,
      transactionId: p.transactionId || (p.provider === 'COD' ? 'COD_Fulfill' : 'N/A'),
      amount: parseFloat(p.amount),
      status: p.status,
      paidDate: p.paidAt || p.createdAt
    }));

    return res.status(200).json(response);
  } catch (err) {
    console.error('Failed to fetch admin payments:', err);
    return res.status(500).json({ error: 'Failed to fetch admin payments' });
  }
});

// GET all users for admin
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        addresses: true,
        orders: {
          select: {
            id: true,
            total: true,
            createdAt: true
          }
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
      addresses: u.addresses,
      orders: u.orders.map(o => ({
        id: o.id,
        total: parseFloat(o.total),
        createdAt: o.createdAt
      })),
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

// ============================================================
// STORE CONFIGURATION SETTINGS
// ============================================================

// GET store settings (public)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.storeSetting.findUnique({
      where: { id: 'default' }
    });
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    const { razorpaySecret, ...publicSettings } = settings;
    return res.status(200).json(publicSettings);
  } catch (err) {
    logApiError('/api/settings', 'GET', req, err);
    return res.status(500).json({ error: 'Failed to fetch store settings' });
  }
});

// GET store settings for admin (admin only)
app.get('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.storeSetting.findUnique({
      where: { id: 'default' }
    });
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    return res.status(200).json(settings);
  } catch (err) {
    console.error('Failed to fetch admin settings:', err);
    return res.status(500).json({ error: 'Failed to fetch admin settings' });
  }
});

// PATCH update store settings (admin only)
app.patch('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  const { storeName, supportEmail, supportPhone, codEnabled, shippingCharges, freeShippingThreshold, razorpayKey, razorpaySecret } = req.body;
  
  const updateData = {};
  if (storeName !== undefined) updateData.storeName = storeName;
  if (supportEmail !== undefined) updateData.supportEmail = supportEmail;
  if (supportPhone !== undefined) updateData.supportPhone = supportPhone;
  if (codEnabled !== undefined) updateData.codEnabled = !!codEnabled;
  if (shippingCharges !== undefined) updateData.shippingCharges = parseFloat(shippingCharges);
  if (freeShippingThreshold !== undefined) updateData.freeShippingThreshold = parseFloat(freeShippingThreshold);
  if (razorpayKey !== undefined) updateData.razorpayKey = razorpayKey;
  if (razorpaySecret !== undefined && razorpaySecret !== '••••••••••••••••••••••••') {
    updateData.razorpaySecret = razorpaySecret;
  }

  try {
    const updated = await prisma.storeSetting.update({
      where: { id: 'default' },
      data: updateData
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Failed to update store settings:', err);
    return res.status(500).json({ error: 'Failed to update store settings' });
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
        variants: p.variants.map(v => ({
          ...v,
          price: parseFloat(v.price)
        })),
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

// POST add image to product (admin only)
app.post('/api/products/:id/images', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { imageUrl, altText, position } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing imageUrl' });
  }
  try {
    const newImage = await prisma.productImage.create({
      data: {
        productId: id,
        imageUrl,
        altText: altText || null,
        position: position !== undefined ? parseInt(position) : 0
      }
    });
    return res.status(201).json(newImage);
  } catch (err) {
    console.error('Failed to add image:', err);
    return res.status(500).json({ error: 'Failed to add image' });
  }
});

// DELETE remove image from product (admin only)
app.delete('/api/products/:id/images/:imageId', requireAuth, requireAdmin, async (req, res) => {
  const { imageId } = req.params;
  try {
    await prisma.productImage.delete({
      where: { id: imageId }
    });
    return res.status(200).json({ success: true, message: 'Image deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete image:', err);
    return res.status(500).json({ error: 'Failed to delete image' });
  }
});

// POST add variant to product (admin only)
app.post('/api/products/:id/variants', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { size, price, stock, sku, lowStockThreshold } = req.body;
  if (!size || price === undefined || !sku) {
    return res.status(400).json({ error: 'Missing size, price, or SKU' });
  }
  try {
    const newVariant = await prisma.productVariant.create({
      data: {
        productId: id,
        size,
        price: parseFloat(price),
        stock: stock !== undefined ? parseInt(stock) : 0,
        sku,
        lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 5,
        isActive: true
      }
    });
    return res.status(201).json({
      ...newVariant,
      price: parseFloat(newVariant.price)
    });
  } catch (err) {
    console.error('Failed to add variant:', err);
    return res.status(500).json({ error: 'Failed to add variant' });
  }
});

// PATCH update variant (admin only)
app.patch('/api/products/:id/variants/:variantId', requireAuth, requireAdmin, async (req, res) => {
  const { variantId } = req.params;
  const { size, price, stock, sku, lowStockThreshold, isActive } = req.body;
  try {
    const data = {};
    if (size !== undefined) data.size = size;
    if (price !== undefined) data.price = parseFloat(price);
    if (stock !== undefined) data.stock = parseInt(stock);
    if (sku !== undefined) data.sku = sku;
    if (lowStockThreshold !== undefined) data.lowStockThreshold = parseInt(lowStockThreshold);
    if (isActive !== undefined) data.isActive = !!isActive;

    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantId },
      data
    });
    return res.status(200).json({
      ...updatedVariant,
      price: parseFloat(updatedVariant.price)
    });
  } catch (err) {
    console.error('Failed to update variant:', err);
    return res.status(500).json({ error: 'Failed to update variant' });
  }
});

// DELETE remove variant (admin only)
app.delete('/api/products/:id/variants/:variantId', requireAuth, requireAdmin, async (req, res) => {
  const { variantId } = req.params;
  try {
    await prisma.productVariant.delete({
      where: { id: variantId }
    });
    return res.status(200).json({ success: true, message: 'Variant deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete variant:', err);
    return res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// GET user cart items
app.get('/api/cart', requireAuth, async (req, res) => {
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: dbUser.id },
      include: {
        variant: {
          include: {
            product: true
          }
        }
      }
    });
    const formatted = cartItems.map(item => {
      if (item.variant) {
        return {
          ...item,
          variant: {
            ...item.variant,
            price: parseFloat(item.variant.price)
          }
        };
      }
      return item;
    });
    return res.status(200).json(formatted);
  } catch (err) {
    console.error('Failed to fetch cart:', err);
    return res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// POST add item to cart
app.post('/api/cart', requireAuth, async (req, res) => {
  const { variantId, quantity } = req.body;
  if (!variantId) {
    return res.status(400).json({ error: 'Missing variantId' });
  }
  const qty = parseInt(quantity) || 1;
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    
    // Get variant to check stock
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId }
    });
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    // Find if exists
    const existing = await prisma.cartItem.findUnique({
      where: {
        userId_variantId: {
          userId: dbUser.id,
          variantId
        }
      }
    });

    const newQuantity = existing ? (existing.quantity + qty) : qty;
    if (variant.stock < newQuantity) {
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Insufficient stock. Only ${variant.stock} available.`,
        stock: variant.stock
      });
    }

    if (existing) {
      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + qty },
        include: {
          variant: true
        }
      });
      return res.status(200).json({
        ...updated,
        variant: updated.variant ? { ...updated.variant, price: parseFloat(updated.variant.price) } : undefined
      });
    }

    const newItem = await prisma.cartItem.create({
      data: {
        userId: dbUser.id,
        variantId,
        quantity: qty
      },
      include: {
        variant: true
      }
    });
    return res.status(201).json({
      ...newItem,
      variant: newItem.variant ? { ...newItem.variant, price: parseFloat(newItem.variant.price) } : undefined
    });
  } catch (err) {
    console.error('Failed to add to cart:', err);
    return res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// PATCH update quantity
app.patch('/api/cart/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  if (quantity === undefined) {
    return res.status(400).json({ error: 'Missing quantity' });
  }
  const qty = parseInt(quantity);
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { variant: true }
    });
    if (!cartItem) {
      return res.status(404).json({ error: 'ITEM_NOT_FOUND', message: 'Cart item not found.' });
    }

    if (cartItem.userId !== dbUser.id) {
      return res.status(403).json({ error: 'UNAUTHORIZED', message: 'You do not own this cart item.' });
    }

    if (qty <= 0) {
      await prisma.cartItem.delete({
        where: { id }
      });
      return res.status(200).json({ success: true, message: 'Item removed' });
    }

    if (!cartItem.variant) {
      return res.status(404).json({ error: 'VARIANT_NOT_FOUND', message: 'Variant not found for this cart item.' });
    }
    if (cartItem.variant.stock < qty) {
      return res.status(400).json({
        error: 'INSUFFICIENT_STOCK',
        message: `Insufficient stock. Only ${cartItem.variant.stock} available.`,
        stock: cartItem.variant.stock
      });
    }

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity: qty },
      include: {
        variant: true
      }
    });
    return res.status(200).json({
      ...updated,
      variant: updated.variant ? { ...updated.variant, price: parseFloat(updated.variant.price) } : undefined
    });
  } catch (err) {
    console.error('Failed to update cart item:', err);
    return res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// DELETE remove cart item
app.delete('/api/cart/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    
    const cartItem = await prisma.cartItem.findUnique({
      where: { id }
    });
    if (!cartItem) {
      return res.status(404).json({ error: 'ITEM_NOT_FOUND', message: 'Cart item not found.' });
    }

    if (cartItem.userId !== dbUser.id) {
      return res.status(403).json({ error: 'UNAUTHORIZED', message: 'You do not own this cart item.' });
    }

    await prisma.cartItem.delete({
      where: { id }
    });
    return res.status(200).json({ success: true, message: 'Item removed successfully' });
  } catch (err) {
    console.error('Failed to delete cart item:', err);
    return res.status(500).json({ error: 'Failed to delete cart item' });
  }
});

// GET single order detail
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const dbUser = await getOrCreateDbUser(req.auth.userId);
    const order = await prisma.order.findFirst({
      where: { id, userId: dbUser.id },
      include: {
        address: true,
        orderItems: {
          include: {
            product: {
              include: {
                images: true
              }
            }
          }
        },
        payment: true
      }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(200).json(formatOrder(order));
  } catch (err) {
    console.error('Failed to fetch order details:', err);
    return res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// GET all inventory (admin only)
app.get('/api/admin/inventory', requireAuth, requireAdmin, async (req, res) => {
  try {
    const variants = await prisma.productVariant.findMany({
      include: {
        product: { select: { name: true } }
      },
      orderBy: { product: { name: 'asc' } }
    });

    const response = variants.map(v => ({
      id: v.id,
      productId: v.productId,
      productName: v.product.name,
      size: v.size,
      sku: v.sku,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      isActive: v.isActive
    }));

    return res.status(200).json(response);
  } catch (err) {
    console.error('Failed to fetch admin inventory:', err);
    return res.status(500).json({ error: 'Failed to fetch admin inventory' });
  }
});

// PATCH update inventory stock (admin only)
app.patch('/api/admin/inventory/:variantId', requireAuth, requireAdmin, async (req, res) => {
  const { variantId } = req.params;
  const { stock, lowStockThreshold, note } = req.body;
  if (stock === undefined && lowStockThreshold === undefined) {
    return res.status(400).json({ error: 'Missing stock or threshold count' });
  }

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId }
    });
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const oldStock = variant.stock;
    const updateData = {};
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseInt(lowStockThreshold);

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData
    });

    // Create log if stock was changed
    if (stock !== undefined) {
      await prisma.inventoryLog.create({
        data: {
          variantId,
          oldStock,
          newStock: parseInt(stock),
          changeType: 'RESTOCK',
          note: note || 'Stock count manually updated from Inventory console'
        }
      });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Failed to update variant stock:', err);
    return res.status(500).json({ error: 'Failed to update variant stock' });
  }
});

// PATCH update user role (admin only - support both route aliases)
const patchUserRoleHandler = async (req, res) => {
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
};
app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, patchUserRoleHandler);
app.patch('/api/admin/users/:id', requireAuth, requireAdmin, patchUserRoleHandler);

// Default root status route
app.get('/api/status', (req, res) => {
  return res.json({ status: 'healthy', database: 'connected' });
});

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    // Perform simple query to verify db connectivity
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (err) {
    logApiError('/health', 'GET', req, err);
    return res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});


// ─────────────────────────────────────────────────
// CAMPAIGN MANAGER ROUTES
// ─────────────────────────────────────────────────

// Public: get the currently active campaign (respects scheduling)
app.get('/api/campaigns/active', async (req, res) => {
  try {
    const now = new Date();
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    // Filter by schedule: only campaigns where now is within [startDate, endDate]
    const valid = campaigns.find(c => {
      const afterStart = !c.startDate || now >= c.startDate;
      const beforeEnd = !c.endDate || now <= c.endDate;
      return afterStart && beforeEnd;
    });
    if (!valid) return res.status(204).end();
    return res.json(valid);
  } catch (err) {
    logApiError('/api/campaigns/active', 'GET', req, err);
    return res.status(500).json({ error: 'Failed to fetch active campaign' });
  }
});

// Admin: list all campaigns
app.get('/api/admin/campaigns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(campaigns);
  } catch (err) {
    console.error('Failed to list campaigns:', err);
    return res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

// Admin: create campaign
app.post('/api/admin/campaigns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { isActive, title, subheading, imageUrl, badge, displayPrice, ctaText, ctaDestination, displayMode, startDate, endDate } = req.body;
    const campaign = await prisma.campaign.create({
      data: {
        isActive: isActive ?? false,
        title: title || 'Special Offer',
        subheading: subheading || null,
        imageUrl: imageUrl || null,
        badge: badge || null,
        displayPrice: displayPrice || null,
        ctaText: ctaText || 'Shop Now',
        ctaDestination: ctaDestination || 'shop',
        displayMode: displayMode || 'once_per_day',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      }
    });
    return res.status(201).json(campaign);
  } catch (err) {
    console.error('Failed to create campaign:', err);
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Admin: update campaign
app.patch('/api/admin/campaigns/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, title, subheading, imageUrl, badge, displayPrice, ctaText, ctaDestination, displayMode, startDate, endDate } = req.body;
    const data = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (title !== undefined) data.title = title;
    if (subheading !== undefined) data.subheading = subheading;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (badge !== undefined) data.badge = badge;
    if (displayPrice !== undefined) data.displayPrice = displayPrice;
    if (ctaText !== undefined) data.ctaText = ctaText;
    if (ctaDestination !== undefined) data.ctaDestination = ctaDestination;
    if (displayMode !== undefined) data.displayMode = displayMode;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

    const campaign = await prisma.campaign.update({ where: { id }, data });
    return res.json(campaign);
  } catch (err) {
    console.error('Failed to update campaign:', err);
    return res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Admin: delete campaign
app.delete('/api/admin/campaigns/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    return res.status(204).end();
  } catch (err) {
    console.error('Failed to delete campaign:', err);
    return res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Start listening
app.listen(PORT, async () => {
  console.log(`Express API server running on http://localhost:${PORT}`);
  
  // Run startup database and schema verification
  await verifyDatabaseSchema();
  
  console.log('\n====== CLERK AUTH PROCESS CONFIGURATION ======');
  console.log('CLERK_SECRET_KEY Present:', !!process.env.CLERK_SECRET_KEY);
  console.log('CLERK_SECRET_KEY Value:', process.env.CLERK_SECRET_KEY);
  console.log('CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY);
  console.log('Current Cwd:', process.cwd());
  console.log('==============================================\n');

  console.log('\n====== RAZORPAY CONFIGURATION ======');
  console.log({
    key: process.env.RAZORPAY_KEY_ID,
    secretLength: process.env.RAZORPAY_KEY_SECRET?.length
  });
  console.log('====================================\n');
});

