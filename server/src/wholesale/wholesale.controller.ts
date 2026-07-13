import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { CreateCustomerWholesaleOrderDto, SubmitWholesaleApplicationDto } from './dto/customer-wholesale.dto.js';
import { WholesaleService } from './wholesale.service.js';

@Controller('api/wholesale')
@UseGuards(SessionAuthGuard)
export class WholesaleController {
  constructor(private readonly wholesale: WholesaleService) {}

  @Get() portal(@CurrentAuth() auth: AuthenticatedRequest) { return this.wholesale.portal(auth.user.id); }

  @Post('applications')
  @UseGuards(CsrfGuard)
  apply(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: SubmitWholesaleApplicationDto) { return this.wholesale.apply(auth.user.id, dto); }

  @Post('orders')
  @UseGuards(CsrfGuard)
  createOrder(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: CreateCustomerWholesaleOrderDto) { return this.wholesale.createOrder(auth.user.id, dto); }
}
