import { Module } from '@nestjs/common';

import { UploadsModule } from '../uploads/uploads.module.js';
import { CatalogController, HomepageController, PromosController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [UploadsModule],
  controllers: [CatalogController, HomepageController, PromosController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
