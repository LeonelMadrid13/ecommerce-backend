import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

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
        const res = exceptionResponse as any;
        message = Array.isArray(res.message)
          ? res.message.join(', ')
          : res.message || message;

        error = res.error || error;
      }
    } else if (isPrismaError(exception)) {
      // Prisma errors
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Error';

      switch (exception.code) {
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

    // Logging
    console.error({
      message: exception instanceof Error ? exception.message : exception,
      stack: exception instanceof Error ? exception.stack : null,
      path: request.url,
      timestamp: new Date().toISOString(),
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
