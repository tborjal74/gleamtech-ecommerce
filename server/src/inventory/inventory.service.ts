import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { ApiError } from '../common/api-error.js';

@Injectable()
export class InventoryService {
  async decrementOrThrow(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number,
    availableQuantity: number,
  ) {
    const updated = await tx.inventory.updateMany({
      where: {
        productId,
        stockQuantity: { gte: quantity },
      },
      data: {
        stockQuantity: { decrement: quantity },
      },
    });

    if (updated.count !== 1) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'INSUFFICIENT_STOCK',
        'Requested quantity exceeds available stock.',
        { productId, availableQuantity },
      );
    }
  }
}
