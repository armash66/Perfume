import { prisma } from './lib/prisma.js';

async function main() {
  console.log('Starting seeder...');

  // 1. Clean existing records (except the admin user)
  console.log('Cleaning existing records...');
  await prisma.inventoryLog.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.collectionProduct.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  
  // Clean all users EXCEPT the ADMIN user we have
  await prisma.user.deleteMany({
    where: {
      clerkId: { not: 'user_3FIrMrbA3rY3bNCzZWTjiefI6xn' }
    }
  });

  // Ensure our admin user is present and correct
  const adminUser = await prisma.user.upsert({
    where: { clerkId: 'user_3FIrMrbA3rY3bNCzZWTjiefI6xn' },
    update: { role: 'ADMIN', name: 'Armash Ansari' },
    create: {
      clerkId: 'user_3FIrMrbA3rY3bNCzZWTjiefI6xn',
      email: 'user_3FIrMrbA3rY3bNCzZWTjiefI6xn@clerk.local',
      name: 'Armash Ansari',
      role: 'ADMIN'
    }
  });
  console.log('Admin user verified:', adminUser.email);

  // 2. Create Categories
  console.log('Creating categories...');
  const catDecants = await prisma.category.create({
    data: { name: 'Decants', slug: 'decants' }
  });
  const catSets = await prisma.category.create({
    data: { name: 'Sets & Discovery Pouches', slug: 'sets' }
  });
  const catFullBottles = await prisma.category.create({
    data: { name: 'Full Retail Bottles', slug: 'fullbottles' }
  });

  const categories = {
    decants: catDecants.id,
    sets: catSets.id,
    fullbottles: catFullBottles.id
  };

  // 3. Create Products, Images and Variants
  console.log('Creating products, images, and variants...');
  
  const productSource = [
    {
      id: 'baccarat-rouge-540',
      name: 'Baccarat Rouge 540 Extrait',
      brand: 'Maison Francis Kurkdjian',
      description: 'Baccarat Rouge 540 Extrait de Parfum is a luxurious, intense, and instantly recognizable fragrance...',
      featured: true,
      category: 'decants',
      images: ['/images/perfume_1.jpeg', '/images/perfume_3.jpeg'],
      variants: [
        { size: '2ml Decant', price: 1500, stock: 15, sku: 'MFK-BR540E-2ML', threshold: 5 },
        { size: '5ml Decant', price: 3200, stock: 8, sku: 'MFK-BR540E-5ML', threshold: 5 },
        { size: '10ml Decant', price: 5800, stock: 2, sku: 'MFK-BR540E-10ML', threshold: 3 },
        { size: '30ml Decant', price: 14800, stock: 0, sku: 'MFK-BR540E-30ML', threshold: 2 }
      ]
    },
    {
      id: 'azzaro-the-most-wanted',
      name: 'The Most Wanted Eau de Parfum',
      brand: 'Azzaro',
      description: 'Azzaro The Most Wanted is an intense fragrance for men, designed to release your energy...',
      featured: true,
      category: 'decants',
      images: ['/images/perfume_2.jpeg', '/images/perfume_14.jpeg'],
      variants: [
        { size: '2ml Decant', price: 350, stock: 45, sku: 'AZZ-TMW-2ML', threshold: 10 },
        { size: '5ml Decant', price: 790, stock: 30, sku: 'AZZ-TMW-5ML', threshold: 8 },
        { size: '10ml Decant', price: 1450, stock: 18, sku: 'AZZ-TMW-10ML', threshold: 5 },
        { size: '30ml Decant', price: 3900, stock: 5, sku: 'AZZ-TMW-30ML', threshold: 2 }
      ]
    },
    {
      id: 'spicebomb-extreme',
      name: 'Spicebomb Extreme',
      brand: 'Viktor & Rolf',
      description: 'Spicebomb Extreme is a highly addictive and explosive fragrance. It opens with notes of pimento...',
      featured: false,
      category: 'decants',
      images: ['/images/perfume_4.jpeg', '/images/perfume_6.jpeg'],
      variants: [
        { size: '2ml Decant', price: 450, stock: 25, sku: 'VR-SE-2ML', threshold: 8 },
        { size: '5ml Decant', price: 990, stock: 14, sku: 'VR-SE-5ML', threshold: 5 },
        { size: '10ml Decant', price: 1850, stock: 3, sku: 'VR-SE-10ML', threshold: 5 },
        { size: '30ml Decant', price: 4900, stock: 1, sku: 'VR-SE-30ML', threshold: 2 }
      ]
    },
    {
      id: 'lattafa-yara',
      name: 'Yara Eau de Parfum',
      brand: 'Lattafa',
      description: 'Yara by Lattafa Perfumes is an exceptionally creamy, sweet, and comforting fragrance...',
      featured: true,
      category: 'decants',
      images: ['/images/perfume_7.jpeg', '/images/perfume_8.jpeg'],
      variants: [
        { size: '2ml Decant', price: 180, stock: 120, sku: 'LAT-YARA-2ML', threshold: 15 },
        { size: '5ml Decant', price: 390, stock: 75, sku: 'LAT-YARA-5ML', threshold: 10 },
        { size: '10ml Decant', price: 690, stock: 40, sku: 'LAT-YARA-10ML', threshold: 10 },
        { size: '30ml Decant', price: 1700, stock: 12, sku: 'LAT-YARA-30ML', threshold: 5 }
      ]
    },
    {
      id: 'lattafa-khamrah',
      name: 'Khamrah & Khamrah Qahwa',
      brand: 'Lattafa',
      description: 'Lattafa Khamrah is a warm, oriental, and boozy masterpiece. It opens with spices and dates...',
      featured: false,
      category: 'decants',
      images: ['/images/perfume_11.jpeg'],
      variants: [
        { size: '2ml Decant', price: 220, stock: 85, sku: 'LAT-KHM-2ML', threshold: 12 },
        { size: '5ml Decant', price: 490, stock: 42, sku: 'LAT-KHM-5ML', threshold: 8 },
        { size: '10ml Decant', price: 890, stock: 24, sku: 'LAT-KHM-10ML', threshold: 5 },
        { size: '30ml Decant', price: 2300, stock: 8, sku: 'LAT-KHM-30ML', threshold: 3 }
      ]
    },
    {
      id: 'valentino-born-in-roma',
      name: 'Born In Roma Uomo Intense',
      brand: 'Valentino',
      description: 'Valentino Born In Roma Uomo Intense is a tribute to the eternal city...',
      featured: true,
      category: 'decants',
      images: ['/images/perfume_18.jpeg', '/images/perfume_19.jpeg'],
      variants: [
        { size: '2ml Decant', price: 450, stock: 10, sku: 'VAL-BIR-2ML', threshold: 5 },
        { size: '5ml Decant', price: 950, stock: 4, sku: 'VAL-BIR-5ML', threshold: 5 },
        { size: '10ml Decant', price: 1800, stock: 0, sku: 'VAL-BIR-10ML', threshold: 3 }
      ]
    },
    {
      id: 'valentino-born-in-roma-set',
      name: 'Born In Roma Discovery Set',
      brand: 'Valentino',
      description: 'The Valentino Born In Roma Trio Discovery Set features three 5ml decants...',
      featured: true,
      category: 'sets',
      images: ['/images/perfume_17.jpeg'],
      variants: [
        { size: '3x 5ml Set', price: 2900, stock: 15, sku: 'VAL-BIR-TRIO', threshold: 3 }
      ]
    },
    {
      id: 'afnan-supremacy',
      name: 'Supremacy Not Only Intense',
      brand: 'Afnan',
      description: 'Afnan Supremacy Not Only Intense is a rich, fruity-smoky formulation built for maximum projection...',
      featured: false,
      category: 'fullbottles',
      images: ['/images/perfume_31.jpeg'],
      variants: [
        { size: '100ml Retail Bottle', price: 3900, stock: 20, sku: 'AFN-SNOI-100ML', threshold: 4 }
      ]
    },
    {
      id: 'bleu-de-chanel',
      name: 'Bleu de Chanel Eau de Parfum',
      brand: 'Chanel',
      description: 'Bleu de Chanel Eau de Parfum is an aromatic-woody fragrance that unites fresh citrus...',
      featured: true,
      category: 'fullbottles',
      images: ['/images/perfume_36.jpeg', '/images/perfume_38.jpeg'],
      variants: [
        { size: '100ml Retail Bottle', price: 14500, stock: 4, sku: 'CH-BDC-100ML', threshold: 2 }
      ]
    }
  ];

  const dbProducts = [];
  const dbVariants = [];

  for (const src of productSource) {
    const product = await prisma.product.create({
      data: {
        id: src.id,
        name: src.name,
        slug: src.id,
        description: src.description,
        brand: src.brand,
        featured: src.featured,
        isActive: true,
        categoryId: categories[src.category],
        images: {
          create: src.images.map((img, index) => ({
            imageUrl: img,
            altText: `${src.name} Image ${index + 1}`,
            position: index
          }))
        },
        variants: {
          create: src.variants.map(v => ({
            size: v.size,
            price: v.price,
            stock: v.stock,
            lowStockThreshold: v.threshold,
            sku: v.sku,
            isActive: true
          }))
        }
      },
      include: {
        images: true,
        variants: true
      }
    });

    dbProducts.push(product);
    dbVariants.push(...product.variants);
    console.log(`Product created: ${product.name}`);
  }

  // 4. Create independently managed storefront collection pages
  console.log('Creating storefront collections...');
  const collectionSource = [
    {
      name: 'Summer Perfumes', slug: 'summer', eyebrow: 'Seasonal Edit', sortOrder: 10,
      description: 'Discover fresh, citrusy, and aquatic fragrances perfect for hot Indian summers.',
      imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      products: ['bleu-de-chanel', 'afnan-supremacy', 'azzaro-the-most-wanted']
    },
    {
      name: 'Winter Perfumes', slug: 'winter', eyebrow: 'Seasonal Edit', sortOrder: 20,
      description: 'Explore warm, spicy, vanilla, and woody fragrances that perform exceptionally well in colder weather.',
      imageUrl: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?auto=format&fit=crop&w=1200&q=80',
      products: ['spicebomb-extreme', 'lattafa-khamrah', 'baccarat-rouge-540']
    },
    {
      name: 'Office Perfumes', slug: 'office', eyebrow: 'Occasion', sortOrder: 30,
      description: 'Professional, versatile, and crowd-pleasing fragrances ideal for work environments.',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      products: ['bleu-de-chanel', 'afnan-supremacy', 'azzaro-the-most-wanted']
    },
    {
      name: 'Gym Perfumes', slug: 'gym', eyebrow: 'Occasion', sortOrder: 40,
      description: 'Clean, energetic, and refreshing fragrances selected for active days.',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
      products: ['afnan-supremacy', 'bleu-de-chanel']
    },
    {
      name: 'Date Night Perfumes', slug: 'datenight', eyebrow: 'Occasion', sortOrder: 50,
      description: 'Seductive and memorable fragrances crafted for special moments.',
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      products: ['valentino-born-in-roma', 'baccarat-rouge-540', 'lattafa-yara']
    },
    {
      name: 'Party Perfumes', slug: 'party', eyebrow: 'Occasion', sortOrder: 60,
      description: 'Bold, attention-grabbing scents designed to stand out in any crowd.',
      imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
      products: ['spicebomb-extreme', 'valentino-born-in-roma', 'lattafa-khamrah']
    },
    {
      name: 'For Her', slug: 'her', eyebrow: 'Curated For You', sortOrder: 70,
      description: 'Elegant feminine scents, from romantic florals to confident statement fragrances.',
      imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=80',
      products: ['lattafa-yara', 'baccarat-rouge-540']
    },
    {
      name: 'For Him', slug: 'him', eyebrow: 'Curated For You', sortOrder: 80,
      description: 'Bold, charismatic, and refined masculine scents for every setting.',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
      products: ['azzaro-the-most-wanted', 'spicebomb-extreme', 'valentino-born-in-roma', 'bleu-de-chanel']
    },
    {
      name: 'New Arrivals', slug: 'newarrivals', eyebrow: 'Just Landed', sortOrder: 90,
      description: 'Explore the newest additions to the Decant Atelier catalogue.',
      imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80',
      products: ['valentino-born-in-roma-set', 'afnan-supremacy', 'bleu-de-chanel']
    },
    {
      name: 'Best Sellers', slug: 'bestsellers', eyebrow: 'Client Favorites', sortOrder: 100,
      description: 'Our most requested fragrances, selected from real catalogue favorites.',
      imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=80',
      products: productSource.filter(product => product.featured).map(product => product.id)
    }
  ];

  for (const source of collectionSource) {
    await prisma.collection.create({
      data: {
        name: source.name,
        slug: source.slug,
        eyebrow: source.eyebrow,
        description: source.description,
        imageUrl: source.imageUrl,
        sortOrder: source.sortOrder,
        items: {
          create: source.products.map((productId, position) => ({ productId, position }))
        }
      }
    });
  }

  // 5. Create Mock Users
  console.log('Creating mock users and addresses...');
  
  const user1 = await prisma.user.create({
    data: {
      clerkId: 'user_mock_client_1',
      email: 'fawwaz@decantatelier.com',
      name: 'Fawwaz Shaikh',
      phone: '+91 98200 12345',
      role: 'USER'
    }
  });

  const user2 = await prisma.user.create({
    data: {
      clerkId: 'user_mock_client_2',
      email: 'rohan.mehta@gmail.com',
      name: 'Rohan Mehta',
      phone: '+91 97681 55422',
      role: 'USER'
    }
  });

  const user3 = await prisma.user.create({
    data: {
      clerkId: 'user_mock_client_3',
      email: 'priya.sharma@yahoo.com',
      name: 'Priya Sharma',
      phone: '+91 99300 98765',
      role: 'USER'
    }
  });

  // Addresses
  const addr1 = await prisma.address.create({
    data: {
      userId: user1.id,
      fullName: 'Fawwaz Shaikh',
      phone: '+91 98200 12345',
      addressLine1: 'Flat 502, Orchid Heights',
      addressLine2: 'Carter Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400050',
      isDefault: true
    }
  });

  const addr2 = await prisma.address.create({
    data: {
      userId: user2.id,
      fullName: 'Rohan Mehta',
      phone: '+91 97681 55422',
      addressLine1: 'A-44, Shanti Kunj',
      addressLine2: 'Sector 56',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      postalCode: '122011',
      isDefault: true
    }
  });

  const addr3 = await prisma.address.create({
    data: {
      userId: user3.id,
      fullName: 'Priya Sharma',
      phone: '+91 99300 98765',
      addressLine1: 'Villa 12, Sobha Primrose',
      addressLine2: 'Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560103',
      isDefault: true
    }
  });

  // 5. Create Orders, OrderItems, Payments
  console.log('Seeding orders, payments, and reviews...');
  
  // Find variants helper
  const getVariant = (sku) => dbVariants.find(v => v.sku === sku);

  // Order 1: Delivered COD order (Yesterday)
  const o1Date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const v1_1 = getVariant('MFK-BR540E-5ML'); // 3200
  const v1_2 = getVariant('AZZ-TMW-10ML'); // 1450
  
  const order1 = await prisma.order.create({
    data: {
      userId: user1.id,
      addressId: addr1.id,
      subtotal: 4650.00,
      shippingFee: 0.00,
      total: 4650.00,
      paymentMethod: 'COD',
      status: 'DELIVERED',
      createdAt: o1Date,
      updatedAt: o1Date,
      orderItems: {
        create: [
          {
            productId: v1_1.productId,
            variantId: v1_1.id,
            productName: 'Baccarat Rouge 540 Extrait',
            size: v1_1.size,
            priceAtPurchase: v1_1.price,
            quantity: 1,
            createdAt: o1Date
          },
          {
            productId: v1_2.productId,
            variantId: v1_2.id,
            productName: 'The Most Wanted Eau de Parfum',
            size: v1_2.size,
            priceAtPurchase: v1_2.price,
            quantity: 1,
            createdAt: o1Date
          }
        ]
      }
    }
  });

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      provider: 'COD',
      transactionId: 'COD_REC_BANDRA_01',
      amount: 4650.00,
      status: 'SUCCESS',
      paidAt: o1Date,
      createdAt: o1Date
    }
  });

  // Order 2: Processing Razorpay Order (Today)
  const o2Date = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const v2_1 = getVariant('LAT-YARA-30ML'); // 1700
  
  const order2 = await prisma.order.create({
    data: {
      userId: user2.id,
      addressId: addr2.id,
      subtotal: 1700.00,
      shippingFee: 100.00, // Standard shipping fee
      total: 1800.00,
      paymentMethod: 'RAZORPAY',
      status: 'PROCESSING',
      razorpayOrderId: 'order_O2RpTestRazorpay99',
      createdAt: o2Date,
      updatedAt: o2Date,
      orderItems: {
        create: [
          {
            productId: v2_1.productId,
            variantId: v2_1.id,
            productName: 'Yara Yara Eau de Parfum',
            size: v2_1.size,
            priceAtPurchase: v2_1.price,
            quantity: 1,
            createdAt: o2Date
          }
        ]
      }
    }
  });

  await prisma.payment.create({
    data: {
      orderId: order2.id,
      provider: 'RAZORPAY',
      transactionId: 'pay_RP_SUCCESS_TRANS88',
      amount: 1800.00,
      status: 'SUCCESS',
      paidAt: o2Date,
      createdAt: o2Date
    }
  });

  // Order 3: Pending COD Order requiring confirmation (Today, recently)
  const o3Date = new Date(Date.now() - 30 * 60 * 1000);
  const v3_1 = getVariant('CH-BDC-100ML'); // 14500
  
  const order3 = await prisma.order.create({
    data: {
      userId: user3.id,
      addressId: addr3.id,
      subtotal: 14500.00,
      shippingFee: 0.00,
      total: 14500.00,
      paymentMethod: 'COD',
      status: 'PENDING',
      createdAt: o3Date,
      updatedAt: o3Date,
      orderItems: {
        create: [
          {
            productId: v3_1.productId,
            variantId: v3_1.id,
            productName: 'Bleu de Chanel Eau de Parfum',
            size: v3_1.size,
            priceAtPurchase: v3_1.price,
            quantity: 1,
            createdAt: o3Date
          }
        ]
      }
    }
  });

  await prisma.payment.create({
    data: {
      orderId: order3.id,
      provider: 'COD',
      amount: 14500.00,
      status: 'PENDING',
      createdAt: o3Date
    }
  });

  // Order 4: Cancelled Razorpay order (Failed Payment Alert)
  const o4Date = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const v4_1 = getVariant('VR-SE-10ML'); // 1850
  
  const order4 = await prisma.order.create({
    data: {
      userId: user2.id,
      addressId: addr2.id,
      subtotal: 1850.00,
      shippingFee: 100.00,
      total: 1950.00,
      paymentMethod: 'RAZORPAY',
      status: 'CANCELLED',
      razorpayOrderId: 'order_O4FailedPay999',
      createdAt: o4Date,
      updatedAt: o4Date,
      orderItems: {
        create: [
          {
            productId: v4_1.productId,
            variantId: v4_1.id,
            productName: 'Spicebomb Extreme',
            size: v4_1.size,
            priceAtPurchase: v4_1.price,
            quantity: 1,
            createdAt: o4Date
          }
        ]
      }
    }
  });

  await prisma.payment.create({
    data: {
      orderId: order4.id,
      provider: 'RAZORPAY',
      transactionId: 'pay_RP_FAILED_TRANS_002',
      amount: 1950.00,
      status: 'FAILED',
      createdAt: o4Date
    }
  });

  // 6. Seed Customer Reviews
  console.log('Seeding reviews...');
  
  const p1 = dbProducts.find(p => p.id === 'baccarat-rouge-540');
  await prisma.review.create({
    data: {
      userId: user1.id,
      productId: p1.id,
      orderId: order1.id,
      rating: 5,
      title: 'Absolutely Stunning',
      comment: 'Authentic saffron warmth and longevity is eternal! Best decant shop online.',
      approved: true,
      createdAt: o1Date
    }
  });

  const p2 = dbProducts.find(p => p.id === 'azzaro-the-most-wanted');
  await prisma.review.create({
    data: {
      userId: user1.id,
      productId: p2.id,
      orderId: order1.id,
      rating: 5,
      title: 'Pure Compliment Getter',
      comment: 'Love the toffee and cardamom blend. Decant atomizer is high quality spray!',
      approved: true,
      createdAt: o1Date
    }
  });

  const p3 = dbProducts.find(p => p.id === 'lattafa-yara');
  await prisma.review.create({
    data: {
      userId: user2.id,
      productId: p3.id,
      orderId: order2.id,
      rating: 4,
      title: 'Creamy and sweet',
      comment: 'Very feminine sweet gourmand, wife loved it. Delivery took 2 days.',
      approved: false, // Pending moderation review
      createdAt: o2Date
    }
  });

  // 7. Seed Inventory logs
  console.log('Seeding inventory logs...');
  const vLog1 = getVariant('MFK-BR540E-30ML');
  await prisma.inventoryLog.create({
    data: {
      variantId: vLog1.id,
      oldStock: 5,
      newStock: 0,
      changeType: 'ORDER',
      note: 'Order cmql123 decrement',
      createdAt: o1Date
    }
  });

  const vLog2 = getVariant('VR-SE-10ML');
  await prisma.inventoryLog.create({
    data: {
      variantId: vLog2.id,
      oldStock: 0,
      newStock: 3,
      changeType: 'RESTOCK',
      note: 'Admin restocked +3 units from French house import',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  });

  console.log('Database seeding completed successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
