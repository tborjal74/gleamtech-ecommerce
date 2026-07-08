import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async tx => {
    const statusHistory = await tx.orderStatusHistory.deleteMany();
    const items = await tx.orderItem.deleteMany();
    const orders = await tx.order.deleteMany();
    const sequences = await tx.orderSequence.deleteMany();

    return {
      orders: orders.count,
      items: items.count,
      statusHistory: statusHistory.count,
      sequences: sequences.count,
    };
  });

  console.log('Order reset complete.');
  console.log(`Deleted orders: ${result.orders}`);
  console.log(`Deleted order items: ${result.items}`);
  console.log(`Deleted order status history rows: ${result.statusHistory}`);
  console.log(`Deleted order sequences: ${result.sequences}`);
}

main()
  .catch(error => {
    console.error('Order reset failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
