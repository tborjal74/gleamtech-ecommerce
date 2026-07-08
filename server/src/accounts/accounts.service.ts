import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { ApiError } from '../common/api-error.js';
import { presentProduct } from '../catalog/product.presenter.js';
import { TotpService } from '../authentication/totp.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { SaveAddressDto } from './dto/save-address.dto.js';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
  ) {}

  async listAddresses(userId: string) {
    const addresses = await this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return { addresses: addresses.map(address => this.presentAddress(address)) };
  }

  async saveAddress(userId: string, dto: SaveAddressDto) {
    const isDefault = dto.isDefault ?? true;
    if (isDefault) {
      await this.prisma.customerAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const address = await this.prisma.customerAddress.create({
      data: {
        userId,
        label: dto.label?.trim() || 'Default',
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        line1: dto.line1.trim(),
        line2: dto.line2?.trim() || null,
        city: dto.city.trim(),
        region: dto.region.trim(),
        postal: dto.postal?.trim() || null,
        country: (dto.country || 'PH').trim().toUpperCase(),
        isDefault,
      },
    });
    return { address: this.presentAddress(address) };
  }

  async wishlist(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { include: { inventory: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { products: items.map(item => presentProduct(item.product)) };
  }

  async addWishlistItem(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, active: true, isPublished: true },
    });
    if (!product) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    await this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
    return { saved: true };
  }

  async removeWishlistItem(userId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return { saved: false };
  }

  async security(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true, totpEnabledAt: true },
    });
    if (!user) throw new ApiError(HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND', 'Account was not found.');
    return {
      twoFactor: {
        enabled: user.totpEnabled,
        enabledAt: user.totpEnabledAt,
      },
    };
  }

  async setupTwoFactor(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true, totpEnabled: true },
    });
    if (!user) throw new ApiError(HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND', 'Account was not found.');
    if (user.totpEnabled) {
      throw new ApiError(HttpStatus.CONFLICT, 'TWO_FACTOR_ALREADY_ENABLED', 'Two-factor authentication is already enabled.');
    }
    await this.assertPassword(user.passwordHash, password);

    const secret = this.totp.createSecret();
    const otpauthUri = this.totp.buildOtpAuthUri(user.email, secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEncrypted: this.totp.encryptSecret(secret),
        totpEnabled: false,
        totpEnabledAt: null,
      },
    });

    return { qrSvg: await this.totp.qrSvg(otpauthUri) };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecretEncrypted: true, totpEnabled: true },
    });
    if (!user?.totpSecretEncrypted) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'TWO_FACTOR_SETUP_REQUIRED', 'Start two-factor setup before confirming.');
    }
    if (user.totpEnabled) {
      throw new ApiError(HttpStatus.CONFLICT, 'TWO_FACTOR_ALREADY_ENABLED', 'Two-factor authentication is already enabled.');
    }
    const valid = this.totp.verify(this.totp.decryptSecret(user.totpSecretEncrypted), code);
    if (!valid) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_TWO_FACTOR_CODE', 'The authenticator code is invalid.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true, totpEnabledAt: new Date() },
    });
    return { twoFactor: { enabled: true } };
  }

  async disableTwoFactor(userId: string, code: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, totpSecretEncrypted: true, totpEnabled: true },
    });
    if (!user?.totpEnabled || !user.totpSecretEncrypted) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'TWO_FACTOR_NOT_ENABLED', 'Two-factor authentication is not enabled.');
    }
    await this.assertPassword(user.passwordHash, password);
    const valid = this.totp.verify(this.totp.decryptSecret(user.totpSecretEncrypted), code);
    if (!valid) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_TWO_FACTOR_CODE', 'The authenticator code is invalid.');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEncrypted: null,
        totpEnabled: false,
        totpEnabledAt: null,
        sessions: { deleteMany: {} },
        twoFactorChallenges: { deleteMany: {} },
      },
    });
    return { twoFactor: { enabled: false } };
  }

  private async assertPassword(passwordHash: string | null, password: string) {
    if (!passwordHash) {
      throw new ApiError(HttpStatus.BAD_REQUEST, 'PASSWORD_REQUIRED', 'Set an account password before changing two-factor settings.');
    }
    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Password is incorrect.');
    }
  }

  private presentAddress(address: {
    id: string;
    label: string;
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    region: string;
    postal: string | null;
    country: string;
    isDefault: boolean;
  }) {
    return {
      id: address.id,
      label: address.label,
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      region: address.region,
      postal: address.postal ?? '',
      country: address.country,
      isDefault: address.isDefault,
    };
  }
}
