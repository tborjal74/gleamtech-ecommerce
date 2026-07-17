import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

import { ApiError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateProductReviewDto } from './dto/create-product-review.dto.js';
import { presentProduct } from './product.presenter.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async homepageContent() {
    const [content, reviews, reviewSummary] = await Promise.all([
      this.prisma.homepageContent.findUnique({ where: { id: 'home' } }),
      this.prisma.productReview.findMany({
        include: {
          user: { select: { firstName: true, lastName: true } },
          product: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      this.prisma.productReview.aggregate({
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      content: content ? {
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
      } : null,
      reviews: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        verified: true,
        customerName: `${review.user.firstName} ${review.user.lastName.charAt(0)}.`,
        productName: review.product.name,
      })),
      reviewSummary: {
        average: Number((reviewSummary._avg.rating ?? 0).toFixed(1)),
        count: reviewSummary._count._all,
      },
    };
  }

  async activePromos() {
    const now = new Date();
    const promos = await this.prisma.promoCode.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      promos: promos.map(promo => ({
        id: promo.id,
        code: promo.code,
        name: promo.name,
        description: promo.description ?? '',
        percentOff: promo.percentOff,
        startsAt: promo.startsAt?.toISOString() ?? null,
        endsAt: promo.endsAt?.toISOString() ?? null,
      })),
    };
  }

  async listActiveProducts() {
    const products = await this.prisma.product.findMany({
      where: { active: true, isPublished: true },
      include: { inventory: true },
      orderBy: { createdAt: 'asc' },
    });

    return { products: products.map(presentProduct) };
  }

  async getActiveProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, active: true, isPublished: true },
      include: { inventory: true },
    });

    if (!product) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Product was not found.', {
        productId,
      });
    }

    return presentProduct(product);
  }

  async listReviews(productId: string) {
    const reviews = await this.prisma.productReview.findMany({
      where: { productId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    return {
      reviews: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        title: review.title ?? '',
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        verified: true,
        customerName: `${review.user.firstName} ${review.user.lastName.charAt(0)}.`,
      })),
    };
  }

  async createReview(userId: string, productId: string, dto: CreateProductReviewDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        userId,
        paymentStatus: PaymentStatus.PAID,
        status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.READY_FOR_DELIVERY, OrderStatus.SHIPPED, OrderStatus.COMPLETED] },
        items: { some: { productId } },
      },
    });
    if (!order) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'REVIEW_NOT_ALLOWED', 'Only paid verified purchases can review this product.');
    }

    const review = await this.prisma.productReview.upsert({
      where: { userId_productId_orderId: { userId, productId, orderId: dto.orderId } },
      update: {
        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment.trim(),
      },
      create: {
        userId,
        productId,
        orderId: dto.orderId,
        rating: dto.rating,
        title: dto.title?.trim() || null,
        comment: dto.comment.trim(),
      },
    });

    await this.refreshProductRating(productId);
    return { review: { id: review.id, rating: review.rating, title: review.title ?? '', comment: review.comment } };
  }

  async requestStockNotification(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, active: true, isPublished: true },
      include: { inventory: true },
    });
    if (!product) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Product was not found.', { productId });
    }
    if ((product.inventory?.stockQuantity ?? 0) > 0) {
      return { subscribed: false, message: 'This product is currently in stock.' };
    }
    await this.prisma.stockNotification.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
    return { subscribed: true, message: 'Back-in-stock notice saved.' };
  }

  private async refreshProductRating(productId: string) {
    const aggregate = await this.prisma.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        rating: Number((aggregate._avg.rating ?? 0).toFixed(1)),
        reviewCount: aggregate._count._all,
      },
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError) return undefined;
      throw error;
    });
  }
}
