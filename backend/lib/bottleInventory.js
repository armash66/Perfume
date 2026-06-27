import { prisma } from './prisma.js';

/**
 * Gets the total remaining ML across all OPEN bottles for a product.
 * @param {object} tx - Prisma client/transaction instance
 * @param {string} productId - Product ID
 * @returns {Promise<number>} Total remaining ML
 */
export async function getTotalOpenML(tx, productId) {
  const openBottles = await tx.bottleInventory.findMany({
    where: {
      productId,
      status: 'OPEN',
    },
    select: {
      remainingML: true,
    },
  });
  return openBottles.reduce((sum, b) => sum + b.remainingML, 0);
}

/**
 * Recomputes and updates the ProductVariant.stock temporary cache for all variants of a product.
 * @param {object} tx - Prisma client/transaction instance
 * @param {string} productId - Product ID
 */
export async function recomputeVariantStock(tx, productId) {
  const totalML = await getTotalOpenML(tx, productId);
  const variants = await tx.productVariant.findMany({
    where: { productId, isActive: true },
  });

  for (const variant of variants) {
    const computedStock = Math.floor(totalML / variant.volumeML);
    await tx.productVariant.update({
      where: { id: variant.id },
      data: { stock: computedStock },
    });
  }
}

/**
 * Deducts liquid volume from the product's bottles using FIFO.
 * If a bottle is fully drained, its status is set to EMPTY.
 * Logs InventoryMovement for each deduction.
 * @param {object} tx - Prisma client/transaction instance
 * @param {string} productId - Product ID
 * @param {number} volumeML - ML per unit of the variant
 * @param {number} quantity - Quantity of units purchased
 * @param {string} orderId - Linked Order ID
 * @param {string} [adminId] - Optional Admin ID making the change
 */
export async function deductFromBottle(tx, productId, volumeML, quantity, orderId, adminId = null) {
  let totalToDeduct = volumeML * quantity;
  if (totalToDeduct <= 0) return;

  // 1. Verify total available stock across all OPEN bottles first
  const totalAvailable = await getTotalOpenML(tx, productId);
  if (totalAvailable < totalToDeduct) {
    throw new Error(`Insufficient stock: Requested ${totalToDeduct}ml but only ${totalAvailable}ml is available in open bottles.`);
  }

  // 2. Fetch all OPEN bottles sorted by createdAt ascending (FIFO)
  const openBottles = await tx.bottleInventory.findMany({
    where: {
      productId,
      status: 'OPEN',
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  for (const bottle of openBottles) {
    if (totalToDeduct <= 0) break;

    const availableInBottle = bottle.remainingML;
    const deductAmount = Math.min(availableInBottle, totalToDeduct);

    const newRemaining = availableInBottle - deductAmount;
    const newStatus = newRemaining === 0 ? 'EMPTY' : 'OPEN';

    // Update bottle
    await tx.bottleInventory.update({
      where: { id: bottle.id },
      data: {
        remainingML: newRemaining,
        status: newStatus,
      },
    });

    // Log movement
    await tx.inventoryMovement.create({
      data: {
        bottleId: bottle.id,
        type: 'SALE',
        quantityML: -deductAmount,
        orderId,
        adminId,
        note: `Order Deduction: ${deductAmount}ml for order item`,
      },
    });

    totalToDeduct -= deductAmount;
  }

  // 3. Recompute variant stock cache
  await recomputeVariantStock(tx, productId);
}

/**
 * Restores volume to the bottles from which it was originally deducted.
 * Falls back to the oldest OPEN/EMPTY bottle if no specific SALE movements are found.
 * Logs InventoryMovement for each restoration.
 * @param {object} tx - Prisma client/transaction instance
 * @param {string} productId - Product ID
 * @param {number} volumeML - ML per unit of the variant
 * @param {number} quantity - Quantity of units to restore
 * @param {string} orderId - Linked Order ID
 * @param {string} [adminId] - Optional Admin ID making the change
 */
export async function restoreToBottle(tx, productId, volumeML, quantity, orderId, adminId = null) {
  let totalToRestore = volumeML * quantity;
  if (totalToRestore <= 0) return;

  // 1. Find the SALE movements for this orderId and this product
  // Since order items link to variants, we can find movements related to bottles of this product
  const originalMovements = await tx.inventoryMovement.findMany({
    where: {
      orderId,
      type: 'SALE',
      bottle: {
        productId,
      },
    },
    include: {
      bottle: true,
    },
  });

  if (originalMovements.length > 0) {
    // Restore exactly to the bottles they came from
    for (const movement of originalMovements) {
      // Calculate how much was deducted (movement.quantityML is negative)
      const deductedAmount = Math.abs(movement.quantityML);
      const restoreAmount = Math.min(deductedAmount, totalToRestore);

      if (restoreAmount <= 0) continue;

      const newRemaining = movement.bottle.remainingML + restoreAmount;
      // If remainingML > 0 and status was EMPTY, mark it as OPEN again
      let newStatus = movement.bottle.status;
      if (newStatus === 'EMPTY' && newRemaining > 0) {
        newStatus = 'OPEN';
      }

      await tx.bottleInventory.update({
        where: { id: movement.bottle.id },
        data: {
          remainingML: newRemaining,
          status: newStatus,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          bottleId: movement.bottle.id,
          type: 'CANCELLATION',
          quantityML: restoreAmount,
          orderId,
          adminId,
          note: `Order Cancelled: Restored ${restoreAmount}ml to bottle`,
        },
      });

      totalToRestore -= restoreAmount;
    }
  }

  // 2. Fallback: If totalToRestore is still > 0 (or no original movements found),
  // add it to the oldest OPEN bottle, or oldest EMPTY bottle if no OPEN exists.
  if (totalToRestore > 0) {
    let targetBottle = await tx.bottleInventory.findFirst({
      where: { productId, status: 'OPEN' },
      orderBy: { createdAt: 'asc' },
    });

    if (!targetBottle) {
      targetBottle = await tx.bottleInventory.findFirst({
        where: { productId, status: 'EMPTY' },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (targetBottle) {
      const newRemaining = targetBottle.remainingML + totalToRestore;
      let newStatus = targetBottle.status;
      if (newStatus === 'EMPTY' && newRemaining > 0) {
        newStatus = 'OPEN';
      }

      await tx.bottleInventory.update({
        where: { id: targetBottle.id },
        data: {
          remainingML: newRemaining,
          status: newStatus,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          bottleId: targetBottle.id,
          type: 'CANCELLATION',
          quantityML: totalToRestore,
          orderId,
          adminId,
          note: `Order Cancelled: Restored ${totalToRestore}ml to bottle (fallback)`,
        },
      });
    }
  }

  // 3. Recompute variant stock cache
  await recomputeVariantStock(tx, productId);
}
