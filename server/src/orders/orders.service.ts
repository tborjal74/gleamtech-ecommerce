import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderRequestType, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

import { ApiError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { CheckoutDto } from './dto/checkout.dto.js';
import type { CustomerOrderListQueryDto } from './dto/customer-order-list-query.dto.js';
import { presentOrder } from './order.presenter.js';
import { calculateDiscountMinor } from './checkout-pricing.js';
import type { PaymentSubmissionDto } from '../payments/dto/payment-submission.dto.js';
import type { PaymentProofFile } from '../payments/payment-proof.util.js';

type OrderNumberRow = { nextValue: number };

const CHECKOUT_MAX_ATTEMPTS = 3;
const ORDER_SEQUENCE_KEY = 'GT';
const ORDER_RANDOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const customerOrderInclude = {
  items: true,
  requests: true,
  paymentSubmission: {
    select: {
      method: true,
      reference: true,
      proofMimeType: true,
      proofSizeBytes: true,
      submittedAt: true,
    },
  },
} as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const existing = await this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: dto.idempotencyKey } },
      include: customerOrderInclude,
    });
    if (existing) {
      return { order: presentOrder(existing), payment: this.paymentsService.pendingPayment(existing) };
    }

    for (let attempt = 1; attempt <= CHECKOUT_MAX_ATTEMPTS; attempt += 1) {
      try {
        const order = await this.prisma.$transaction(
        async tx => {
          const cart = await tx.cart.findUnique({
            where: { userId },
            include: {
              items: {
                include: {
                  product: { include: { inventory: true } },
                },
              },
            },
          });

          if (!cart || cart.items.length === 0) {
            throw new ApiError(HttpStatus.CONFLICT, 'EMPTY_CART', 'Cannot checkout an empty cart.');
          }

          let subtotalMinor = 0;
          for (const item of cart.items) {
            const availableQuantity = item.product.inventory?.stockQuantity ?? 0;
            if (!item.product.active || !item.product.isPublished) {
              throw new ApiError(HttpStatus.CONFLICT, 'PRODUCT_UNAVAILABLE', 'Product is unavailable.', {
                productId: item.productId,
              });
            }
            if (item.quantity > availableQuantity) {
              throw new ApiError(
                HttpStatus.CONFLICT,
                'INSUFFICIENT_STOCK',
                'Requested quantity exceeds available stock.',
                { productId: item.productId, availableQuantity },
              );
            }
            subtotalMinor += item.product.priceMinor * item.quantity;
          }

          const promoCode = dto.promoCode?.trim().toUpperCase() || null;
          const now = new Date();
          const promo = promoCode
            ? await tx.promoCode.findFirst({
                where: {
                  code: promoCode,
                  active: true,
                  AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
                  ],
                },
              })
            : null;
          if (promoCode && !promo) {
            throw new ApiError(HttpStatus.CONFLICT, 'PROMO_INVALID', 'Promo code is invalid or expired.');
          }
          const discountMinor = promo ? calculateDiscountMinor(subtotalMinor, promo.percentOff) : 0;

          for (const item of cart.items) {
            await this.inventoryService.decrementOrThrow(
              tx,
              item.productId,
              item.quantity,
              item.product.inventory?.stockQuantity ?? 0,
            );
          }

          const shippingMinor = 0;
          const totalMinor = subtotalMinor - discountMinor;
          const created = await tx.order.create({
            data: {
              userId,
              orderNumber: await this.nextOrderNumber(tx),
              idempotencyKey: dto.idempotencyKey,
              paymentMethod: dto.paymentMethod,
              subtotalMinor,
              discountMinor,
              promoCode: promo?.code ?? null,
              promoPercentOff: promo?.percentOff ?? null,
              shippingMinor,
              totalMinor,
              shippingName: dto.shippingName.trim(),
              shippingPhone: dto.shippingPhone.trim(),
              shippingLine1: dto.shippingLine1.trim(),
              shippingLine2: dto.shippingLine2.trim() || null,
              shippingCity: dto.shippingCity.trim(),
              shippingRegion: dto.shippingRegion.trim(),
              shippingPostal: dto.shippingPostal.trim(),
              shippingCountry: dto.shippingCountry.trim().toUpperCase(),
              customerNote: dto.customerNote?.trim() || null,
              items: {
                create: cart.items.map(item => ({
                  productId: item.productId,
                  productName: item.product.name,
                  productSku: item.product.sku,
                  unitPriceMinor: item.product.priceMinor,
                  quantity: item.quantity,
                  lineTotalMinor: item.product.priceMinor * item.quantity,
                })),
              },
            },
            include: customerOrderInclude,
          });

          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

        return { order: presentOrder(order), payment: this.paymentsService.pendingPayment(order) };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const duplicate = await this.prisma.order.findUnique({
            where: { userId_idempotencyKey: { userId, idempotencyKey: dto.idempotencyKey } },
            include: customerOrderInclude,
          });
          if (duplicate) {
            return {
              order: presentOrder(duplicate),
              payment: this.paymentsService.pendingPayment(duplicate),
            };
          }
        }
        if (this.isRetryableCheckoutError(error) && attempt < CHECKOUT_MAX_ATTEMPTS) {
          continue;
        }
        throw error;
      }
    }

    throw new ApiError(HttpStatus.CONFLICT, 'CHECKOUT_RETRY_EXHAUSTED', 'Checkout could not be completed. Please try again.');
  }

  submitPayment(userId: string, orderId: string, dto: PaymentSubmissionDto, file?: PaymentProofFile) {
    return this.paymentsService.submit(userId, orderId, dto, file);
  }

  async listOrders(userId: string, query: CustomerOrderListQueryDto) {
    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId },
        include: customerOrderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      orders: orders.map(presentOrder),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(Math.ceil(total / query.pageSize), 1),
      },
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: customerOrderInclude,
    });

    if (!order) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Order was not found.');
    }

    return { order: presentOrder(order) };
  }

  async cancelOrder(userId: string, orderId: string) {
    const cancelled = await this.prisma.$transaction(async tx => {
      const claimed = await tx.order.updateMany({
        where: {
          id: orderId,
          userId,
          status: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID] },
        },
        data: { status: OrderStatus.CANCELLED },
      });
      if (claimed.count !== 1) {
        const exists = await tx.order.findFirst({ where: { id: orderId, userId }, select: { id: true } });
        if (!exists) throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Order was not found.');
        throw new ApiError(HttpStatus.CONFLICT, 'ORDER_CANCELLATION_NOT_ALLOWED', 'This order is already being processed or cancelled.');
      }
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: customerOrderInclude,
      });
      for (const item of order.items) {
        await tx.inventory.upsert({
          where: { productId: item.productId },
          update: { stockQuantity: { increment: item.quantity } },
          create: { productId: item.productId, stockQuantity: item.quantity },
        });
      }
      return order;
    });

    return { order: presentOrder(cancelled) };
  }

  async reorder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: customerOrderInclude,
    });
    if (!order) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Order was not found.');
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: true },
    });
    const skipped: string[] = [];
    let added = 0;

    for (const item of order.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId }, include: { inventory: true } });
      const available = product?.inventory?.stockQuantity ?? 0;
      if (!product?.active || !product.isPublished || available < item.quantity) {
        skipped.push(item.productName);
        continue;
      }
      const existing = cart.items.find(cartItem => cartItem.productId === item.productId);
      const nextQuantity = (existing?.quantity ?? 0) + item.quantity;
      if (nextQuantity > available) {
        skipped.push(item.productName);
        continue;
      }
      await this.prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
        update: { quantity: nextQuantity },
        create: { cartId: cart.id, productId: item.productId, quantity: item.quantity, size: 'Standard' },
      });
      added += 1;
    }

    return { added, skipped };
  }

  async receipt(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: customerOrderInclude,
    });
    if (!order) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Order was not found.');
    }
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new ApiError(HttpStatus.CONFLICT, 'PAYMENT_STATUS_RESTRICTED', 'Receipt is available after payment is confirmed.');
    }
    return { receipt: presentOrder(order) };
  }

  async requestCancellation(userId: string, orderId: string, reason: string) {
    const order = await this.findUserOrder(userId, orderId);
    if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PAID) {
      throw new ApiError(HttpStatus.CONFLICT, 'ORDER_REQUEST_NOT_ALLOWED', 'Cancellation can only be requested before processing starts.');
    }
    return this.createOrderRequest(userId, orderId, OrderRequestType.CANCELLATION, reason);
  }

  async requestReturnRefund(userId: string, orderId: string, reason: string) {
    const order = await this.findUserOrder(userId, orderId);
    if (order.paymentStatus !== PaymentStatus.PAID || (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.COMPLETED)) {
      throw new ApiError(HttpStatus.CONFLICT, 'ORDER_REQUEST_NOT_ALLOWED', 'Return or refund requests are available after a paid order is shipped or completed.');
    }
    return this.createOrderRequest(userId, orderId, OrderRequestType.RETURN_REFUND, reason);
  }

  async invoicePdf(userId: string, orderId: string) {
    const order = await this.findUserOrder(userId, orderId);
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new ApiError(HttpStatus.CONFLICT, 'PAYMENT_STATUS_RESTRICTED', 'Invoice is available after payment is confirmed.');
    }
    return makeSimpleInvoicePdf(order);
  }

  private async findUserOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: customerOrderInclude,
    });
    if (!order) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Order was not found.');
    }
    return order;
  }

  private async createOrderRequest(userId: string, orderId: string, type: OrderRequestType, reason: string) {
    const existing = await this.prisma.orderRequest.findFirst({
      where: { userId, orderId, type, status: 'PENDING' },
    });
    if (existing) {
      throw new ApiError(HttpStatus.CONFLICT, 'ORDER_REQUEST_NOT_ALLOWED', 'A pending request already exists for this order.');
    }
    const request = await this.prisma.orderRequest.create({
      data: { userId, orderId, type, reason: reason.trim() },
    });
    return { request };
  }

  private async nextOrderNumber(tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<OrderNumberRow[]>`
      INSERT INTO "OrderSequence" ("key", "nextValue", "updatedAt")
      VALUES (${ORDER_SEQUENCE_KEY}, 1, NOW())
      ON CONFLICT ("key")
      DO UPDATE SET "nextValue" = "OrderSequence"."nextValue" + 1, "updatedAt" = NOW()
      RETURNING "nextValue"
    `;
    const nextValue = rows[0]?.nextValue;
    if (!nextValue) {
      throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'ORDER_NUMBER_FAILED', 'Could not allocate an order number.');
    }
    const suffix = String(nextValue).padStart(2, '0');
    return `${ORDER_SEQUENCE_KEY}-${this.randomOrderToken(6)}-${suffix}`;
  }

  private randomOrderToken(length: number) {
    const bytes = randomBytes(length);
    return Array.from(bytes, byte => ORDER_RANDOM_ALPHABET[byte % ORDER_RANDOM_ALPHABET.length]).join('');
  }

  private isRetryableCheckoutError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }
}

