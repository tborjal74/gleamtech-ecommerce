import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';

import { ApiError } from '../common/api-error.js';
import { minorToAmount } from '../common/money.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AdminAnalyticsQueryDto, AnalyticsPreset } from './dto/admin-analytics-query.dto.js';

type ProductPerformanceRow = {
  productId: string;
  productName: string;
  productSku: string;
  quantitySold: bigint | number;
  orderCount: bigint | number;
  revenueMinor: bigint | number;
  currentPriceMinor: number | null;
  currentStock: number | null;
  active: boolean | null;
  isPublished: boolean | null;
  image: string | null;
};

type DailyRow = {
  day: Date;
  value: bigint | number | null;
};

const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(query: AdminAnalyticsQueryDto) {
    const range = this.dateRange(query);
    const dateWhere = { createdAt: { gte: range.from, lt: range.to } };
    const paidDateWhere = {
      paymentStatus: PaymentStatus.PAID,
      paidAt: { gte: range.from, lt: range.to },
    };

    const [
      paidAggregate,
      paidOrders,
      totalOrders,
      pendingPaymentOrders,
      cancelledOrders,
      refundedOrders,
      totalCustomers,
      newCustomers,
      deactivatedListings,
      unpublishedListings,
      lowStockProducts,
      productRows,
      salesRows,
      orderRows,
      orderStatusBreakdown,
      paymentStatusBreakdown,
      paidCustomerRows,
      repeatCustomerRows,
    ] = await Promise.all([
      this.prisma.order.aggregate({ where: paidDateWhere, _sum: { totalMinor: true }, _count: { _all: true } }),
      this.prisma.order.count({ where: paidDateWhere }),
      this.prisma.order.count({ where: dateWhere }),
      this.prisma.order.count({ where: { ...dateWhere, paymentStatus: PaymentStatus.PENDING } }),
      this.prisma.order.count({ where: { ...dateWhere, status: OrderStatus.CANCELLED } }),
      this.prisma.order.count({ where: { ...dateWhere, paymentStatus: PaymentStatus.REFUNDED } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER, createdAt: { gte: range.from, lt: range.to } } }),
      this.prisma.product.count({ where: { active: false } }),
      this.prisma.product.count({ where: { isPublished: false } }),
      this.prisma.product.findMany({
        where: { inventory: { stockQuantity: { lte: LOW_STOCK_THRESHOLD } } },
        select: { id: true, sku: true, name: true, image: true, active: true, isPublished: true, inventory: true },
        orderBy: { inventory: { stockQuantity: 'asc' } },
        take: 8,
      }),
      this.productPerformance(range.from, range.to),
      this.dailySales(range.from, range.to),
      this.dailyOrders(range.from, range.to),
      this.prisma.order.groupBy({ by: ['status'], where: dateWhere, _count: { _all: true } }),
      this.prisma.order.groupBy({ by: ['paymentStatus'], where: dateWhere, _count: { _all: true } }),
      this.prisma.order.groupBy({ by: ['userId'], where: paidDateWhere, _count: { _all: true } }),
      this.prisma.order.groupBy({ by: ['userId'], where: paidDateWhere, having: { id: { _count: { gt: 1 } } }, _count: { _all: true } }),
    ]);

    const totalPaidSalesMinor = paidAggregate._sum.totalMinor ?? 0;
    const performance = productRows.map(row => this.presentProductPerformance(row));
    const quantitySold = performance.reduce((sum, row) => sum + row.quantitySold, 0);
    const soldProductIds = new Set(performance.map(row => row.productId));
    const zeroSalesCount = await this.prisma.product.count({
      where: soldProductIds.size ? { id: { notIn: Array.from(soldProductIds) } } : {},
    });

    return {
      range: {
        preset: range.preset,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      summary: {
        totalPaidSalesCents: totalPaidSalesMinor,
        totalPaidSales: minorToAmount(totalPaidSalesMinor),
        totalPaidOrders: paidOrders,
        totalOrdersPlaced: totalOrders,
        averageOrderValueCents: paidOrders ? Math.round(totalPaidSalesMinor / paidOrders) : 0,
        averageOrderValue: paidOrders ? minorToAmount(Math.round(totalPaidSalesMinor / paidOrders)) : 0,
        pendingPaymentOrders,
        cancelledOrders,
        refundedOrders,
      },
      products: {
        mostOrderedProduct: [...performance].sort((a, b) => b.orderCount - a.orderCount)[0] ?? null,
        highestQuantityProduct: [...performance].sort((a, b) => b.quantitySold - a.quantitySold)[0] ?? null,
        leastOrderedProduct: [...performance].filter(row => row.orderCount > 0).sort((a, b) => a.orderCount - b.orderCount || a.quantitySold - b.quantitySold)[0] ?? null,
        totalQuantitySold: quantitySold,
        topByRevenue: [...performance].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 5),
        topByQuantity: [...performance].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5),
        performance,
        zeroSalesCount,
        lowStockProducts: lowStockProducts.map(product => ({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          image: product.image,
          currentStock: product.inventory?.stockQuantity ?? 0,
          active: product.active,
          isPublished: product.isPublished,
        })),
        deactivatedListings,
        unpublishedListings,
      },
      customers: {
        totalCustomerAccounts: totalCustomers,
        newCustomers,
        customersWithPaidOrders: paidCustomerRows.length,
        repeatCustomers: repeatCustomerRows.length,
        averageOrdersPerCustomer: totalCustomers ? totalOrders / totalCustomers : 0,
      },
      charts: {
        salesOverTime: this.fillDailySeries(range.from, range.to, salesRows, 'sales'),
        ordersOverTime: this.fillDailySeries(range.from, range.to, orderRows, 'orders'),
        orderStatusBreakdown: orderStatusBreakdown.map(row => ({ status: row.status, count: row._count._all })),
        paymentStatusBreakdown: paymentStatusBreakdown.map(row => ({ status: row.paymentStatus, count: row._count._all })),
      },
    };
  }

  private async productPerformance(from: Date, to: Date) {
    return this.prisma.$queryRaw<ProductPerformanceRow[]>`
      SELECT
        oi."productId" AS "productId",
        oi."productName" AS "productName",
        oi."productSku" AS "productSku",
        COALESCE(SUM(oi."quantity"), 0) AS "quantitySold",
        COUNT(DISTINCT oi."orderId") AS "orderCount",
        COALESCE(SUM(oi."lineTotalMinor"), 0) AS "revenueMinor",
        p."priceMinor" AS "currentPriceMinor",
        inv."stockQuantity" AS "currentStock",
        p."active" AS "active",
        p."isPublished" AS "isPublished",
        p."image" AS "image"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON o."id" = oi."orderId"
      LEFT JOIN "Product" p ON p."id" = oi."productId"
      LEFT JOIN "Inventory" inv ON inv."productId" = oi."productId"
      WHERE o."paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
        AND o."paidAt" >= ${from}
        AND o."paidAt" < ${to}
      GROUP BY oi."productId", oi."productName", oi."productSku", p."priceMinor", inv."stockQuantity", p."active", p."isPublished", p."image"
    `;
  }

  private async dailySales(from: Date, to: Date) {
    return this.prisma.$queryRaw<DailyRow[]>`
      SELECT DATE_TRUNC('day', o."paidAt") AS "day", COALESCE(SUM(o."totalMinor"), 0) AS "value"
      FROM "Order" o
      WHERE o."paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
        AND o."paidAt" >= ${from}
        AND o."paidAt" < ${to}
      GROUP BY DATE_TRUNC('day', o."paidAt")
      ORDER BY "day" ASC
    `;
  }

  private async dailyOrders(from: Date, to: Date) {
    return this.prisma.$queryRaw<DailyRow[]>`
      SELECT DATE_TRUNC('day', o."createdAt") AS "day", COUNT(*) AS "value"
      FROM "Order" o
      WHERE o."createdAt" >= ${from}
        AND o."createdAt" < ${to}
      GROUP BY DATE_TRUNC('day', o."createdAt")
      ORDER BY "day" ASC
    `;
  }

  private presentProductPerformance(row: ProductPerformanceRow) {
    const revenueCents = Number(row.revenueMinor);
    return {
      productId: row.productId,
      productName: row.productName,
      productSku: row.productSku,
      quantitySold: Number(row.quantitySold),
      orderCount: Number(row.orderCount),
      revenueCents,
      revenue: minorToAmount(revenueCents),
      currentPriceCents: row.currentPriceMinor ?? 0,
      currentPrice: minorToAmount(row.currentPriceMinor ?? 0),
      currentStock: row.currentStock ?? 0,
      active: row.active ?? false,
      isPublished: row.isPublished ?? false,
      image: row.image ?? '',
    };
  }

  private fillDailySeries(from: Date, to: Date, rows: DailyRow[], valueKey: 'sales' | 'orders') {
    const values = new Map(rows.map(row => [this.dateKey(row.day), Number(row.value ?? 0)]));
    const series: Array<{ date: string; sales?: number; salesCents?: number; orders?: number }> = [];
    for (const cursor = this.utcStartOfDay(from); cursor < to; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = this.dateKey(cursor);
      const value = values.get(date) ?? 0;
      series.push(
        valueKey === 'sales'
          ? { date, sales: minorToAmount(value), salesCents: value }
          : { date, orders: value },
      );
    }
    return series;
  }

  private dateRange(query: AdminAnalyticsQueryDto) {
    const preset = query.preset ?? 'last30';
    const now = new Date();
    const today = this.utcStartOfDay(now);

    if (query.from || query.to || preset === 'custom') {
      if (!query.from || !query.to) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', 'Custom analytics filters require from and to dates.');
      }
      const from = this.parseDateOnly(query.from, 'from');
      const to = this.addDays(this.parseDateOnly(query.to, 'to'), 1);
      this.assertValidRange(from, to);
      return { preset: 'custom' as AnalyticsPreset, from, to };
    }

    if (preset === 'today') {
      return { preset, from: today, to: this.addDays(today, 1) };
    }
    if (preset === 'last7') {
      return { preset, from: this.addDays(today, -6), to: this.addDays(today, 1) };
    }
    if (preset === 'last30') {
      return { preset, from: this.addDays(today, -29), to: this.addDays(today, 1) };
    }
    if (preset === 'thisMonth') {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      return { preset, from, to };
    }
    if (preset === 'lastMonth') {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { preset, from, to };
    }

    throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_ANALYTICS_FILTER', 'Analytics date preset is invalid.');
  }

  private parseDateOnly(value: string, field: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', `${field} must use YYYY-MM-DD format.`);
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', `${field} is not a valid date.`);
    }
    return parsed;
  }

  private assertValidRange(from: Date, to: Date) {
    if (from >= to) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', 'from must be before to.');
    }
    if ((to.getTime() - from.getTime()) / 86_400_000 > 370) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_DATE_RANGE', 'Analytics date range cannot exceed 370 days.');
    }
  }

  private utcStartOfDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private dateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
