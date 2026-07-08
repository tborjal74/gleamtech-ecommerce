import { OrderStatus } from '@prisma/client';

import { ApiError } from '../common/api-error.js';
import { assertOrderStatusTransition } from './order-status-transitions.js';

describe('order status transitions', () => {
  it('allows supported fulfillment transitions', () => {
    expect(() => assertOrderStatusTransition(OrderStatus.PAID, OrderStatus.PROCESSING)).not.toThrow();
    expect(() => assertOrderStatusTransition(OrderStatus.SHIPPED, OrderStatus.COMPLETED)).not.toThrow();
  });

  it('rejects unsupported fulfillment transitions', () => {
    expect(() => assertOrderStatusTransition(OrderStatus.CANCELLED, OrderStatus.SHIPPED)).toThrow(ApiError);
    expect(() => assertOrderStatusTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.SHIPPED)).toThrow(
      'Order cannot move from PENDING_PAYMENT to SHIPPED.',
    );
  });
});
