import { HttpStatus } from '@nestjs/common';

import { ApiError } from '../common/api-error.js';

export type PaymentProofFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_PAYMENT_PROOF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validatePaymentProof(file?: PaymentProofFile): asserts file is PaymentProofFile {
  if (!file) {
    throw new ApiError(HttpStatus.BAD_REQUEST, 'PAYMENT_PROOF_REQUIRED', 'Upload a screenshot or photo of the payment confirmation.');
  }
  if (!ALLOWED_PAYMENT_PROOF_TYPES.has(file.mimetype)) {
    throw new ApiError(HttpStatus.BAD_REQUEST, 'PAYMENT_PROOF_INVALID', 'Payment proof must be a JPEG, PNG, or WebP image.');
  }
  if (file.size <= 0 || file.size > PAYMENT_PROOF_MAX_BYTES) {
    throw new ApiError(HttpStatus.BAD_REQUEST, 'PAYMENT_PROOF_INVALID', 'Payment proof must be no larger than 5 MB.');
  }

  const validSignature =
    (file.mimetype === 'image/jpeg' && file.buffer.length >= 3 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff) ||
    (file.mimetype === 'image/png' && file.buffer.length >= 8 && file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (file.mimetype === 'image/webp' && file.buffer.length >= 12 && file.buffer.subarray(0, 4).toString('ascii') === 'RIFF' && file.buffer.subarray(8, 12).toString('ascii') === 'WEBP');

  if (!validSignature) {
    throw new ApiError(HttpStatus.BAD_REQUEST, 'PAYMENT_PROOF_INVALID', 'Payment proof contents do not match the selected image type.');
  }
}
