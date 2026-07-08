import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { presentCart } from './cart.presenter.js';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.findOrCreateCart(userId);
    return presentCart(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { inventory: true },
    });
    this.assertProductCanBeAdded(product, dto.productId);

    const cart = await this.findOrCreateCart(userId);
    const existing = cart.items.find(item => item.productId === dto.productId);
    const nextQuantity = (existing?.quantity ?? 0) + dto.quantity;
    this.assertInventory(dto.productId, product.inventory?.stockQuantity ?? 0, nextQuantity);

    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId: dto.productId } },
      update: { quantity: nextQuantity, size: dto.size ?? existing?.size ?? product.sizes[0] ?? 'Standard' },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
        size: dto.size ?? product.sizes[0] ?? 'Standard',
      },
    });

    return this.getCart(userId);
  }

  async updateQuantity(userId: string, productId: string, quantity: number) {
    const cart = await this.findOrCreateCart(userId);

    if (quantity === 0) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
      return this.getCart(userId);
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });
    this.assertProductCanBeAdded(product, productId);
    this.assertInventory(productId, product.inventory?.stockQuantity ?? 0, quantity);

    await this.prisma.cartItem.updateMany({
      where: { cartId: cart.id, productId },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.findOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return this.getCart(userId);
  }

  private async findOrCreateCart(userId: string) {
    const cart =
      (await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: { include: { inventory: true } } } } },
      })) ?? (await this.prisma.cart.create({ data: { userId }, include: { items: { include: { product: { include: { inventory: true } } } } } }));

    return cart;
  }

  private assertProductCanBeAdded(
    product: Awaited<ReturnType<PrismaService['product']['findUnique']>>,
    productId: string,
  ): asserts product is NonNullable<typeof product> {
    if (!product) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Product was not found.', {
        productId,
      });
    }
    if (!product.active || !product.isPublished) {
      throw new ApiError(HttpStatus.CONFLICT, 'PRODUCT_UNAVAILABLE', 'Product is unavailable.', {
        productId,
      });
    }
  }

  private assertInventory(productId: string, availableQuantity: number, requestedQuantity: number) {
    if (requestedQuantity > availableQuantity) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'INSUFFICIENT_STOCK',
        'Requested quantity exceeds available stock.',
        { productId, availableQuantity },
      );
    }
  }
}
