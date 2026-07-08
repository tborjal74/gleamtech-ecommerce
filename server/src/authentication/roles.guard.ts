import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { ApiError } from '../common/api-error.js';
import type { AuthenticatedRequest } from './auth.types.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) return true;

    const request = context.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();
    if (!request.user) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
    }

    if (!roles.includes(request.user.role)) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'ADMIN_REQUIRED', 'Administrator access is required.');
    }

    if (roles.includes(UserRole.ADMIN) && !this.isAllowedAdminIdentity(request.user.email)) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'ADMIN_REQUIRED', 'Administrator access is required.');
    }

    return true;
  }

  private isAllowedAdminIdentity(email?: string) {
    if (!email) return false;
    const allowedEmails = [
      ...(this.config.get<string>('ADMIN_EMAILS') ?? '').split(','),
      this.config.get<string>('ADMIN_EMAIL') ?? '',
    ]
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);

    return allowedEmails.length > 0 && allowedEmails.includes(email.trim().toLowerCase());
  }
}
