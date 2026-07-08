import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { CartService } from './cart.service.js';

@Controller('api/cart')
@UseGuards(SessionAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentAuth() auth: AuthenticatedRequest) {
    return this.cartService.getCart(auth.user.id);
  }

  @Post('items')
  @UseGuards(CsrfGuard)
  addItem(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(auth.user.id, dto);
  }

  @Patch('items/:productId')
  @UseGuards(CsrfGuard)
  updateItem(
    @CurrentAuth() auth: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateQuantity(auth.user.id, productId, dto.quantity);
  }

  @Delete('items/:productId')
  @UseGuards(CsrfGuard)
  removeItem(@CurrentAuth() auth: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.cartService.removeItem(auth.user.id, productId);
  }
}
