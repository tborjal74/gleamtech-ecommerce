import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client';

import { AdminAnalyticsService } from './admin-analytics.service.js';

function createPrismaMock() {
  return {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };
}

describe('AdminAnalyticsService', () => {
  it('calculates paid sales, date-filtered orders, product rankings, customers, and listing counts from database data', async () => {
    const prisma = createPrismaMock();
    const service = new AdminAnalyticsService(prisma as any);

    prisma.order.aggregate.mockResolvedValue({ _sum: { totalMinor: 12500 }, _count: { _all: 2 } });
    prisma.order.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prisma.user.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3);
    prisma.product.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'low-1',
        sku: 'LOW-1',
        name: 'Low Stock',
        image: '/assets/low.jpg',
        active: true,
        isPublished: true,
        inventory: { stockQuantity: 2 },
      },
    ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          productId: 'prod-a',
          productName: 'Cleaner A',
          productSku: 'SKU-A',
          quantitySold: 3,
          orderCount: 2,
          revenueMinor: 9000,
          currentPriceMinor: 3000,
          currentStock: 8,
          active: true,
          isPublished: true,
          image: '/assets/a.jpg',
        },
        {
          productId: 'prod-b',
          productName: 'Cleaner B',
          productSku: 'SKU-B',
          quantitySold: 1,
          orderCount: 1,
          revenueMinor: 3500,
          currentPriceMinor: 3500,
          currentStock: 5,
          active: false,
          isPublished: false,
          image: '/assets/b.jpg',
        },
      ])
      .mockResolvedValueOnce([{ day: new Date('2026-01-01T00:00:00.000Z'), value: 12500 }])
      .mockResolvedValueOnce([{ day: new Date('2026-01-01T00:00:00.000Z'), value: 4 }]);
    prisma.order.groupBy
      .mockResolvedValueOnce([{ status: OrderStatus.PAID, _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ paymentStatus: PaymentStatus.PAID, _count: { _all: 2 } }])
      .mockResolvedValueOnce([{ userId: 'customer-1', _count: { _all: 1 } }, { userId: 'customer-2', _count: { _all: 1 } }])
      .mockResolvedValueOnce([{ userId: 'customer-1', _count: { _all: 2 } }]);

    const result = await service.getAnalytics({ preset: 'custom', from: '2026-01-01', to: '2026-01-02' });

    expect(result.summary.totalPaidSales).toBe(125);
    expect(result.summary.totalPaidOrders).toBe(2);
    expect(result.summary.totalOrdersPlaced).toBe(4);
    expect(result.summary.pendingPaymentOrders).toBe(1);
    expect(result.products.mostOrderedProduct?.productSku).toBe('SKU-A');
    expect(result.products.highestQuantityProduct?.productSku).toBe('SKU-A');
    expect(result.products.leastOrderedProduct?.productSku).toBe('SKU-B');
    expect(result.products.deactivatedListings).toBe(2);
    expect(result.products.unpublishedListings).toBe(4);
    expect(result.customers.totalCustomerAccounts).toBe(10);
    expect(result.customers.newCustomers).toBe(3);
    expect(result.customers.customersWithPaidOrders).toBe(2);
    expect(result.customers.repeatCustomers).toBe(1);
    expect(prisma.user.count).toHaveBeenNthCalledWith(1, { where: { role: UserRole.CUSTOMER } });
    expect(prisma.order.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        paymentStatus: PaymentStatus.PAID,
        paidAt: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lt: new Date('2026-01-03T00:00:00.000Z'),
        },
      }),
    }));
  });

  it('rejects invalid custom date ranges', async () => {
    const service = new AdminAnalyticsService(createPrismaMock() as any);

    await expect(service.getAnalytics({ preset: 'custom', from: '2026-01-02', to: '2026-01-01' }))
      .rejects
      .toMatchObject({ code: 'INVALID_DATE_RANGE' });
  });
});
