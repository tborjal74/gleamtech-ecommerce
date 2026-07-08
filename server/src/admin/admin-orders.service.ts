import { OrderRequestStatus, OrderRequestType, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiError } from '../common/api-error.js';
import { minorToAmount } from '../common/money.js';
import { PrismaService } from '../database/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { AdminActivityService } from './admin-activity.service.js';
import type { AdminOrderListQueryDto } from './dto/admin-order-list-query.dto.js';
import { allowedOrderStatusTransitions, assertOrderStatusTransition } from './order-status-transitions.js';

type AdminOrderSummary = Prisma.OrderGetPayload<{ include: { user: true; items: true } }>;
type AdminOrderDetail = Prisma.OrderGetPayload<{
  include: {
    user: true;
    items: { include: { product: { select: { image: true } } } };
    requests: true;
    statusHistory: { include: { changedBy: true }; orderBy: { createdAt: 'desc' } };
  };
}>;

function presentOrderSummary(order: AdminOrderSummary) {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    customerName: `${order.user.firstName} ${order.user.lastName}`,
    customerEmail: order.user.email,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: order.subtotalMinor,
    shippingCents: order.shippingMinor,
    totalCents: order.totalMinor,
    subtotal: minorToAmount(order.subtotalMinor),
    shipping: minorToAmount(order.shippingMinor),
    total: minorToAmount(order.totalMinor),
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    paidConfirmationEmailSentAt: order.paidConfirmationEmailSentAt?.toISOString() ?? null,
    paidConfirmationEmailLastError: order.paidConfirmationEmailLastError,
  };
}

