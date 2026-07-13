import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, WholesaleAccountStatus, WholesaleApplicationStatus, WholesaleOrderStatus, WholesalePaymentStatus } from '@prisma/client';
import { ApiError } from '../common/api-error.js';
import { minorToAmount } from '../common/money.js';
import { PrismaService } from '../database/prisma.service.js';
import { AdminActivityService } from './admin-activity.service.js';
import type { CreateWholesaleOrderDto, ReviewWholesaleApplicationDto, UpdateWholesaleOrderDto, UpsertWholesaleAccountDto, WholesaleListQueryDto } from './dto/admin-wholesale.dto.js';

@Injectable()
export class AdminWholesaleService {
  constructor(private readonly prisma: PrismaService, private readonly activity: AdminActivityService) {}

  async dashboard() {
    const now = new Date();
    const [activeAccounts, openOrders, unpaidOrders, overdueOrders, totals] = await this.prisma.$transaction([
      this.prisma.wholesaleAccount.count({ where: { status: WholesaleAccountStatus.ACTIVE } }),
      this.prisma.wholesaleOrder.count({ where: { status: { notIn: [WholesaleOrderStatus.COMPLETED, WholesaleOrderStatus.CANCELLED] } } }),
      this.prisma.wholesaleOrder.count({ where: { paymentStatus: { in: [WholesalePaymentStatus.UNPAID, WholesalePaymentStatus.PARTIALLY_PAID] } } }),
      this.prisma.wholesaleOrder.count({ where: { paymentDueAt: { lt: now }, paymentStatus: { in: [WholesalePaymentStatus.UNPAID, WholesalePaymentStatus.PARTIALLY_PAID] } } }),
      this.prisma.wholesaleOrder.aggregate({ _sum: { totalMinor: true }, where: { status: { not: WholesaleOrderStatus.CANCELLED } } }),
    ]);
    return { dashboard: { activeAccounts, openOrders, unpaidOrders, overdueOrders, totalOrderValue: minorToAmount(totals._sum.totalMinor ?? 0), totalOrderValueMinor: totals._sum.totalMinor ?? 0 } };
  }

