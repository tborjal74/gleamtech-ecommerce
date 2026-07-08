import { Module } from '@nestjs/common';

import { ProductImageStorageService } from './product-image-storage.service.js';

@Module({
  providers: [ProductImageStorageService],
  exports: [ProductImageStorageService],
})
export class UploadsModule {}
