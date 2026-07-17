import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
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
  storageProvider: 'local' | 'cloudinary';
  publicId?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type ServedProductImage = {
  buffer: Buffer;
  mimeType: string;
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
  private readonly cloudinaryEnabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.maxBytes = this.config.get<number>('PRODUCT_IMAGE_MAX_BYTES', 5 * 1024 * 1024);
    this.uploadRoot = this.config.get<string>('UPLOAD_DIR', join(process.cwd(), 'uploads'));
    this.publicBaseUrl = this.config.get<string>('UPLOAD_PUBLIC_BASE_URL', '/uploads');
    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL')?.trim();
    this.cloudinaryEnabled = Boolean(cloudinaryUrl);
    if (cloudinaryUrl) {
      const credentials = new URL(cloudinaryUrl.replace(/^cloudinary:\/\//, 'https://'));
      cloudinary.config({
        cloud_name: credentials.hostname,
        api_key: decodeURIComponent(credentials.username),
        api_secret: decodeURIComponent(credentials.password),
        secure: true,
      });
    }
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

    if (this.cloudinaryEnabled) {
      const uploaded = await this.uploadToCloudinary(file);
      return {
        url: uploaded.secure_url,
        storageKey: `cloudinary:${uploaded.public_id}`,
        storageProvider: 'cloudinary',
        publicId: uploaded.public_id,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.bytes,
      };
    }

    const filename = `${randomUUID()}${expectedExtension}`;
    const storageKey = `products/${filename}`;
    const directory = join(this.uploadRoot, 'products');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, filename), file.buffer);

    return {
      url: `${this.publicBaseUrl.replace(/\/$/, '')}/${storageKey}`,
      storageKey,
      storageProvider: 'local',
      filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  async remove(storageKey: string, storageProvider = 'local', publicId?: string | null) {
    if (storageProvider === 'cloudinary' || storageKey.startsWith('cloudinary:')) {
      if (!this.cloudinaryEnabled) return;
      await cloudinary.uploader.destroy(publicId ?? storageKey.replace(/^cloudinary:/, ''), {
        resource_type: 'image',
        invalidate: true,
      }).catch(() => undefined);
      return;
    }
    if (!storageKey.startsWith('products/')) return;
    await unlink(join(this.uploadRoot, storageKey)).catch(() => undefined);
  }

  async read(storageKey: string): Promise<ServedProductImage | null> {
    if (!storageKey.startsWith('products/')) return null;
    try {
      const buffer = await readFile(join(this.uploadRoot, storageKey));
      const extension = extname(storageKey).toLowerCase();
      const mimeType = extension === '.jpg' || extension === '.jpeg'
        ? 'image/jpeg'
        : extension === '.webp'
          ? 'image/webp'
          : 'image/png';
      return { buffer, mimeType };
    } catch {
      return null;
    }
  }

  private uploadToCloudinary(file: UploadedImageFile): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'gleamtech/products',
          resource_type: 'image',
          type: 'upload',
          unique_filename: true,
          overwrite: false,
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            reject(new Error(error?.message ?? 'Cloudinary image upload failed.'));
            return;
          }
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });
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
