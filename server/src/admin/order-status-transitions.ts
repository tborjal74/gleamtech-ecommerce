import { HttpStatus } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import { ApiError } from '../common/api-error.js';

export const allowedOrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.CANCELLED],
  READY_FOR_DELIVERY: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertOrderStatusTransition(previousStatus: OrderStatus, nextStatus: OrderStatus) {
  const allowed = allowedOrderStatusTransitions[previousStatus];
  if (!allowed.includes(nextStatus)) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      'INVALID_ORDER_STATUS_TRANSITION',
      `Order cannot move from ${previousStatus} to ${nextStatus}.`,
      { previousStatus, nextStatus, allowed },
    );
  }
}
