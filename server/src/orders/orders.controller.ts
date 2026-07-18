import { Body, Controller, Get, Header, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { CustomerOrderListQueryDto } from './dto/customer-order-list-query.dto.js';
import { OrderRequestDto } from './dto/order-request.dto.js';
import { OrdersService } from './orders.service.js';
import { PaymentSubmissionDto } from '../payments/dto/payment-submission.dto.js';
import { PAYMENT_PROOF_MAX_BYTES, type PaymentProofFile } from '../payments/payment-proof.util.js';

@Controller('api/orders')
@UseGuards(SessionAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(CsrfGuard)
  checkout(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(auth.user.id, dto);
  }

  @Post(':orderId/payment-submission')
  @UseGuards(CsrfGuard)
  @UseInterceptors(FileInterceptor('proof', { limits: { fileSize: PAYMENT_PROOF_MAX_BYTES, files: 1, fields: 2 } }))
  submitPayment(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: PaymentSubmissionDto,
    @UploadedFile() file?: PaymentProofFile,
  ) {
    return this.ordersService.submitPayment(auth.user.id, orderId, dto, file);
  }

  @Get()
  listOrders(@CurrentAuth() auth: AuthenticatedRequest, @Query() query: CustomerOrderListQueryDto) {
    return this.ordersService.listOrders(auth.user.id, query);
  }

  @Get(':orderId')
  getOrder(@CurrentAuth() auth: AuthenticatedRequest, @Param('orderId') orderId: string) {
    return this.ordersService.getOrder(auth.user.id, orderId);
  }

  @Patch(':orderId/cancel')
  @UseGuards(CsrfGuard)
  cancelOrder(@CurrentAuth() auth: AuthenticatedRequest, @Param('orderId') orderId: string) {
    return this.ordersService.cancelOrder(auth.user.id, orderId);
  }

  @Post(':orderId/cancel-request')
  @UseGuards(CsrfGuard)
  requestCancellation(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: OrderRequestDto,
  ) {
    return this.ordersService.requestCancellation(auth.user.id, orderId, dto.reason);
  }

  @Post(':orderId/return-request')
  @UseGuards(CsrfGuard)
  requestReturnRefund(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: OrderRequestDto,
  ) {
    return this.ordersService.requestReturnRefund(auth.user.id, orderId, dto.reason);
  }

  @Post(':orderId/reorder')
  @UseGuards(CsrfGuard)
  reorder(@CurrentAuth() auth: AuthenticatedRequest, @Param('orderId') orderId: string) {
    return this.ordersService.reorder(auth.user.id, orderId);
  }

  @Get(':orderId/receipt')
  receipt(@CurrentAuth() auth: AuthenticatedRequest, @Param('orderId') orderId: string) {
    return this.ordersService.receipt(auth.user.id, orderId);
  }

  @Get(':orderId/invoice.pdf')
  @Header('Content-Type', 'application/pdf')
  async invoicePdf(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Res() response: Response,
  ) {
    const pdf = await this.ordersService.invoicePdf(auth.user.id, orderId);
    response.setHeader('Content-Disposition', `attachment; filename="gleamtech-${orderId}.pdf"`);
    response.send(pdf);
  }
}