function presentOrderDetail(order: AdminOrderDetail) {
  return {
    ...presentOrderSummary(order),
    paymentReference: null,
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
    customer: {
      id: order.user.id,
      firstName: order.user.firstName,
      lastName: order.user.lastName,
      email: order.user.email,
      role: order.user.role,
    },
    items: order.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSku: item.productSku,
      unitPriceCents: item.unitPriceMinor,
      unitPrice: minorToAmount(item.unitPriceMinor),
      quantity: item.quantity,
      lineTotalCents: item.lineTotalMinor,
      lineTotal: minorToAmount(item.lineTotalMinor),
      image: item.product.image,
    })),
    customerNote: order.customerNote ?? '',
    requests: order.requests.map(request => ({
      id: request.id,
      type: request.type,
      status: request.status,
      reason: request.reason,
      adminNote: request.adminNote ?? '',
      createdAt: request.createdAt.toISOString(),
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
    })),
    statusHistory: order.statusHistory.map(history => ({
      id: history.id,
      previousStatus: history.previousStatus,
      newStatus: history.newStatus,
      createdAt: history.createdAt.toISOString(),
      changedBy: history.changedBy
        ? {
            id: history.changedBy.id,
            email: history.changedBy.email,
            name: `${history.changedBy.firstName} ${history.changedBy.lastName}`,
          }
        : null,
    })),
    allowedNextStatuses: allowedOrderStatusTransitions[order.status],
  };
}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly activity: AdminActivityService,
  ) {}

  async list(query: AdminOrderListQueryDto) {
    const where: Prisma.OrderWhereInput = {};
    if (query.orderStatus) where.status = query.orderStatus;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { user: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { user: { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { user: { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const orderBy =
      query.sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : query.sort === 'highestTotal'
          ? { totalMinor: 'desc' as const }
          : query.sort === 'lowestTotal'
            ? { totalMinor: 'asc' as const }
            : { createdAt: 'desc' as const };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { user: true, items: true },
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      orders: orders.map(presentOrderSummary),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize),
      },
    };
  }

  async get(orderId: string) {
    return { order: presentOrderDetail(await this.findOrder(orderId)) };
  }

  async updateStatus(adminId: string, orderId: string, nextStatus: OrderStatus) {
    const order = await this.findOrder(orderId);
    assertOrderStatusTransition(order.status, nextStatus);

    const updated = await this.prisma.$transaction(async tx => {
      await tx.order.update({ where: { id: orderId }, data: { status: nextStatus } });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          changedById: adminId,
          previousStatus: order.status,
          newStatus: nextStatus,
        },
      });
      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: this.detailInclude(),
      });
    });

    await this.activity.record({
      adminId,
      action: 'order.status_updated',
      entityType: 'order',
      entityId: orderId,
      description: `Changed order ${updated.orderNumber} status to ${nextStatus}`,
      metadata: { previousStatus: order.status, nextStatus },
    });
    return { order: presentOrderDetail(updated) };
  }

  async updatePaymentStatus(adminId: string, orderId: string, nextPaymentStatus: PaymentStatus) {
    if (nextPaymentStatus !== PaymentStatus.PAID) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PAYMENT_STATUS_RESTRICTED', 'Only PAID payment confirmation is supported.');
    }

    const order = await this.findOrder(orderId);
    const updated = await this.prisma.$transaction(async tx => {
      const nextOrderStatus = order.status === OrderStatus.PENDING_PAYMENT ? OrderStatus.PAID : order.status;
      const paidAt = order.paidAt ?? new Date();
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: nextOrderStatus,
          paidAt,
          paidConfirmationEmailLastError: null,
        },
      });
      if (nextOrderStatus !== order.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            changedById: adminId,
            previousStatus: order.status,
            newStatus: nextOrderStatus,
          },
        });
      }
      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: this.detailInclude(),
      });
    });

    if (!updated.paidConfirmationEmailSentAt) {
      try {
        await this.emailService.sendPaymentConfirmationEmail(updated);
        const emailed = await this.prisma.order.update({
          where: { id: orderId },
          data: {
            paidConfirmationEmailSentAt: new Date(),
            paidConfirmationEmailLastError: null,
          },
          include: this.detailInclude(),
        });
        await this.activity.record({
          adminId,
          action: 'order.payment_marked_paid',
          entityType: 'order',
          entityId: orderId,
          description: `Marked order ${updated.orderNumber} as paid`,
          metadata: { emailSent: true },
        });
        return { order: presentOrderDetail(emailed), emailSent: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Payment confirmation email failed.';
        await this.prisma.order.update({
          where: { id: orderId },
          data: { paidConfirmationEmailLastError: message.slice(0, 1000) },
        });
        throw new ApiError(
          HttpStatus.BAD_GATEWAY,
          'PAYMENT_CONFIRMATION_EMAIL_FAILED',
          'Order was marked paid, but the payment confirmation email could not be sent. Try again from the order details.',
        );
      }
    }

    await this.activity.record({
      adminId,
      action: 'order.payment_marked_paid',
      entityType: 'order',
      entityId: orderId,
      description: `Marked order ${updated.orderNumber} as paid`,
      metadata: { emailSent: false },
    });
    return { order: presentOrderDetail(updated), emailSent: false };
  }

  async reviewRequest(adminId: string, orderId: string, requestId: string, status: OrderRequestStatus, adminNote?: string) {
    const request = await this.prisma.orderRequest.findFirst({
      where: { id: requestId, orderId },
      include: { order: { include: { items: true } } },
    });
    if (!request) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_REQUEST_NOT_FOUND', 'Order request was not found.');
    }
    if (request.status !== OrderRequestStatus.PENDING) {
      throw new ApiError(HttpStatus.CONFLICT, 'ORDER_REQUEST_NOT_ALLOWED', 'This order request was already reviewed.');
    }

    await this.prisma.$transaction(async tx => {
      await tx.orderRequest.update({
        where: { id: requestId },
        data: { status, adminNote: adminNote?.trim() || null, reviewedById: adminId, reviewedAt: new Date() },
      });
      if (status === OrderRequestStatus.APPROVED && request.type === OrderRequestType.CANCELLATION) {
        for (const item of request.order.items) {
          await tx.inventory.upsert({
            where: { productId: item.productId },
            update: { stockQuantity: { increment: item.quantity } },
            create: { productId: item.productId, stockQuantity: item.quantity },
          });
        }
        await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
      }
      if (status === OrderRequestStatus.APPROVED && request.type === OrderRequestType.RETURN_REFUND) {
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.REFUNDED } });
      }
    });

    await this.activity.record({
      adminId,
      action: 'order.request_reviewed',
      entityType: 'order',
      entityId: orderId,
      description: `Reviewed ${request.type} request as ${status}`,
      metadata: { requestId, requestType: request.type, status },
    });
    return this.get(orderId);
  }

  private async findOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.detailInclude(),
    });
    if (!order) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Order was not found.');
    }
    return order;
  }

  private detailInclude() {
    return {
      user: true,
      items: { include: { product: { select: { image: true } } } },
      requests: { orderBy: { createdAt: 'desc' as const } },
      statusHistory: { include: { changedBy: true }, orderBy: { createdAt: 'desc' as const } },
    };
  }
}
