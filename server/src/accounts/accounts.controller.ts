import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

import { toPublicUser } from '../common/public-user.js';
import { CurrentAuth } from '../authentication/current-auth.decorator.js';
import { CsrfGuard } from '../authentication/csrf.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import type { AuthenticatedRequest } from '../authentication/auth.types.js';
import { AccountsService } from './accounts.service.js';
import { SaveAddressDto } from './dto/save-address.dto.js';
import { TwoFactorConfirmDto, TwoFactorDisableDto, TwoFactorSetupDto } from './dto/two-factor-code.dto.js';

@Controller('api/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('me')
  @UseGuards(SessionAuthGuard)
  getCurrentAccount(@CurrentAuth() auth: AuthenticatedRequest) {
    return { user: toPublicUser(auth.user), csrfToken: auth.csrfToken };
  }

  @Get('addresses')
  @UseGuards(SessionAuthGuard)
  listAddresses(@CurrentAuth() auth: AuthenticatedRequest) {
    return this.accountsService.listAddresses(auth.user.id);
  }

  @Post('addresses')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  saveAddress(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: SaveAddressDto) {
    return this.accountsService.saveAddress(auth.user.id, dto);
  }

  @Get('wishlist')
  @UseGuards(SessionAuthGuard)
  wishlist(@CurrentAuth() auth: AuthenticatedRequest) {
    return this.accountsService.wishlist(auth.user.id);
  }

  @Post('wishlist/:productId')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  addWishlistItem(@CurrentAuth() auth: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.accountsService.addWishlistItem(auth.user.id, productId);
  }

  @Delete('wishlist/:productId')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  removeWishlistItem(@CurrentAuth() auth: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.accountsService.removeWishlistItem(auth.user.id, productId);
  }

  @Get('security')
  @UseGuards(SessionAuthGuard)
  security(@CurrentAuth() auth: AuthenticatedRequest) {
    return this.accountsService.security(auth.user.id);
  }

  @Post('2fa/setup')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  setupTwoFactor(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: TwoFactorSetupDto) {
    return this.accountsService.setupTwoFactor(auth.user.id, dto.password);
  }

  @Post('2fa/confirm')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  confirmTwoFactor(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: TwoFactorConfirmDto) {
    return this.accountsService.confirmTwoFactor(auth.user.id, dto.code);
  }

  @Post('2fa/disable')
  @UseGuards(SessionAuthGuard, CsrfGuard)
  disableTwoFactor(@CurrentAuth() auth: AuthenticatedRequest, @Body() dto: TwoFactorDisableDto) {
    return this.accountsService.disableTwoFactor(auth.user.id, dto.code, dto.password);
  }
}
