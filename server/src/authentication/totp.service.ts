import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';

import { ApiError } from '../common/api-error.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ISSUER = 'Gleamtech';
const PERIOD_SECONDS = 30;
const DIGITS = 6;

@Injectable()
export class TotpService {
  constructor(private readonly config: ConfigService) {}

  createSecret() {
    return this.base32Encode(randomBytes(20));
  }

  encryptSecret(secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
  }

  decryptSecret(payload: string) {
    const [version, iv, tag, ciphertext] = payload.split(':');
    if (version !== 'v1' || !iv || !tag || !ciphertext) {
      throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'TOTP_SECRET_UNREADABLE', 'Two-factor configuration is unavailable.');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  buildOtpAuthUri(email: string, secret: string) {
    const accountLabel = `${ISSUER}:${email}`;
    const longUri = this.otpAuthUri(accountLabel, secret);
    if (Buffer.byteLength(longUri, 'utf8') <= 96) return longUri;
    return this.compactOtpAuthUri(secret);
  }

  verify(secret: string, code: string, now = Date.now()) {
    const normalized = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalized)) return false;
    const counter = Math.floor(now / 1000 / PERIOD_SECONDS);
    return [-1, 0, 1].some(offset => this.constantTimeEqual(this.codeAt(secret, counter + offset), normalized));
  }

  async qrSvg(data: string) {
    return QRCode.toString(data, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 4,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  private otpAuthUri(label: string, secret: string) {
    const params = new URLSearchParams({
      secret,
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: String(DIGITS),
      period: String(PERIOD_SECONDS),
    });
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
  }

  private compactOtpAuthUri(secret: string) {
    return `otpauth://totp/GT?secret=${encodeURIComponent(secret)}&issuer=GT`;
  }

  private codeAt(secret: string, counter: number) {
    const key = this.base32Decode(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', key).update(counterBuffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    return String(binary % 1_000_000).padStart(6, '0');
  }

  private constantTimeEqual(expected: string, actual: string) {
    const a = Buffer.from(expected);
    const b = Buffer.from(actual);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private encryptionKey() {
    const configured = this.config.get<string>('TOTP_ENCRYPTION_KEY')?.trim();
    if (!configured) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'TOTP_KEY_REQUIRED', 'Two-factor encryption key is not configured.');
      }
      return createHash('sha256').update(this.config.get<string>('DATABASE_URL', 'gleamtech-local-totp-key')).digest();
    }
    if (/^[A-Fa-f0-9]{64}$/.test(configured)) return Buffer.from(configured, 'hex');
    return createHash('sha256').update(configured).digest();
  }

  private base32Encode(input: Buffer) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of input) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    return output;
  }

  private base32Decode(input: string) {
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of input.toUpperCase().replace(/=+$/g, '')) {
      const index = BASE32_ALPHABET.indexOf(char);
      if (index < 0) throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_TOTP_SECRET', 'Two-factor secret is invalid.');
      value = (value << 5) | index;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }
}
