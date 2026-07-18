import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';

import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { Roles } from '../authentication/roles.decorator.js';
import { RolesGuard } from '../authentication/roles.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { AdminActivityService } from './admin-activity.service.js';
import { AdminOperationsService } from './admin-operations.service.js';
import { AdminActivityQueryDto, AdminPageQueryDto, AdminReportQueryDto } from './dto/admin-shared-query.dto.js';
import { UpsertPromoCodeDto } from './dto/admin-promo.dto.js';
import { UpdateHomepageContentDto } from './dto/homepage-content.dto.js';
import { UpdateCustomerActiveDto } from './dto/update-customer-active.dto.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
import type { UploadedImageFile } from '../uploads/product-image-storage.service.js';

@Controller('api/admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminOperationsController {
  constructor(
    private readonly operations: AdminOperationsService,
    private readonly activity: AdminActivityService,
  ) {}

  @Get('activity')
  listActivity(@Query() query: AdminActivityQueryDto) {
    return this.activity.list(query);
  }

  @Get('payments')
  paymentQueue(@Query() query: AdminPageQueryDto) {
    return this.operations.paymentQueue(query);
  }

  @Get('customers')
  customers(@Query() query: AdminPageQueryDto) {
    return this.operations.customers(query);
  }

  @Patch('customers/:customerId/active')
  @UseGuards(CsrfGuard)
  setCustomerActive(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerActiveDto,
  ) {
    return this.operations.setCustomerActive(auth.user.id, customerId, dto.active);
  }

  @Get('inventory')
  inventory(@Query() query: AdminPageQueryDto) {
    return this.operations.inventory(query);
  }

  @Patch('inventory/:productId')
  @UseGuards(CsrfGuard)
  updateInventory(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.operations.updateInventory(auth.user.id, productId, dto.stockQuantity);
  }

  @Get('reports.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  reports(@Query() query: AdminReportQueryDto) {
    return this.operations.report(query.type, query);
  }

  @Get('promos')
  promos(@Query() query: AdminPageQueryDto) {
    return this.operations.promos(query);
  }

  @Post('promos')
  @UseGuards(CsrfGuard)
  createPromo(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: UpsertPromoCodeDto) {
    return this.operations.createPromo(auth.user.id, dto);
  }

  @Patch('promos/:promoId')
  @UseGuards(CsrfGuard)
  updatePromo(@CurrentAuth() auth: AuthenticatedRequest, @Param('promoId') promoId: string, @Body() dto: UpsertPromoCodeDto) {
    return this.operations.updatePromo(auth.user.id, promoId, dto);
  }

  @Delete('promos/:promoId')
  @UseGuards(CsrfGuard)
  deletePromo(@CurrentAuth() auth: AuthenticatedRequest, @Param('promoId') promoId: string) {
    return this.operations.deletePromo(auth.user.id, promoId);
  }

  @Get('homepage')
  homepageContent() {
    return this.operations.homepageContent();
  }

  @Patch('homepage')
  @UseGuards(CsrfGuard)
  updateHomepageContent(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: UpdateHomepageContentDto) {
    return this.operations.updateHomepageContent(auth.user.id, dto);
  }

  @Post('homepage/images/:slot')
  @UseGuards(CsrfGuard)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadHomepageImage(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('slot') slot: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.operations.uploadHomepageImage(auth.user.id, slot, file);
  }
}
