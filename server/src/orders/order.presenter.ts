import type { Order, OrderItem, OrderRequest } from '@prisma/client';

import { minorToAmount } from '../common/money.js';

type OrderWithItems = Order & { items: OrderItem[]; requests?: OrderRequest[] };

export function presentOrder(order: OrderWithItems) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: minorToAmount(order.subtotalMinor),
    shipping: minorToAmount(order.shippingMinor),
    total: minorToAmount(order.totalMinor),
    shippingAddress: {
      name: order.shippingName,
      phone: order.shippingPhone,
      line1: order.shippingLine1,
      line2: order.shippingLine2 ?? '',
      city: order.shippingCity,
      region: order.shippingRegion,
      postal: order.shippingPostal,
      country: order.shippingCountry,
    },
    customerNote: order.customerNote ?? '',
    createdAt: order.createdAt.toISOString(),
    requests: order.requests?.map(request => ({
      id: request.id,
      type: request.type,
      status: request.status,
      reason: request.reason,
      adminNote: request.adminNote ?? '',
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
    })) ?? [],
    items: order.items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      unitPrice: minorToAmount(item.unitPriceMinor),
      quantity: item.quantity,
      lineTotal: minorToAmount(item.lineTotalMinor),
    })),
  };
}
