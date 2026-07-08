import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export class RequestIdMiddleware {
  use(request: Request & { requestId?: string }, response: Response, next: NextFunction) {
    const requestId = request.header('x-request-id') ?? randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }
}
