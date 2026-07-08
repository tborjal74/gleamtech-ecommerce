import { Module } from '@nestjs/common';

import { CsrfGuard } from '../authentication/csrf.guard.js';
import { SessionAuthGuard } from '../authentication/session-auth.guard.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [InventoryModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService, SessionAuthGuard, CsrfGuard],
})
export class OrdersModule {}
