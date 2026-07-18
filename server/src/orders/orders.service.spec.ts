import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import { OrdersService } from './orders.service.js';

function cancelledOrder() {
  return {
    id: 'order-1',
    userId: 'user-1',
    orderNumber: 'GT-TEST-01',
    idempotencyKey: 'idempotency-1',
    status: OrderStatus.CANCELLED,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.GCASH,
    subtotalMinor: 2000,
    discountMinor: 0,
    promoCode: null,
    promoPercentOff: null,
    shippingMinor: 0,
    totalMinor: 2000,
    shippingName: 'Test Customer',
    shippingPhone: '09171234567',
    shippingLine1: '1 Test Street',
    shippingLine2: null,
    shippingCity: 'Antipolo',
    shippingRegion: 'Rizal',
    shippingPostal: '1870',
    shippingCountry: 'PH',
    customerNote: null,
    paidConfirmationEmailSentAt: null,
    paidConfirmationEmailLastError: null,
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [{
      id: 'item-1',
      orderId: 'order-1',
      productId: 'product-1',
      productName: 'Cleaner',
      productSku: 'SKU-1',
      unitPriceMinor: 1000,
      quantity: 2,
      lineTotalMinor: 2000,
    }],
    requests: [],
    paymentSubmission: null,
  };
}

describe('OrdersService cancellation inventory integrity', () => {
  it('restores inventory only after atomically claiming the cancellable order', async () => {
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue(cancelledOrder()),
      },
      inventory: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new OrdersService(prisma as never, {} as never, {} as never);

    await service.cancelOrder('user-1', 'order-1');

    expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'order-1', userId: 'user-1' }),
    }));
    expect(tx.inventory.upsert).toHaveBeenCalledTimes(1);
  });

  it('does not restore inventory when another request already claimed the order', async () => {
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'order-1' }),
        findUniqueOrThrow: jest.fn(),
      },
      inventory: { upsert: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new OrdersService(prisma as never, {} as never, {} as never);

    await expect(service.cancelOrder('user-1', 'order-1')).rejects.toMatchObject({ code: 'ORDER_CANCELLATION_NOT_ALLOWED' });
    expect(tx.inventory.upsert).not.toHaveBeenCalled();
  });
});
