import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { Roles } from '../authentication/roles.decorator.js';
import { RolesGuard } from '../authentication/roles.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { AdminWholesaleService } from './admin-wholesale.service.js';
import { CreateWholesaleOrderDto, ReviewWholesaleApplicationDto, UpdateWholesaleOrderDto, UpsertWholesaleAccountDto, WholesaleListQueryDto } from './dto/admin-wholesale.dto.js';

@Controller('api/admin/wholesale')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminWholesaleController {
  constructor(private readonly wholesale: AdminWholesaleService) {}

  @Get('dashboard') dashboard() { return this.wholesale.dashboard(); }
  @Get('applications') applications(@Query() query: WholesaleListQueryDto) { return this.wholesale.applications(query); }
  @Patch('applications/:applicationId') @UseGuards(CsrfGuard)
  reviewApplication(@CurrentAuth() auth: AuthenticatedRequest, @Param('applicationId') applicationId: string, @Body() dto: ReviewWholesaleApplicationDto) { return this.wholesale.reviewApplication(auth.user.id, applicationId, dto); }
  @Get('accounts') accounts(@Query() query: WholesaleListQueryDto) { return this.wholesale.accounts(query); }
  @Post('accounts') @UseGuards(CsrfGuard)
  createAccount(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: UpsertWholesaleAccountDto) { return this.wholesale.createAccount(auth.user.id, dto); }
  @Patch('accounts/:accountId') @UseGuards(CsrfGuard)
  updateAccount(@CurrentAuth() auth: AuthenticatedRequest, @Param('accountId') accountId: string, @Body() dto: UpsertWholesaleAccountDto) { return this.wholesale.updateAccount(auth.user.id, accountId, dto); }
  @Get('orders') orders(@Query() query: WholesaleListQueryDto) { return this.wholesale.orders(query); }
  @Post('orders') @UseGuards(CsrfGuard)
  createOrder(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: CreateWholesaleOrderDto) { return this.wholesale.createOrder(auth.user.id, dto); }
  @Patch('orders/:orderId') @UseGuards(CsrfGuard)
  updateOrder(@CurrentAuth() auth: AuthenticatedRequest, @Param('orderId') orderId: string, @Body() dto: UpdateWholesaleOrderDto) { return this.wholesale.updateOrder(auth.user.id, orderId, dto); }
}
