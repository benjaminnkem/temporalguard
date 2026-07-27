import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { ApiErrorResponse } from '../types';

type ExceptionBody = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  error?: unknown;
};

function errorCode(status: number, body: ExceptionBody): string {
  if (typeof body.code === 'string') return body.code;
  const conventional: Partial<Record<number, string>> = {
    400: 'INVALID_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'RATE_LIMITED',
  };
  return conventional[status] ?? 'INTERNAL_ERROR';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      exception instanceof HttpException ? exception.getResponse() : {};
    const body: ExceptionBody =
      typeof raw === 'object' && raw !== null ? raw : { message: raw };
    const validationMessages = Array.isArray(body.message)
      ? body.message.filter(
          (message): message is string => typeof message === 'string',
        )
      : undefined;
    const message =
      validationMessages?.join('; ') ??
      (typeof body.message === 'string'
        ? body.message
        : status >= 500
          ? 'An unexpected error occurred.'
          : 'The request could not be completed.');
    const requestHeader = request.headers['x-request-id'];
    const requestId =
      (Array.isArray(requestHeader) ? requestHeader[0] : requestHeader) ??
      randomUUID();
    const payload: ApiErrorResponse = {
      error: {
        code: errorCode(status, body),
        message,
        details:
          typeof body.details === 'object' && body.details !== null
            ? (body.details as Record<string, unknown>)
            : validationMessages
              ? { violations: validationMessages }
              : {},
        requestId,
      },
    };
    response.setHeader('x-request-id', requestId);
    response.status(status).json(payload);
  }
}
