import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';

import { ProductImageStorageService } from './product-image-storage.service.js';

@Controller('api/uploads')
export class UploadsController {
  constructor(private readonly storage: ProductImageStorageService) {}

  @Get('products/:filename')
  async productImage(@Param('filename') filename: string, @Res() response: Response) {
    const image = await this.storage.read(`products/${filename}`);
    if (!image) {
      response.sendStatus(404);
      return;
    }
    response
      .setHeader('Content-Type', image.mimeType)
      .setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      .status(200)
      .send(image.buffer);
  }
}
