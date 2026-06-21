import { prisma } from './lib/prisma.js';

async function main() {
  console.log('Running seeder...');

  // 1. Seed Categories if empty
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    console.log('Seeding categories...');
    const defaultCategories = [
      { name: 'Shop All', slug: 'shop-all' },
      { name: 'Decants', slug: 'decants' },
      { name: 'Full Bottles', slug: 'full-bottles' },
      { name: 'New Arrivals', slug: 'new-arrivals' },
      { name: 'Best Sellers', slug: 'best-sellers' },
      { name: 'Summer', slug: 'summer' },
      { name: 'Winter', slug: 'winter' },
      { name: 'For Him', slug: 'for-him' },
      { name: 'For Her', slug: 'for-her' },
      { name: 'Luxury', slug: 'luxury' }
    ];
    await prisma.category.createMany({
      data: defaultCategories,
      skipDuplicates: true
    });
    console.log('Categories seeded.');
  } else {
    console.log('Categories table already has rows. Skipping category seed.');
  }

  // Fetch all categories for mapping
  const dbCategories = await prisma.category.findMany();
  const categoryMap = {};
  dbCategories.forEach(cat => {
    categoryMap[cat.slug] = cat.id;
  });

  // 2. Seed Sample Products if empty
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    console.log('Seeding sample products...');
    const sampleProducts = [
      {
        name: 'Oud Noir',
        brand: 'Decant Atelier',
        slug: 'oud-noir',
        description: 'A rich, dark, and mysterious blend of premium Cambodian oud, dark wood, spices, and patchouli.',
        featured: true,
        categorySlug: 'for-him',
        imageUrl: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto=format&fit=crop&q=60',
        prices: { '30ml': 2999, '50ml': 4599, '100ml': 7999 }
      },
      {
        name: 'Rose Elixir',
        brand: 'Decant Atelier',
        slug: 'rose-elixir',
        description: 'An elegant floral fragrance highlighting Turkish rose, vanilla, white musk, and soft amber.',
        featured: false,
        categorySlug: 'for-her',
        imageUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=500&auto=format&fit=crop&q=60',
        prices: { '30ml': 2499, '50ml': 3999, '100ml': 6999 }
      },
      {
        name: 'Tobacco Vanille',
        brand: 'Tom Ford',
        slug: 'tobacco-vanille',
        description: 'A warm and iconic fragrance featuring rich tobacco leaf, creamy vanilla, cacao, and dry fruit accords.',
        featured: true,
        categorySlug: 'best-sellers',
        imageUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=500&auto=format&fit=crop&q=60',
        prices: { '30ml': 5499, '50ml': 8999, '100ml': 15999 }
      },
      {
        name: 'Baccarat Rouge',
        brand: 'Maison Francis',
        slug: 'baccarat-rouge',
        description: 'A luminous and sophisticated fragrance laying on the skin like an amber, floral, and woody breeze.',
        featured: false,
        categorySlug: 'luxury',
        imageUrl: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=500&auto=format&fit=crop&q=60',
        prices: { '30ml': 6499, '50ml': 10999, '100ml': 19999 }
      },
      {
        name: 'Black Orchid',
        brand: 'Tom Ford',
        slug: 'black-orchid',
        description: 'A luxurious and sensual fragrance of rich, dark accords and an alluring potion of black orchids and spice.',
        featured: false,
        categorySlug: 'for-her',
        imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&auto=format&fit=crop&q=60',
        prices: { '30ml': 4499, '50ml': 7499, '100ml': 12999 }
      },
      {
        name: 'Aventus',
        brand: 'Creed',
        slug: 'aventus',
        description: 'The exceptional Aventus features top notes of pineapple, blackcurrant, apple, and bergamot, leading to a rich woody heart.',
        featured: true,
        categorySlug: 'for-him',
        imageUrl: 'https://images.unsplash.com/photo-1588405748373-122b2321bc31?w=500&auto=format&fit=crop&q=60',
        prices: { '30ml': 6999, '50ml': 11499, '100ml': 21999 }
      }
    ];

    for (const p of sampleProducts) {
      const categoryId = categoryMap[p.categorySlug] || null;
      
      const product = await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          description: p.description,
          featured: p.featured,
          isActive: true,
          categoryId: categoryId,
          images: {
            create: [
              {
                imageUrl: p.imageUrl,
                altText: `${p.name} primary image`,
                position: 0
              }
            ]
          },
          variants: {
            create: [
              {
                size: '30ml',
                price: p.prices['30ml'],
                stock: 50,
                sku: `${p.name.toUpperCase().replace(/\s+/g, '-')}-30ML`,
                isActive: true
              },
              {
                size: '50ml',
                price: p.prices['50ml'],
                stock: 50,
                sku: `${p.name.toUpperCase().replace(/\s+/g, '-')}-50ML`,
                isActive: true
              },
              {
                size: '100ml',
                price: p.prices['100ml'],
                stock: 50,
                sku: `${p.name.toUpperCase().replace(/\s+/g, '-')}-100ML`,
                isActive: true
              }
            ]
          }
        }
      });
      console.log(`Created product: ${product.name}`);
    }
    console.log('Sample products seeded.');
  } else {
    console.log('Products table already has rows. Skipping product seed.');
  }

  // 3. Ensure default Admin user exists
  const adminClerkId = 'user_3FIrMrbA3rY3bNCzZWTjiefI6xn';
  const adminUser = await prisma.user.upsert({
    where: { clerkId: adminClerkId },
    update: { role: 'ADMIN', name: 'Armash Ansari' },
    create: {
      clerkId: adminClerkId,
      email: 'admin@decantatelier.com',
      name: 'Armash Ansari',
      role: 'ADMIN'
    }
  });
  console.log('Admin user verified:', adminUser.email);
}

main()
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
