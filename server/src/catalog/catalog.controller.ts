import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { CatalogService } from './catalog.service.js';
import { CreateProductReviewDto } from './dto/create-product-review.dto.js';

@Controller('api/products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  listProducts() {
    return this.catalogService.listActiveProducts();
  }

  @Get(':productId')
  getProduct(@Param('productId') productId: string) {
    return this.catalogService.getActiveProduct(productId);
  }

  @Get(':productId/reviews')
  listReviews(@Param('productId') productId: string) {
    return this.catalogService.listReviews(productId);
  }

  @Post(':productId/reviews')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  createReview(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.catalogService.createReview(auth.user.id, productId, dto);
  }

  @Post(':productId/stock-notifications')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  requestStockNotification(@CurrentAuth() auth: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.catalogService.requestStockNotification(auth.user.id, productId);
  }
}

@Controller('api/homepage')
export class HomepageController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getHomepageContent() {
    return this.catalogService.homepageContent();
  }
}

@Controller('api/promos')
export class PromosController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  listPromos() {
    return this.catalogService.activePromos();
  }
}
