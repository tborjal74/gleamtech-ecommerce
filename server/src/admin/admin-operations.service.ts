import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';

import { ApiError } from '../common/api-error.js';
import { minorToAmount } from '../common/money.js';
import { PrismaService } from '../database/prisma.service.js';
import { ProductImageStorageService, type UploadedImageFile } from '../uploads/product-image-storage.service.js';
import type { UpsertPromoCodeDto } from './dto/admin-promo.dto.js';
import { AdminActivityService } from './admin-activity.service.js';
import type { AdminPageQueryDto, AdminReportQueryDto } from './dto/admin-shared-query.dto.js';
import type { UpdateHomepageContentDto } from './dto/homepage-content.dto.js';

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: AdminActivityService,
    private readonly imageStorage: ProductImageStorageService,
  ) {}

  async homepageContent() {
    const content = await this.prisma.homepageContent.upsert({
      where: { id: 'home' },
      update: {},
      create: { id: 'home' },
    });
    return { content: this.presentHomepageContent(content) };
  }

  async updateHomepageContent(adminId: string, dto: UpdateHomepageContentDto) {
    const content = await this.prisma.homepageContent.upsert({
      where: { id: 'home' },
      update: {
        ...dto,
        updatedById: adminId,
      },
      create: {
        id: 'home',
        ...dto,
        updatedById: adminId,
      },
    });
    await this.activity.record({
      adminId,
      action: 'homepage.updated',
      entityType: 'homepage',
      entityId: 'home',
      description: 'Updated homepage content',
      metadata: { headline: content.headline },
    });
    return { content: this.presentHomepageContent(content) };
  }

  async uploadHomepageImage(adminId: string, slot: string, file: UploadedImageFile) {
    const imageFields = new Set(['heroImage', 'subHeroImageLeft', 'subHeroImageRight']);
    if (!imageFields.has(slot)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Choose a valid homepage image slot.');
    }
    if (!file) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_IMAGE_INVALID', 'Upload a homepage image.');
    }

    const stored = await this.imageStorage.store(file);
    const content = await this.prisma.homepageContent.upsert({
      where: { id: 'home' },
      update: { [slot]: stored.url, updatedById: adminId },
      create: { id: 'home', [slot]: stored.url, updatedById: adminId },
    });
    await this.activity.record({
      adminId,
      action: 'homepage.image_uploaded',
      entityType: 'homepage',
      entityId: 'home',
      description: `Uploaded homepage image for ${slot}`,
      metadata: { slot, storageProvider: stored.storageProvider },
    });
    return { content: this.presentHomepageContent(content) };
  }

  async promos(query: AdminPageQueryDto) {
    const where: Prisma.PromoCodeWhereInput = {};
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }
    const [total, promos] = await this.prisma.$transaction([
      this.prisma.promoCode.count({ where }),
      this.prisma.promoCode.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { promos: promos.map(promo => this.presentPromo(promo)), pagination: this.pagination(query, total) };
  }

  async createPromo(adminId: string, dto: UpsertPromoCodeDto) {
    await this.assertPromoDateRange(dto);
    const promo = await this.prisma.promoCode.create({
      data: {
        ...this.promoData(dto),
        createdById: adminId,
        updatedById: adminId,
      },
    });
    await this.activity.record({
      adminId,
      action: 'promo.created',
      entityType: 'promo',
      entityId: promo.id,
      description: `Created promo ${promo.code}`,
      metadata: { percentOff: promo.percentOff },
    });
    return { promo: this.presentPromo(promo) };
  }

  async updatePromo(adminId: string, promoId: string, dto: UpsertPromoCodeDto) {
    await this.assertPromoDateRange(dto);
    const existing = await this.prisma.promoCode.findUnique({ where: { id: promoId } });
    if (!existing) throw new ApiError(HttpStatus.NOT_FOUND, 'PROMO_NOT_FOUND', 'Promo code was not found.');
    const promo = await this.prisma.promoCode.update({
      where: { id: promoId },
      data: {
        ...this.promoData(dto),
        updatedById: adminId,
      },
    });
    await this.activity.record({
      adminId,
      action: 'promo.updated',
      entityType: 'promo',
      entityId: promo.id,
      description: `Updated promo ${promo.code}`,
      metadata: { previousCode: existing.code, percentOff: promo.percentOff },
    });
    return { promo: this.presentPromo(promo) };
  }

  async deletePromo(adminId: string, promoId: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id: promoId } });
    if (!promo) throw new ApiError(HttpStatus.NOT_FOUND, 'PROMO_NOT_FOUND', 'Promo code was not found.');
    await this.prisma.promoCode.delete({ where: { id: promoId } });
    await this.activity.record({
      adminId,
      action: 'promo.deleted',
      entityType: 'promo',
      entityId: promoId,
      description: `Deleted promo ${promo.code}`,
      metadata: { code: promo.code },
    });
    return { ok: true };
  }

  async paymentQueue(query: AdminPageQueryDto) {
    const where: Prisma.OrderWhereInput = {
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.SUBMITTED] },
    };
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { user: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { user: { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { user: { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }
    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { user: true, items: true },
        orderBy: { createdAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      orders: orders.map(order => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        customerEmail: order.user.email,
        customerPhone: order.shippingPhone,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        total: minorToAmount(order.totalMinor),
        totalCents: order.totalMinor,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
      })),
      pagination: this.pagination(query, total),
    };
  }

  async customers(query: AdminPageQueryDto) {
    const where: Prisma.UserWhereInput = { role: UserRole.CUSTOMER };
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { orders: { some: { shippingPhone: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
      ];
    }

    const [total, customers] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: {
          orders: { select: { id: true, paymentStatus: true, totalMinor: true, createdAt: true, shippingPhone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      customers: customers.map(customer => {
        const paidOrders = customer.orders.filter(order => order.paymentStatus === PaymentStatus.PAID);
        const latestOrder = customer.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        return {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          active: customer.active,
          createdAt: customer.createdAt.toISOString(),
          updatedAt: customer.updatedAt.toISOString(),
          phone: latestOrder?.shippingPhone ?? '',
          totalOrders: customer.orders.length,
          paidOrders: paidOrders.length,
          paidSales: minorToAmount(paidOrders.reduce((sum, order) => sum + order.totalMinor, 0)),
          latestOrderAt: latestOrder?.createdAt.toISOString() ?? null,
        };
      }),
      pagination: this.pagination(query, total),
    };
  }

  async setCustomerActive(adminId: string, customerId: string, active: boolean) {
    const customer = await this.prisma.user.findFirst({ where: { id: customerId, role: UserRole.CUSTOMER } });
    if (!customer) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Customer account was not found.');
    }
    const updated = await this.prisma.user.update({ where: { id: customerId }, data: { active } });
    await this.activity.record({
      adminId,
      action: active ? 'customer.activated' : 'customer.deactivated',
      entityType: 'customer',
      entityId: customerId,
      description: `${active ? 'Activated' : 'Deactivated'} customer ${updated.email}`,
      metadata: { previousActive: customer.active, nextActive: active },
    });
    return { customer: { id: updated.id, email: updated.email, active: updated.active } };
  }

  async inventory(query: AdminPageQueryDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { sku: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }
    const [total, products, lowStockCount, outOfStockCount] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: { inventory: true, _count: { select: { orderItems: true } } },
        orderBy: { inventory: { stockQuantity: 'asc' } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.product.count({ where: { inventory: { stockQuantity: { lte: 5 } } } }),
      this.prisma.product.count({ where: { inventory: { stockQuantity: 0 } } }),
    ]);
    return {
      summary: { lowStockCount, outOfStockCount },
      products: products.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        image: product.image,
        stockQuantity: product.inventory?.stockQuantity ?? 0,
        active: product.active,
        isPublished: product.isPublished,
        price: minorToAmount(product.priceMinor),
        orderItemCount: product._count.orderItems,
        updatedAt: product.updatedAt.toISOString(),
      })),
      pagination: this.pagination(query, total),
    };
  }

  async updateInventory(adminId: string, productId: string, stockQuantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { inventory: true } });
    if (!product) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    await this.prisma.inventory.upsert({
      where: { productId },
      update: { stockQuantity },
      create: { productId, stockQuantity },
    });
    await this.activity.record({
      adminId,
      action: 'inventory.updated',
      entityType: 'product',
      entityId: productId,
      description: `Updated stock for ${product.name}`,
      metadata: { sku: product.sku, previousStock: product.inventory?.stockQuantity ?? 0, nextStock: stockQuantity },
    });
    return { ok: true };
  }

  async report(type: AdminReportQueryDto['type'], query: AdminReportQueryDto) {
    if (type === 'products') return this.productReport();
    if (type === 'customers') return this.customerReport();
    return this.orderReport(query);
  }

  private async orderReport(query: AdminReportQueryDto) {
    const where: Prisma.OrderWhereInput = {};
    if (query.from || query.to) {
      const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : null;
      if (to) to.setUTCDate(to.getUTCDate() + 1);
      where.createdAt = {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
        ...(to ? { lt: to } : {}),
      };
    }
    const orders = await this.prisma.order.findMany({ where, include: { user: true, items: true }, orderBy: { createdAt: 'desc' }, take: 5000 });
    return this.csv(
      ['Order Number', 'Created At', 'Customer', 'Email', 'Payment Status', 'Order Status', 'Items', 'Total'],
      orders.map(order => [
        order.orderNumber,
        order.createdAt.toISOString(),
        `${order.user.firstName} ${order.user.lastName}`,
        order.user.email,
        order.paymentStatus,
        order.status,
        String(order.items.reduce((sum, item) => sum + item.quantity, 0)),
        String(minorToAmount(order.totalMinor)),
      ]),
    );
  }

  private async productReport() {
    const products = await this.prisma.product.findMany({ include: { inventory: true }, orderBy: { updatedAt: 'desc' }, take: 5000 });
    return this.csv(
      ['SKU', 'Name', 'Price', 'Stock', 'Active', 'Published', 'Updated At'],
      products.map(product => [
        product.sku,
        product.name,
        String(minorToAmount(product.priceMinor)),
        String(product.inventory?.stockQuantity ?? 0),
        String(product.active),
        String(product.isPublished),
        product.updatedAt.toISOString(),
      ]),
    );
  }

  private async customerReport() {
    const customers = await this.prisma.user.findMany({ where: { role: UserRole.CUSTOMER }, include: { orders: true }, orderBy: { createdAt: 'desc' }, take: 5000 });
    return this.csv(
      ['Name', 'Email', 'Active', 'Created At', 'Orders', 'Paid Orders'],
      customers.map(customer => [
        `${customer.firstName} ${customer.lastName}`,
        customer.email,
        String(customer.active),
        customer.createdAt.toISOString(),
        String(customer.orders.length),
        String(customer.orders.filter(order => order.paymentStatus === PaymentStatus.PAID).length),
      ]),
    );
  }

  private presentHomepageContent(content: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    heroImage: string;
    subHeroImageLeft: string;
    subHeroImageRight: string;
    promoLabel: string;
    promoHeadline: string;
    promoText: string;
    promiseOneTitle: string;
    promiseOneText: string;
    promiseTwoTitle: string;
    promiseTwoText: string;
    updatedAt: Date;
  }) {
    return {
      eyebrow: content.eyebrow,
      headline: content.headline,
      subheadline: content.subheadline,
      primaryCta: content.primaryCta,
      secondaryCta: content.secondaryCta,
      heroImage: content.heroImage,
      subHeroImageLeft: content.subHeroImageLeft,
      subHeroImageRight: content.subHeroImageRight,
      promoLabel: content.promoLabel,
      promoHeadline: content.promoHeadline,
      promoText: content.promoText,
      promiseOneTitle: content.promiseOneTitle,
      promiseOneText: content.promiseOneText,
      promiseTwoTitle: content.promiseTwoTitle,
      promiseTwoText: content.promiseTwoText,
      updatedAt: content.updatedAt.toISOString(),
    };
  }

  private presentPromo(promo: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    percentOff: number;
    active: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: promo.id,
      code: promo.code,
      name: promo.name,
      description: promo.description ?? '',
      percentOff: promo.percentOff,
      active: promo.active,
      startsAt: promo.startsAt?.toISOString() ?? null,
      endsAt: promo.endsAt?.toISOString() ?? null,
      createdAt: promo.createdAt.toISOString(),
      updatedAt: promo.updatedAt.toISOString(),
    };
  }

  private promoData(dto: UpsertPromoCodeDto) {
    return {
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      percentOff: dto.percentOff,
      active: dto.active,
      startsAt: dto.startsAt ?? null,
      endsAt: dto.endsAt ?? null,
    };
  }

  private async assertPromoDateRange(dto: UpsertPromoCodeDto) {
    if (dto.startsAt && Number.isNaN(dto.startsAt.getTime())) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_PROMO_DATE', 'Promo start date is invalid.');
    }
    if (dto.endsAt && Number.isNaN(dto.endsAt.getTime())) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_PROMO_DATE', 'Promo end date is invalid.');
    }
    if (dto.startsAt && dto.endsAt && dto.startsAt > dto.endsAt) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_PROMO_DATE_RANGE', 'Promo start date must be before the end date.');
    }
  }

  private csv(headers: string[], rows: string[][]) {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    return [headers.map(escape).join(','), ...rows.map(row => row.map(escape).join(','))].join('\n');
  }

  private pagination(query: AdminPageQueryDto, total: number) {
    return { page: query.page, pageSize: query.pageSize, total, pageCount: Math.max(Math.ceil(total / query.pageSize), 1) };
  }
}
