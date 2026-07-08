import { Module } from '@nestjs/common';

import { CsrfGuard } from '../authentication/csrf.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

@Module({
  controllers: [CartController],
  providers: [CartService, SessionAuthGuard, CsrfGuard],
  exports: [CartService],
})
export class CartModule {}
