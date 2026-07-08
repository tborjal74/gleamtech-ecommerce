import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedRequest } from './auth.types.js';

export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();
  return {
    user: request.user,
    sessionId: request.sessionId,
    csrfToken: request.csrfToken,
  };
});
