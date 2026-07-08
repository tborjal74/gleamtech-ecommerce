import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { ApiErrorCode } from './api-error.js';

interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & { requestId?: string }>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      const body = this.normalizeHttpException(statusCode, payload);
      response.status(statusCode).json({ ...body, requestId: request.requestId });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      requestId: request.requestId,
    });
  }

  private normalizeHttpException(statusCode: number, payload: string | object): ApiErrorBody {
    if (typeof payload === 'object' && payload !== null && 'code' in payload) {
      const typed = payload as ApiErrorBody;
      return {
        statusCode,
        code: typed.code,
        message: typed.message,
        details: typed.details,
      };
    }

    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const validationPayload = payload as { message?: string[] | string };
      return {
        statusCode,
        code: 'VALIDATION_ERROR',
        message: Array.isArray(validationPayload.message)
          ? validationPayload.message.join('; ')
          : validationPayload.message ?? 'Validation failed.',
      };
    }

    return {
      statusCode,
      code: 'HTTP_ERROR',
      message: typeof payload === 'string' ? payload : 'Request failed.',
    };
  }
}
