import { Module } from '@nestjs/common';

import { AuthenticationModule } from '../authentication/authentication.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { EmailModule } from '../email/email.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { AdminActivityService } from './admin-activity.service.js';
import { AdminAnalyticsController } from './admin-analytics.controller.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { AdminOrdersService } from './admin-orders.service.js';
import { AdminOperationsController } from './admin-operations.controller.js';
import { AdminOperationsService } from './admin-operations.service.js';
import { AdminProductsController } from './admin-products.controller.js';
import { AdminProductsService } from './admin-products.service.js';
import { AdminWholesaleController } from './admin-wholesale.controller.js';
import { AdminWholesaleService } from './admin-wholesale.service.js';

@Module({
  imports: [AuthenticationModule, DatabaseModule, EmailModule, UploadsModule],
  controllers: [AdminProductsController, AdminOrdersController, AdminAnalyticsController, AdminOperationsController, AdminWholesaleController],
  providers: [AdminProductsService, AdminOrdersService, AdminAnalyticsService, AdminOperationsService, AdminActivityService, AdminWholesaleService],
})
export class AdminModule {}
