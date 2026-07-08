import { Injectable } from '@nestjs/common';
import type { Order } from '@prisma/client';

@Injectable()
export class PaymentsService {
  pendingPayment(order: Pick<Order, 'id' | 'paymentStatus' | 'totalMinor'>) {
    return {
      status: order.paymentStatus,
      provider: 'manual',
      clientSecret: null,
      message: 'Payment provider integration is not configured yet.',
    };
  }
}
