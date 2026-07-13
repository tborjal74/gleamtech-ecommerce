import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { WholesaleController } from './wholesale.controller.js';
import { WholesaleService } from './wholesale.service.js';

@Module({ imports: [AuthenticationModule, DatabaseModule], controllers: [WholesaleController], providers: [WholesaleService] })
export class WholesaleModule {}
