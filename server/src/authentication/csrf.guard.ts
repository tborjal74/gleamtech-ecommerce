import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { ApiError } from '../common/api-error.js';
import { CSRF_COOKIE, type AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();
    const csrfCookie = request.cookies?.[CSRF_COOKIE] as string | undefined;
    const csrfHeader = request.header('x-csrf-token');

    if (!csrfHeader || csrfHeader !== request.csrfToken) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'CSRF_TOKEN_INVALID', 'CSRF token is invalid.');
    }

    if (request.authTransport !== 'bearer' && csrfCookie !== csrfHeader) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'CSRF_TOKEN_INVALID', 'CSRF token is invalid.');
    }

    return true;
  }
}
