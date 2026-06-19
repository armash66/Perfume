import { prisma } from './lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS ---');
  console.log(users);
  
  const products = await prisma.product.findMany({
    include: {
      variants: true
    }
  });
  console.log('--- PRODUCTS COUNT ---', products.length);
  if (products.length > 0) {
    console.log('First product sample:', JSON.stringify(products[0], null, 2));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
