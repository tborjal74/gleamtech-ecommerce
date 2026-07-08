import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module.js';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';

@Module({
  imports: [DatabaseModule, AuthenticationModule],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
