import { ExecutionContext, CallHandler } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor.js';
import { Redis } from 'ioredis';
import { jest } from '@jest/globals';
import { of } from 'rxjs';

const setMock = jest.fn<(...args: unknown[]) => Promise<'OK'>>();

const mockRedis = {
  set: setMock,
} as unknown as Redis;

const createMockContext = (idempotencyKey?: string) => {
  const req: Record<string, unknown> = {};

  if (idempotencyKey) {
    req.idempotencyKey = idempotencyKey;
  }

  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
};

const createMockHandler = (data: unknown): CallHandler => ({
  handle: () => of(data),
});

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;

  beforeEach(() => {
    interceptor = new IdempotencyInterceptor(mockRedis);
    jest.clearAllMocks();
    setMock.mockResolvedValue('OK');
  });

  it('does not cache when idempotencyKey is not present in request', (done) => {
    const context = createMockContext();
    const handler = createMockHandler({ orderId: 'abc' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(setMock).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('caches response in Redis when idempotencyKey is present', (done) => {
    const context = createMockContext('idempotency:test-key-123');
    const responseData = { orderId: 'abc', status: 'PENDING' };
    const handler = createMockHandler(responseData);

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        // tap is async, give it a tick to resolve
        setImmediate(() => {
          expect(setMock).toHaveBeenCalledWith(
            'idempotency:test-key-123',
            JSON.stringify(responseData),
            'EX',
            86400,
          );
          done();
        });
      },
    });
  });
});
