import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { ApiError } from '../common/api-error.js';

export type UploadedImageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type StoredProductImage = {
  url: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

@Injectable()
export class ProductImageStorageService {
  private readonly maxBytes: number;
  private readonly uploadRoot: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.maxBytes = this.config.get<number>('PRODUCT_IMAGE_MAX_BYTES', 5 * 1024 * 1024);
    this.uploadRoot = this.config.get<string>('UPLOAD_DIR', join(process.cwd(), 'uploads'));
    this.publicBaseUrl = this.config.get<string>('UPLOAD_PUBLIC_BASE_URL', '/uploads');
  }

  async store(file: UploadedImageFile): Promise<StoredProductImage> {
    this.validate(file);

    const expectedExtension = allowedTypes.get(file.mimetype)!;
    const providedExtension = extname(file.originalname).toLowerCase();
    if (providedExtension && providedExtension !== expectedExtension && !(file.mimetype === 'image/jpeg' && providedExtension === '.jpeg')) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_IMAGE_INVALID', 'Product image extension does not match its type.');
    }
    if (!this.matchesImageSignature(file)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_IMAGE_INVALID', 'Product image contents do not match a supported image type.');
    }

    const filename = `${randomUUID()}${expectedExtension}`;
    const storageKey = `products/${filename}`;
    const directory = join(this.uploadRoot, 'products');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), file.buffer);

    return {
      url: `${this.publicBaseUrl.replace(/\/$/, '')}/${storageKey}`,
      storageKey,
      filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  async remove(storageKey: string) {
    if (!storageKey.startsWith('products/')) return;
    await unlink(join(this.uploadRoot, storageKey)).catch(() => undefined);
  }

  private validate(file: UploadedImageFile) {
    if (!allowedTypes.has(file.mimetype)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_IMAGE_INVALID', 'Use a JPEG, PNG, or WebP product image.');
    }
    if (file.size > this.maxBytes) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PRODUCT_IMAGE_TOO_LARGE', 'Product image is too large.', {
        maxBytes: this.maxBytes,
      });
    }
  }

  private matchesImageSignature(file: UploadedImageFile): boolean {
    if (file.mimetype === 'image/jpeg') {
      return file.buffer.length >= 3 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
    }
    if (file.mimetype === 'image/png') {
      return (
        file.buffer.length >= 8 &&
        file.buffer[0] === 0x89 &&
        file.buffer[1] === 0x50 &&
        file.buffer[2] === 0x4e &&
        file.buffer[3] === 0x47 &&
        file.buffer[4] === 0x0d &&
        file.buffer[5] === 0x0a &&
        file.buffer[6] === 0x1a &&
        file.buffer[7] === 0x0a
      );
    }
    if (file.mimetype === 'image/webp') {
      return (
        file.buffer.length >= 12 &&
        file.buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        file.buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    return false;
  }
}
