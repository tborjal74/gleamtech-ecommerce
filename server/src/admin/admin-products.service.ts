import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { ApiError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { ProductImageStorageService, type UploadedImageFile } from '../uploads/product-image-storage.service.js';
import { AdminActivityService } from './admin-activity.service.js';
import type { AdminProductListQueryDto } from './dto/admin-product-list-query.dto.js';
import type { CreateAdminProductDto } from './dto/create-admin-product.dto.js';
import type { UpdateAdminProductDto } from './dto/update-admin-product.dto.js';

const MAX_PRODUCT_IMAGES = 8;

type AdminProduct = Prisma.ProductGetPayload<{
  include: { inventory: true; images: true; _count: { select: { orderItems: true } } };
}>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function presentAdminProduct(product: AdminProduct) {
  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    priceCents: product.priceMinor,
    weightGrams: product.weightGrams,
    stockQuantity: product.inventory?.stockQuantity ?? 0,
    isActive: product.active,
    isPublished: product.isPublished,
    category: product.category,
    scent: product.scent,
    isEco: product.isEco,
    primaryImageUrl: product.image,
    sizes: product.sizes,
    tags: product.tags,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    hasOrderHistory: product._count.orderItems > 0,
    images: product.images.map(image => ({
      id: image.id,
      url: image.url,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      createdAt: image.createdAt.toISOString(),
    })),
  };
}

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ProductImageStorageService,
    private readonly activity: AdminActivityService,
  ) {}

  async list(query: AdminProductListQueryDto) {
    const where: Prisma.ProductWhereInput = {};
    if (query.active !== undefined) where.active = query.active;
    if (query.published !== undefined) where.isPublished = query.published;
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { sku: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const orderBy =
      query.sortBy === 'stock'
        ? { inventory: { stockQuantity: query.sortDirection } }
        : query.sortBy === 'price'
          ? { priceMinor: query.sortDirection }
          : { [query.sortBy]: query.sortDirection };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: this.includeProduct(),
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      products: products.map(presentAdminProduct),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize),
      },
    };
  }

  async get(productId: string) {
    return { product: presentAdminProduct(await this.findProduct(productId)) };
  }

  async create(adminId: string, dto: CreateAdminProductDto) {
    await this.assertUniqueSku(dto.sku);
    const slug = await this.uniqueSlug(dto.name);
    const hasImage = Boolean(dto.primaryImageUrl);

    const product = await this.prisma.$transaction(async tx => {
      const created = await tx.product.create({
        data: {
          id: randomUUID(),
          sku: dto.sku.trim(),
          slug,
          name: dto.name.trim(),
          shortDescription: dto.shortDescription.trim(),
          description: dto.description.trim(),
          priceMinor: dto.priceCents,
          weightGrams: dto.weightGrams,
          active: dto.isActive,
          isPublished: hasImage ? dto.isPublished : false,
          category: dto.category.trim(),
          brand: 'Gleamtech',
          scent: dto.scent?.trim() || null,
          isEco: dto.isEco,
          image: dto.primaryImageUrl?.trim() || '',
          rating: 0,
          reviewCount: 0,
          sizes: dto.sizes?.length ? dto.sizes : ['Standard'],
          tags: dto.tags ?? [],
          createdById: adminId,
          updatedById: adminId,
          inventory: { create: { stockQuantity: dto.stockQuantity } },
        },
        include: this.includeProduct(),
      });

      if (dto.primaryImageUrl) {
        await tx.productImage.create({
          data: {
            productId: created.id,
            url: dto.primaryImageUrl.trim(),
            storageKey: dto.primaryImageUrl.trim(),
            mimeType: 'image/external',
            sizeBytes: 0,
            isPrimary: true,
          },
        });
      }

      return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: this.includeProduct() });
    });

    await this.activity.record({
      adminId,
      action: 'product.created',
      entityType: 'product',
      entityId: product.id,
      description: `Created listing ${product.name}`,
      metadata: { sku: product.sku },
    });
    return { product: presentAdminProduct(product) };
  }

  async update(adminId: string, productId: string, dto: UpdateAdminProductDto) {
    const existing = await this.findProduct(productId);
    if (dto.sku && dto.sku !== existing.sku) await this.assertUniqueSku(dto.sku, productId);
    const nextSlug = dto.name && dto.name !== existing.name ? await this.uniqueSlug(dto.name, productId) : undefined;

    const product = await this.prisma.$transaction(async tx => {
      await tx.product.update({
        where: { id: productId },
        data: {
          ...(dto.sku !== undefined ? { sku: dto.sku.trim() } : {}),
          ...(nextSlug ? { slug: nextSlug } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.shortDescription !== undefined ? { shortDescription: dto.shortDescription.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.priceCents !== undefined ? { priceMinor: dto.priceCents } : {}),
          ...(dto.weightGrams !== undefined ? { weightGrams: dto.weightGrams } : {}),
          ...(dto.isActive !== undefined ? { active: dto.isActive } : {}),
          ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
          ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
          ...(dto.scent !== undefined ? { scent: dto.scent?.trim() || null } : {}),
          ...(dto.isEco !== undefined ? { isEco: dto.isEco } : {}),
          ...(dto.primaryImageUrl !== undefined ? { image: dto.primaryImageUrl.trim() } : {}),
          ...(dto.sizes !== undefined ? { sizes: dto.sizes.length ? dto.sizes : ['Standard'] } : {}),
          ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
          updatedById: adminId,
        },
      });

      if (dto.stockQuantity !== undefined) {
        await tx.inventory.upsert({
          where: { productId },
          update: { stockQuantity: dto.stockQuantity },
          create: { productId, stockQuantity: dto.stockQuantity },
        });
      }

      return tx.product.findUniqueOrThrow({ where: { id: productId }, include: this.includeProduct() });
    });

    await this.activity.record({
      adminId,
      action: 'product.updated',
      entityType: 'product',
      entityId: product.id,
      description: `Updated listing ${product.name}`,
      metadata: { sku: product.sku },
    });
    return { product: presentAdminProduct(product) };
  }

  async delete(adminId: string, productId: string) {
    const product = await this.findProduct(productId);
    if (product._count.orderItems > 0) {
      const archived = await this.prisma.product.update({
        where: { id: productId },
        data: { active: false, isPublished: false },
        include: this.includeProduct(),
      });
      await this.activity.record({
        adminId,
        action: 'product.archived',
        entityType: 'product',
        entityId: productId,
        description: `Archived listing ${archived.name}`,
        metadata: { sku: archived.sku },
      });
      return { mode: 'archived' as const, product: presentAdminProduct(archived) };
    }

    for (const image of product.images) {
      await this.imageStorage.remove(image.storageKey);
    }
    await this.prisma.product.delete({ where: { id: productId } });
    await this.activity.record({
      adminId,
      action: 'product.deleted',
      entityType: 'product',
      entityId: productId,
      description: `Deleted listing ${product.name}`,
      metadata: { sku: product.sku },
    });
    return { mode: 'deleted' as const, productId };
  }

  async uploadImage(adminId: string, productId: string, file: UploadedImageFile, primary: boolean) {
    if (!file) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_IMAGE_INVALID', 'Upload a product image.');
    }
    const product = await this.findProduct(productId);
    if (product.images.length >= MAX_PRODUCT_IMAGES) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_IMAGE_LIMIT_EXCEEDED', 'A product can have up to 8 images.');
    }

    const stored = await this.imageStorage.store(file);
    const nextSortOrder = product.images.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;
    const image = await this.prisma.$transaction(async tx => {
      if (primary || product.images.length === 0) {
        await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
      }
      const created = await tx.productImage.create({
        data: {
          productId,
          url: stored.url,
          storageKey: stored.storageKey,
          filename: stored.filename,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          isPrimary: primary || product.images.length === 0,
          sortOrder: nextSortOrder,
        },
      });
      if (created.isPrimary || !product.image) {
        await tx.product.update({ where: { id: productId }, data: { image: created.url, updatedById: adminId } });
      }
      return created;
    });

    await this.activity.record({
      adminId,
      action: 'product.image_uploaded',
      entityType: 'product',
      entityId: productId,
      description: `Uploaded image for ${product.name}`,
      metadata: { imageId: image.id },
    });
    return { image };
  }

  async setPrimaryImage(adminId: string, productId: string, imageId: string) {
    const product = await this.findProduct(productId);
    const image = product.images.find(candidate => candidate.id === imageId);
    if (!image) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Product image was not found.');
    }

    const updated = await this.prisma.$transaction(async tx => {
      await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
      await tx.productImage.update({ where: { id: imageId }, data: { isPrimary: true } });
      return tx.product.update({
        where: { id: productId },
        data: { image: image.url, updatedById: adminId },
        include: this.includeProduct(),
      });
    });

    await this.activity.record({
      adminId,
      action: 'product.image_primary_updated',
      entityType: 'product',
      entityId: productId,
      description: `Updated primary image for ${product.name}`,
      metadata: { imageId },
    });
    return { product: presentAdminProduct(updated) };
  }

  async reorderImages(adminId: string, productId: string, imageIds: string[]) {
    const product = await this.findProduct(productId);
    const existingIds = new Set(product.images.map(image => image.id));
    if (imageIds.length !== product.images.length || imageIds.some(imageId => !existingIds.has(imageId))) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_IMAGE_INVALID_ORDER', 'Image order must include every product image exactly once.');
    }

    const updated = await this.prisma.$transaction(async tx => {
      await Promise.all(imageIds.map((imageId, index) => tx.productImage.update({ where: { id: imageId }, data: { sortOrder: index } })));
      return tx.product.findUniqueOrThrow({ where: { id: productId }, include: this.includeProduct() });
    });

    await this.activity.record({
      adminId,
      action: 'product.images_reordered',
      entityType: 'product',
      entityId: productId,
      description: `Reordered images for ${product.name}`,
      metadata: { imageIds },
    });
    return { product: presentAdminProduct(updated) };
  }

  async deleteImage(adminId: string, productId: string, imageId: string) {
    await this.findProduct(productId);
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Product image was not found.');
    }

    await this.prisma.$transaction(async tx => {
      await tx.productImage.delete({ where: { id: image.id } });
      const replacement = image.isPrimary
        ? await tx.productImage.findFirst({ where: { productId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
        : null;
      if (replacement) {
        await tx.productImage.update({ where: { id: replacement.id }, data: { isPrimary: true } });
      }
      if (image.isPrimary) {
        await tx.product.update({
          where: { id: productId },
          data: { image: replacement?.url ?? '', updatedById: adminId },
        });
      }
    });
    await this.imageStorage.remove(image.storageKey);
    await this.activity.record({
      adminId,
      action: 'product.image_deleted',
      entityType: 'product',
      entityId: productId,
      description: `Deleted image from product`,
      metadata: { imageId },
    });
    return { ok: true };
  }

  private includeProduct() {
    return {
      inventory: true,
      images: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
      _count: { select: { orderItems: true } },
    };
  }

  private async findProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: this.includeProduct(),
    });
    if (!product) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Product was not found.', { productId });
    }
    return product;
  }

  private async assertUniqueSku(sku: string, productId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { sku } });
    if (existing && existing.id !== productId) {
      throw new ApiError(HttpStatus.CONFLICT, 'SKU_ALREADY_EXISTS', 'A product with this SKU already exists.');
    }
  }

  private async uniqueSlug(name: string, productId?: string) {
    const base = slugify(name) || 'product';
    let slug = base;
    let index = 2;
    while (true) {
      const existing = await this.prisma.product.findUnique({ where: { slug } });
      if (!existing || existing.id === productId) return slug;
      slug = `${base}-${index}`;
      index += 1;
    }
  }
}
