import { validatePaymentProof } from './payment-proof.util.js';

describe('validatePaymentProof', () => {
  it('accepts a PNG with a valid signature', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(() => validatePaymentProof({ originalname: 'proof.png', mimetype: 'image/png', size: buffer.length, buffer })).not.toThrow();
  });

  it('rejects a file whose contents do not match its MIME type', () => {
    const buffer = Buffer.from('not an image');
    expect(() => validatePaymentProof({ originalname: 'proof.png', mimetype: 'image/png', size: buffer.length, buffer })).toThrow('contents');
  });
});
