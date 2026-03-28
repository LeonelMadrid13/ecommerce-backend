import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

import { REDIS_CLIENT } from '../../queue/queue.module.js';

const IDEMPOTENCY_TTL_SECONDS = 86400;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const redisKey = (req as any).idempotencyKey as string | undefined;

    return next.handle().pipe(
      tap(async (data: unknown) => {
        if (redisKey) {
          await this.redis.set(
            redisKey,
            JSON.stringify(data),
            'EX',
            IDEMPOTENCY_TTL_SECONDS,
          );
        }
      }),
    );
  }
}
