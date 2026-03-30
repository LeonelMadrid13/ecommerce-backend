import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ResponseInterceptor } from './response.interceptor.js';
import { of } from 'rxjs';

const createMockHandler = (data: unknown): CallHandler => ({
  handle: () => of(data),
});

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps response with success, data, and timestamp', (done) => {
    const context = {} as ExecutionContext;
    const handler = createMockHandler({ orderId: 'abc' });

    interceptor.intercept(context, handler).subscribe({
      next: (result) => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ orderId: 'abc' });
        expect(typeof result.timestamp).toBe('string');
        expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
        done();
      },
    });
  });
});
