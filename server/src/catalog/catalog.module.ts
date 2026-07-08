import { Module } from '@nestjs/common';

import { CatalogController, HomepageController, PromosController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  controllers: [CatalogController, HomepageController, PromosController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
