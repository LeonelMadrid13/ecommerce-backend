import { ExecutionContext, BadRequestException } from '@nestjs/common';
import { IdempotencyGuard } from './idempotency.guard.js';
import { jest } from '@jest/globals';
import type { Redis } from 'ioredis';

const mockRedis = {
  get: jest.fn<(key: string) => Promise<string | null>>(),
};

const createMockContext = (
  headers: Record<string, string>,
  overrides: { req?: Record<string, unknown> } = {},
) => {
  const req: Record<string, unknown> = { headers, ...overrides.req };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext,
    req,
    res,
  };
};

describe('IdempotencyGuard', () => {
  let guard: IdempotencyGuard;

  beforeEach(() => {
    guard = new IdempotencyGuard(mockRedis as unknown as Redis);
    jest.clearAllMocks();
  });

  it('throws BadRequestException when Idempotency-Key header is missing', async () => {
    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns cached response and short-circuits when key exists in Redis', async () => {
    const cachedPayload = { success: true, data: { orderId: 'abc' } };
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedPayload));

    const { context, res } = createMockContext({
      'idempotency-key': 'test-key-123',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(cachedPayload);
  });

  it('attaches idempotencyKey to request and returns true when no cache exists', async () => {
    mockRedis.get.mockResolvedValueOnce(null);

    const { context, req } = createMockContext({
      'idempotency-key': 'test-key-123',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.idempotencyKey).toBe('idempotency:test-key-123');
  });
});
