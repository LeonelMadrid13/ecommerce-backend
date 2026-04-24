import { Inject, Injectable } from '@nestjs/common';

import {
  DATABASE_CONNECTION,
  type DatabaseConnection,
} from '../../database/database.tokens.js';
import type {
  RefreshTokenRepositoryPort,
  RefreshTokenWithUser,
} from '../refresh-token.repository.port.js';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DatabaseConnection,
  ) {}

  createHashedToken(input: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }) {
    return this.db.refreshToken.create({
      data: {
        token: input.tokenHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
      },
    });
  }

  findByTokenOrHashWithUser(
    token: string,
    tokenHash: string,
  ): Promise<RefreshTokenWithUser | null> {
    return this.db.refreshToken.findFirst({
      where: {
        OR: [{ token: tokenHash }, { token }],
      },
      include: { user: true },
    });
  }

  revokeById(id: string) {
    return this.db.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });
  }

  async revokeByTokenOrHash(token: string, tokenHash: string): Promise<number> {
    const result = await this.db.refreshToken.updateMany({
      where: {
        OR: [{ token: tokenHash }, { token }],
      },
      data: { revoked: true },
    });
    return result.count;
  }
}
