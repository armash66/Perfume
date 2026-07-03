import { prisma } from './lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

function parseVolumeML(sizeName) {
  // Parse numbers from sizeName, e.g. "5ml Decant" -> 5, "10ml" -> 10, "20 ml" -> 20
  const match = sizeName.match(/(\d+)\s*ml/i);
  if (match) {
    return parseInt(match[1]);
  }
  // Fallbacks
  if (sizeName.includes('5')) return 5;
  if (sizeName.includes('10')) return 10;
  if (sizeName.includes('20')) return 20;
  if (sizeName.includes('30')) return 30;
  return 10; // Default fallback
}

async function main() {
  console.log('Starting bottle-based inventory migration...');

  const products = await prisma.product.findMany({
    include: {
      variants: true,
      bottles: true
    }
  });

  console.log(`Found ${products.length} products to migrate.`);

  for (const product of products) {
    console.log(`\nMigrating product: ${product.name}`);

    // 1. Update variant volumeML values
    let totalMLCover = 0;
    for (const variant of product.variants) {
      const volume = parseVolumeML(variant.size);
      console.log(`  - Variant: ${variant.size} (Current stock cache: ${variant.stock}) -> set volumeML = ${volume}ml`);
      
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { volumeML: volume }
      });

      totalMLCover += (variant.stock * volume);
    }

    // 2. Check if a bottle already exists for this product
    if (product.bottles.length > 0) {
      console.log(`  - Product already has ${product.bottles.length} bottles. Skipping bottle initialization.`);
      continue;
    }

    // 3. Create a 100ml bottle (matches DEFAULT_BOTTLE_SIZE_ML) to cover legacy stock
    const DEFAULT_ML = 100;
    const initialRemaining = Math.max(DEFAULT_ML, totalMLCover);
    const bottleSize = Math.max(DEFAULT_ML, totalMLCover);

    console.log(`  - Creating initial bottle: Size = ${bottleSize}ml, Remaining = ${initialRemaining}ml`);

    const bottle = await prisma.bottleInventory.create({
      data: {
        productId: product.id,
        bottleLabel: 'Bottle #001',
        bottleSizeML: bottleSize,
        remainingML: initialRemaining,
        lowStockThresholdML: 20,
        status: 'OPEN',
        notes: 'Legacy stock system migration initialization'
      }
    });

    // 4. Log the movement
    await prisma.inventoryMovement.create({
      data: {
        bottleId: bottle.id,
        type: 'RESTOCK',
        quantityML: initialRemaining,
        note: 'Legacy stock system migration initialization',
        adminId: 'Migration Script'
      }
    });

    console.log(`  - Successfully initialized bottle: ${bottle.bottleLabel} (ID: ${bottle.id})`);
  }

  console.log('\nMigration script completed successfully!');
}

main()
  .catch(err => {
    console.error('Error migrating to bottle inventory:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
