import { prisma } from './lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: { shippingCharges: 100 },
    create: {
      id: 'default',
      storeName: 'Decant Atelier',
      supportEmail: 'concierge@decantatelier.com',
      supportPhone: '+91 97681 88453',
      codEnabled: true,
      shippingCharges: 100,
      freeShippingThreshold: 1999
    }
  });
  console.log('Successfully updated database store settings shippingCharges to 100.');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
