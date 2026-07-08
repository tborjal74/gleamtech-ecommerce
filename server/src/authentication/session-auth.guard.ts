import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { ApiError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import { SESSION_COOKIE, type AuthenticatedRequest } from './auth.types.js';
import { hashSessionToken } from './session.util.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();
    const cookieToken = request.cookies?.[SESSION_COOKIE] as string | undefined;
    const bearerToken = this.readBearerToken(request);
    const token = cookieToken ?? bearerToken;

    if (!token) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required.',
      );
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date() || !session.user.active) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required.',
      );
    }

    request.user = session.user;
    request.sessionId = session.id;
    request.csrfToken = session.csrfToken;
    request.authTransport = cookieToken ? 'cookie' : 'bearer';
    return true;
  }

  private readBearerToken(request: Request): string | undefined {
    if (this.config.get<string>('ENABLE_BEARER_SESSION_FALLBACK', 'false').toLowerCase() !== 'true') {
      return undefined;
    }
    const authorization = request.header('authorization');
    if (!authorization?.toLowerCase().startsWith('bearer ')) return undefined;
    const token = authorization.slice(7).trim();
    return token || undefined;
  }
}
