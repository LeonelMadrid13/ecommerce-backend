import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

type HttpExceptionResponseBody = {
  message?: string | string[];
  error?: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let prismaCode: string | undefined;
    let prismaMeta: unknown;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // HTTP errors
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = exception.name;

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as HttpExceptionResponseBody;
        message = Array.isArray(res.message)
          ? res.message.join(', ')
          : res.message || message;

        error = res.error || error;
      }
    } else if (isPrismaError(exception)) {
      // Prisma errors
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Error';
      prismaCode = getPrismaErrorCode(exception);
      prismaMeta = getPrismaErrorMeta(exception);

      switch (prismaCode) {
        case 'P2002':
          message = 'Unique constraint failed';
          break;
        case 'P2025':
          message = 'Record not found';
          break;
        default:
          message = 'Database error';
      }
    }

    this.logger.error({
      path: request.url,
      statusCode: status,
      prismaCode,
      prismaMeta,
      error,
      message: exception instanceof Error ? exception.message : 'Unknown error',
    });

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

function isPrismaError(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError;
}

function getPrismaErrorCode(e: unknown): string | undefined {
  if (typeof e !== 'object' || e === null || !('code' in e)) {
    return undefined;
  }

  const code = Reflect.get(e, 'code');
  return typeof code === 'string' ? code : undefined;
}

function getPrismaErrorMeta(e: unknown): unknown {
  if (typeof e !== 'object' || e === null || !('meta' in e)) {
    return undefined;
  }
  return Reflect.get(e, 'meta');
}
