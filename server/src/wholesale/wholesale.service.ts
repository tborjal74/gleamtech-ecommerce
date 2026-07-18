import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { WholesaleAccountStatus, WholesaleApplicationStatus, WholesaleOrderStatus } from '@prisma/client';
import { ApiError } from '../common/api-error.js';
import { minorToAmount } from '../common/money.js';
import { canonicalProductImagePath } from '../common/product-assets.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateCustomerWholesaleOrderDto, SubmitWholesaleApplicationDto } from './dto/customer-wholesale.dto.js';

@Injectable()
export class WholesaleService {
  constructor(private readonly prisma: PrismaService) {}

  async portal(userId: string) {
    const [application, membership] = await Promise.all([
      this.prisma.wholesaleApplication.findUnique({ where: { userId } }),
      this.prisma.wholesaleAccountMember.findUnique({ where: { userId }, include: { account: true } }),
    ]);
    if (!membership) return { application, account: null, orders: [], products: [] };
    const account = membership.account;
    const [orders, products] = await Promise.all([
      this.prisma.wholesaleOrder.findMany({ where: { accountId: account.id }, include: { items: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.findMany({ where: { active: true, isPublished: true }, include: { inventory: true }, orderBy: { name: 'asc' } }),
    ]);
    return {
      application,
      account: { ...account, creditLimit: minorToAmount(account.creditLimitMinor), minimumOrder: minorToAmount(account.minimumOrderMinor) },
      orders: orders.map(order => ({ ...order, subtotal: minorToAmount(order.subtotalMinor), discount: minorToAmount(order.discountMinor), total: minorToAmount(order.totalMinor), itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0) })),
      products: products.map(product => {
        const wholesalePriceMinor = Math.round(product.priceMinor * (100 - account.discountPercent) / 100);
        return { id: product.id, sku: product.sku, name: product.name, image: canonicalProductImagePath(product.image), retailPrice: minorToAmount(product.priceMinor), wholesalePrice: minorToAmount(wholesalePriceMinor), wholesalePriceMinor, availableQuantity: product.inventory?.stockQuantity ?? 0 };
      }),
    };
  }

  async apply(userId: string, dto: SubmitWholesaleApplicationDto) {
    const membership = await this.prisma.wholesaleAccountMember.findUnique({ where: { userId } });
    if (membership) throw new ApiError(HttpStatus.CONFLICT, 'WHOLESALE_ALREADY_APPROVED', 'Your account already has wholesale access.');
    const existing = await this.prisma.wholesaleApplication.findUnique({ where: { userId } });
    if (existing?.status === WholesaleApplicationStatus.PENDING) throw new ApiError(HttpStatus.CONFLICT, 'WHOLESALE_APPLICATION_PENDING', 'Your wholesale application is already under review.');
    const data = { companyName: dto.companyName.trim(), contactName: dto.contactName.trim(), phone: dto.phone.trim(), taxId: dto.taxId?.trim() || null, billingAddress: dto.billingAddress.trim(), shippingAddress: dto.shippingAddress.trim(), businessType: dto.businessType.trim(), estimatedMonthlySpendMinor: dto.estimatedMonthlySpendMinor, message: dto.message?.trim() || null, status: WholesaleApplicationStatus.PENDING, adminNote: null, reviewedById: null, reviewedAt: null, accountId: null };
    const application = await this.prisma.wholesaleApplication.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return { application };
  }

  async createOrder(userId: string, dto: CreateCustomerWholesaleOrderDto) {
    const membership = await this.prisma.wholesaleAccountMember.findUnique({ where: { userId }, include: { account: true } });
    if (!membership || membership.account.status !== WholesaleAccountStatus.ACTIVE) throw new ApiError(HttpStatus.FORBIDDEN, 'WHOLESALE_ACCESS_REQUIRED', 'Approved active wholesale access is required.');
    const account = membership.account;
    const productIds = [...new Set(dto.items.map(item => item.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, active: true, isPublished: true }, include: { inventory: true } });
    if (products.length !== productIds.length) throw new ApiError(HttpStatus.BAD_REQUEST, 'WHOLESALE_PRODUCT_INVALID', 'One or more products are unavailable.');
    const byId = new Map(products.map(product => [product.id, product]));
    for (const item of dto.items) if ((byId.get(item.productId)?.inventory?.stockQuantity ?? 0) < item.quantity) throw new ApiError(HttpStatus.CONFLICT, 'INSUFFICIENT_STOCK', 'One or more wholesale quantities exceed available stock.');
    const items = dto.items.map(item => { const product = byId.get(item.productId)!; const unitPriceMinor = Math.round(product.priceMinor * (100 - account.discountPercent) / 100); return { productId: product.id, productName: product.name, productSku: product.sku, quantity: item.quantity, unitPriceMinor, lineTotalMinor: unitPriceMinor * item.quantity }; });
    const subtotalMinor = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
    if (subtotalMinor < account.minimumOrderMinor) throw new ApiError(HttpStatus.BAD_REQUEST, 'WHOLESALE_MINIMUM_NOT_MET', `Order must meet the account minimum of ${minorToAmount(account.minimumOrderMinor)}.`);
    const now = new Date();
    const paymentDueAt = account.paymentTermDays > 0 ? new Date(now.getTime() + account.paymentTermDays * 86400000) : now;
    const order = await this.prisma.wholesaleOrder.create({ data: { orderNumber: `WS-${now.toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,6).toUpperCase()}`, accountId: account.id, purchaseOrderNumber: dto.purchaseOrderNumber?.trim() || null, status: WholesaleOrderStatus.DRAFT, paymentTermDays: account.paymentTermDays, paymentDueAt, subtotalMinor, discountMinor: 0, totalMinor: subtotalMinor, notes: dto.notes?.trim() || null, createdById: userId, updatedById: userId, items: { create: items } }, include: { items: true } });
    return { order: { ...order, total: minorToAmount(order.totalMinor) } };
  }
}
