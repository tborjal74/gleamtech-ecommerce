import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';

import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { Roles } from '../authentication/roles.decorator.js';
import { RolesGuard } from '../authentication/roles.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import type { UploadedImageFile } from '../uploads/product-image-storage.service.js';
import { AdminProductsService } from './admin-products.service.js';
import { AdminProductListQueryDto } from './dto/admin-product-list-query.dto.js';
import { CreateAdminProductDto } from './dto/create-admin-product.dto.js';
import { ReorderProductImagesDto } from './dto/product-image-order.dto.js';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto.js';

@Controller('api/admin/products')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProductsController {
  constructor(private readonly productsService: AdminProductsService) {}

  @Get()
  list(@Query() query: AdminProductListQueryDto) {
    return this.productsService.list(query);
  }

  @Get(':productId')
  get(@Param('productId') productId: string) {
    return this.productsService.get(productId);
  }

  @Post()
  @UseGuards(CsrfGuard)
  create(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: CreateAdminProductDto) {
    return this.productsService.create(auth.user.id, dto);
  }

  @Patch(':productId')
  @UseGuards(CsrfGuard)
  update(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateAdminProductDto,
  ) {
    return this.productsService.update(auth.user.id, productId, dto);
  }

  @Delete(':productId')
  @UseGuards(CsrfGuard)
  delete(@CurrentAuth() auth: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.productsService.delete(auth.user.id, productId);
  }

  @Post(':productId/images')
  @UseGuards(CsrfGuard)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadImage(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('productId') productId: string,
    @UploadedFile() file: UploadedImageFile,
    @Body('primary') primary?: string,
  ) {
    return this.productsService.uploadImage(auth.user.id, productId, file, primary === 'true' || primary === '1');
  }

  @Delete(':productId/images/:imageId')
  @UseGuards(CsrfGuard)
  deleteImage(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.deleteImage(auth.user.id, productId, imageId);
  }

  @Patch(':productId/images/:imageId/primary')
  @UseGuards(CsrfGuard)
  setPrimaryImage(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.setPrimaryImage(auth.user.id, productId, imageId);
  }

  @Patch(':productId/images/reorder')
  @UseGuards(CsrfGuard)
  reorderImages(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: ReorderProductImagesDto,
  ) {
    return this.productsService.reorderImages(auth.user.id, productId, dto.imageIds);
  }
}
