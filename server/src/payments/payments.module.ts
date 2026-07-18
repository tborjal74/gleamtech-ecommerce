import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
