import { Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { OrderRequestStatus, UserRole } from '@prisma/client';

import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { Roles } from '../authentication/roles.decorator.js';
import { RolesGuard } from '../authentication/roles.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { AdminOrdersService } from './admin-orders.service.js';
import { AdminOrderListQueryDto } from './dto/admin-order-list-query.dto.js';
import { ReviewOrderRequestDto } from '../orders/dto/order-request.dto.js';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Controller('api/admin/orders')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminOrdersController {
  constructor(private readonly ordersService: AdminOrdersService) {}

  @Get()
  list(@Query() query: AdminOrderListQueryDto) {
    return this.ordersService.list(query);
  }

  @Get(':orderId')
  get(@Param('orderId') orderId: string) {
    return this.ordersService.get(orderId);
  }

  @Get(':orderId/payment-proof')
  async paymentProof(@Param('orderId') orderId: string, @Res() response: Response) {
    const proof = await this.ordersService.paymentProof(orderId);
    response
      .setHeader('Content-Type', proof.proofMimeType)
      .setHeader('Cache-Control', 'private, no-store')
      .setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(proof.proofOriginalName)}"`)
      .send(proof.proof);
  }

  @Patch(':orderId/status')
  @UseGuards(CsrfGuard)
  updateStatus(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(auth.user.id, orderId, dto.status);
  }

  @Patch(':orderId/payment-status')
  @UseGuards(CsrfGuard)
  updatePaymentStatus(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(auth.user.id, orderId, dto.paymentStatus);
  }

  @Patch(':orderId/requests/:requestId/approve')
  @UseGuards(CsrfGuard)
  approveRequest(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewOrderRequestDto,
  ) {
    return this.ordersService.reviewRequest(auth.user.id, orderId, requestId, OrderRequestStatus.APPROVED, dto.adminNote);
  }

  @Patch(':orderId/requests/:requestId/reject')
  @UseGuards(CsrfGuard)
  rejectRequest(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ReviewOrderRequestDto,
  ) {
    return this.ordersService.reviewRequest(auth.user.id, orderId, requestId, OrderRequestStatus.REJECTED, dto.adminNote);
  }
}
