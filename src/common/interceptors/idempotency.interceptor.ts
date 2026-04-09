import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { Observable, tap } from 'rxjs';

import { REDIS_CLIENT } from '../../queue/queue.module.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.type.js';

const IDEMPOTENCY_TTL_SECONDS = 86400;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const redisKey = req.idempotencyKey;

    return next.handle().pipe(
      tap((data: unknown) => {
        if (redisKey) {
          void this.redis
            .set(redisKey, JSON.stringify(data), 'EX', IDEMPOTENCY_TTL_SECONDS)
            .catch(() => {
              // Ignore cache persistence failures to avoid breaking API flow
            });
        }
      }),
    );
  }
}