  async applications(query: WholesaleListQueryDto) {
    const where: Prisma.WholesaleApplicationWhereInput = query.search?.trim() ? { OR: [
      { companyName: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
      { contactName: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
      { user: { email: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } } },
    ] } : {};
    const [total, applications] = await this.prisma.$transaction([
      this.prisma.wholesaleApplication.count({ where }),
      this.prisma.wholesaleApplication.findMany({ where, include: { user: { select: { email: true } } }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    return { applications: applications.map(application => ({ ...application, email: application.user.email, estimatedMonthlySpend: minorToAmount(application.estimatedMonthlySpendMinor), user: undefined })), pagination: this.pagination(query, total) };
  }

  async reviewApplication(adminId: string, applicationId: string, dto: ReviewWholesaleApplicationDto) {
    const application = await this.prisma.wholesaleApplication.findUnique({ where: { id: applicationId }, include: { user: true } });
    if (!application) throw new ApiError(HttpStatus.NOT_FOUND, 'WHOLESALE_APPLICATION_NOT_FOUND', 'Wholesale application was not found.');
    if (application.status !== WholesaleApplicationStatus.PENDING) throw new ApiError(HttpStatus.CONFLICT, 'WHOLESALE_APPLICATION_REVIEWED', 'This wholesale application was already reviewed.');
    if (dto.decision === 'reject') {
      const updated = await this.prisma.wholesaleApplication.update({ where: { id: applicationId }, data: { status: WholesaleApplicationStatus.REJECTED, adminNote: dto.adminNote?.trim() || null, reviewedById: adminId, reviewedAt: new Date() } });
      await this.activity.record({ adminId, action: 'wholesale.application_rejected', entityType: 'wholesale_application', entityId: applicationId, description: `Rejected wholesale application for ${application.companyName}` });
      return { application: updated };
    }
    const result = await this.prisma.$transaction(async tx => {
      const account = await tx.wholesaleAccount.create({ data: { companyName: application.companyName, contactName: application.contactName, email: application.user.email, phone: application.phone, taxId: application.taxId, billingAddress: application.billingAddress, shippingAddress: application.shippingAddress, priceTier: dto.priceTier?.trim().toUpperCase() || 'STANDARD', discountPercent: dto.discountPercent ?? 0, paymentTermDays: dto.paymentTermDays ?? 0, creditLimitMinor: dto.creditLimitMinor ?? 0, minimumOrderMinor: dto.minimumOrderMinor ?? 0, notes: dto.adminNote?.trim() || application.message, createdById: adminId, updatedById: adminId } });
      await tx.wholesaleAccountMember.create({ data: { accountId: account.id, userId: application.userId } });
      const updated = await tx.wholesaleApplication.update({ where: { id: applicationId }, data: { status: WholesaleApplicationStatus.APPROVED, adminNote: dto.adminNote?.trim() || null, reviewedById: adminId, reviewedAt: new Date(), accountId: account.id } });
      return { account, application: updated };
    });
    await this.activity.record({ adminId, action: 'wholesale.application_approved', entityType: 'wholesale_application', entityId: applicationId, description: `Approved wholesale application for ${application.companyName}`, metadata: { accountId: result.account.id, discountPercent: result.account.discountPercent } });
    return result;
  }

  async accounts(query: WholesaleListQueryDto) {
    const where: Prisma.WholesaleAccountWhereInput = query.search?.trim() ? {
      OR: [
        { companyName: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
        { contactName: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
        { email: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
      ],
    } : {};
    const [total, accounts] = await this.prisma.$transaction([
      this.prisma.wholesaleAccount.count({ where }),
      this.prisma.wholesaleAccount.findMany({ where, include: { _count: { select: { orders: true } }, orders: { select: { totalMinor: true, paymentStatus: true } } }, orderBy: { updatedAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    return { accounts: accounts.map(account => ({ ...account, creditLimit: minorToAmount(account.creditLimitMinor), minimumOrder: minorToAmount(account.minimumOrderMinor), orderCount: account._count.orders, outstanding: minorToAmount(account.orders.filter(order => order.paymentStatus !== WholesalePaymentStatus.PAID && order.paymentStatus !== WholesalePaymentStatus.VOID).reduce((sum, order) => sum + order.totalMinor, 0)), _count: undefined, orders: undefined })), pagination: this.pagination(query, total) };
  }

  async createAccount(adminId: string, dto: UpsertWholesaleAccountDto) {
    const account = await this.prisma.wholesaleAccount.create({ data: { ...this.accountData(dto), createdById: adminId, updatedById: adminId } });
    await this.activity.record({ adminId, action: 'wholesale.account_created', entityType: 'wholesale_account', entityId: account.id, description: `Created wholesale account ${account.companyName}` });
    return { account };
  }

  async updateAccount(adminId: string, accountId: string, dto: UpsertWholesaleAccountDto) {
    const existing = await this.prisma.wholesaleAccount.findUnique({ where: { id: accountId } });
    if (!existing) throw new ApiError(HttpStatus.NOT_FOUND, 'WHOLESALE_ACCOUNT_NOT_FOUND', 'Wholesale account was not found.');
    const account = await this.prisma.wholesaleAccount.update({ where: { id: accountId }, data: { ...this.accountData(dto), updatedById: adminId } });
    await this.activity.record({ adminId, action: 'wholesale.account_updated', entityType: 'wholesale_account', entityId: account.id, description: `Updated wholesale account ${account.companyName}` });
    return { account };
  }

  async orders(query: WholesaleListQueryDto) {
    const where: Prisma.WholesaleOrderWhereInput = query.search?.trim() ? { OR: [
      { orderNumber: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
      { purchaseOrderNumber: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } },
      { account: { companyName: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } } },
    ] } : {};
    const [total, orders] = await this.prisma.$transaction([
      this.prisma.wholesaleOrder.count({ where }),
      this.prisma.wholesaleOrder.findMany({ where, include: { account: true, items: true }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    ]);
    return { orders: orders.map(order => this.presentOrder(order)), pagination: this.pagination(query, total) };
  }

  async createOrder(adminId: string, dto: CreateWholesaleOrderDto) {
    const account = await this.prisma.wholesaleAccount.findUnique({ where: { id: dto.accountId } });
    if (!account) throw new ApiError(HttpStatus.NOT_FOUND, 'WHOLESALE_ACCOUNT_NOT_FOUND', 'Wholesale account was not found.');
    if (account.status !== WholesaleAccountStatus.ACTIVE) throw new ApiError(HttpStatus.CONFLICT, 'WHOLESALE_ACCOUNT_INACTIVE', 'Only active wholesale accounts can receive new orders.');
    const productIds = [...new Set(dto.items.map(item => item.productId))];
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, active: true }, select: { id: true, name: true, sku: true } });
    if (products.length !== productIds.length) throw new ApiError(HttpStatus.BAD_REQUEST, 'WHOLESALE_PRODUCT_INVALID', 'One or more products are unavailable.');
    const byId = new Map(products.map(product => [product.id, product]));
    const subtotalMinor = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPriceMinor, 0);
    if (subtotalMinor < account.minimumOrderMinor) throw new ApiError(HttpStatus.BAD_REQUEST, 'WHOLESALE_MINIMUM_NOT_MET', `Order must meet the account minimum of ${minorToAmount(account.minimumOrderMinor)}.`);
    if (dto.discountMinor > subtotalMinor) throw new ApiError(HttpStatus.BAD_REQUEST, 'WHOLESALE_DISCOUNT_INVALID', 'Discount cannot exceed the subtotal.');
    const now = new Date();
    const paymentDueAt = account.paymentTermDays > 0 ? new Date(now.getTime() + account.paymentTermDays * 86400000) : now;
    const orderNumber = `WS-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const order = await this.prisma.wholesaleOrder.create({ data: {
      orderNumber, accountId: account.id, purchaseOrderNumber: dto.purchaseOrderNumber?.trim() || null, paymentTermDays: account.paymentTermDays, paymentDueAt,
      subtotalMinor, discountMinor: dto.discountMinor, totalMinor: subtotalMinor - dto.discountMinor, notes: dto.notes?.trim() || null, createdById: adminId, updatedById: adminId,
      items: { create: dto.items.map(item => { const product = byId.get(item.productId)!; return { productId: product.id, productName: product.name, productSku: product.sku, quantity: item.quantity, unitPriceMinor: item.unitPriceMinor, lineTotalMinor: item.quantity * item.unitPriceMinor }; }) },
    }, include: { account: true, items: true } });
    await this.activity.record({ adminId, action: 'wholesale.order_created', entityType: 'wholesale_order', entityId: order.id, description: `Created wholesale order ${order.orderNumber}` });
    return { order: this.presentOrder(order) };
  }

  async updateOrder(adminId: string, orderId: string, dto: UpdateWholesaleOrderDto) {
    const existing = await this.prisma.wholesaleOrder.findUnique({ where: { id: orderId } });
    if (!existing) throw new ApiError(HttpStatus.NOT_FOUND, 'WHOLESALE_ORDER_NOT_FOUND', 'Wholesale order was not found.');
    const order = await this.prisma.wholesaleOrder.update({ where: { id: orderId }, data: { status: dto.status, paymentStatus: dto.paymentStatus, updatedById: adminId }, include: { account: true, items: true } });
    await this.activity.record({ adminId, action: 'wholesale.order_updated', entityType: 'wholesale_order', entityId: order.id, description: `Updated wholesale order ${order.orderNumber}`, metadata: { status: dto.status, paymentStatus: dto.paymentStatus } });
    return { order: this.presentOrder(order) };
  }

  private accountData(dto: UpsertWholesaleAccountDto) { return { ...dto, companyName: dto.companyName.trim(), contactName: dto.contactName.trim(), email: dto.email.trim().toLowerCase(), phone: dto.phone.trim(), taxId: dto.taxId?.trim() || null, billingAddress: dto.billingAddress.trim(), shippingAddress: dto.shippingAddress.trim(), priceTier: dto.priceTier.trim().toUpperCase(), notes: dto.notes?.trim() || null }; }
  private pagination(query: WholesaleListQueryDto, total: number) { return { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) }; }
  private presentOrder(order: any) { return { ...order, subtotal: minorToAmount(order.subtotalMinor), discount: minorToAmount(order.discountMinor), total: minorToAmount(order.totalMinor), itemCount: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0), items: order.items.map((item: any) => ({ ...item, unitPrice: minorToAmount(item.unitPriceMinor), lineTotal: minorToAmount(item.lineTotalMinor) })) }; }
}
