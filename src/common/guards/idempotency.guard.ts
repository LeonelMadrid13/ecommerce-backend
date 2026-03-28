import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { Request, Response } from 'express';

import { REDIS_CLIENT } from '../../queue/queue.module.js';

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const key = req.headers['idempotency-key'];

    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const redisKey = `idempotency:${key}`;
    const cached = await this.redis.get(redisKey);

    if (cached) {
      const parsed = JSON.parse(cached) as unknown;
      res.status(200).json(parsed);
      return false; // short-circuit — handler never runs
    }

    // Attach key to request so the controller can store the result after processing
    (req as any).idempotencyKey = redisKey;

    return true;
  }
}
