import { Module } from '@nestjs/common';

import { ProductImageStorageService } from './product-image-storage.service.js';
import { UploadsController } from './uploads.controller.js';

@Module({
  controllers: [UploadsController],
  providers: [ProductImageStorageService],
  exports: [ProductImageStorageService],
})
export class UploadsModule {}
