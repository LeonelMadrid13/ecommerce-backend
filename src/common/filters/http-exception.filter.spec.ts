import { GlobalExceptionFilter } from './http-exception.filter.js';
import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { jest } from '@jest/globals';

const createMockHost = (url = '/test') => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url };

  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost,
    json,
    status,
  };
};

const createPrismaError = (code: string) => {
  return new Prisma.PrismaClientKnownRequestError('error', {
    code,
    clientVersion: '5.0.0',
  });
};

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles HttpException with string response', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Not found',
        path: '/test',
      }),
    );
  });

  it('handles HttpException with array of messages (ValidationPipe)', () => {
    const { host, json } = createMockHost();
    const exception = new BadRequestException({
      message: ['name must be a string', 'price must be a number'],
      error: 'Bad Request',
    });

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'name must be a string, price must be a number',
      }),
    );
  });

  it('handles Prisma P2002 (unique constraint)', () => {
    const { host, status, json } = createMockHost();
    filter.catch(createPrismaError('P2002'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Database Error',
        message: 'Unique constraint failed',
      }),
    );
  });

  it('handles Prisma P2025 (record not found)', () => {
    const { host, json } = createMockHost();
    filter.catch(createPrismaError('P2025'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Record not found',
      }),
    );
  });

  it('handles unknown Prisma error code', () => {
    const { host, json } = createMockHost();
    filter.catch(createPrismaError('P9999'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Database error',
      }),
    );
  });

  it('handles unknown error with 500', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new Error('something exploded'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    );
  });
});