function makeSimpleInvoicePdf(order: Prisma.OrderGetPayload<{ include: { items: true } }>) {
  const lines = [
    'Gleamtech Invoice',
    `Order: ${order.orderNumber}`,
    `Date: ${order.createdAt.toISOString().slice(0, 10)}`,
    `Customer: ${order.shippingName}`,
    `Phone: ${order.shippingPhone}`,
    `Address: ${order.shippingLine1}, ${order.shippingCity}, ${order.shippingRegion}`,
    '',
    'Items:',
    ...order.items.map(item => `${item.productName} x ${item.quantity} - PHP ${minorToDisplay(item.lineTotalMinor)}`),
    '',
    `Subtotal: PHP ${minorToDisplay(order.subtotalMinor)}`,
    `Discount: PHP ${minorToDisplay(order.discountMinor)}`,
    `Shipping: PHP ${minorToDisplay(order.shippingMinor)}`,
    `Total Paid: PHP ${minorToDisplay(order.totalMinor)}`,
  ];
  const escapedLines = lines.map(line => line.replace(/[()\\]/g, match => `\\${match}`));
  const content = ['BT', '/F1 12 Tf', '50 760 Td', ...escapedLines.map((line, index) => `${index === 0 ? '' : '0 -18 Td'}(${line}) Tj`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function minorToDisplay(minor: number) {
  return (minor / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
