import type { RefreshToken, User } from '@prisma/client';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export type RefreshTokenWithUser = RefreshToken & { user: User };

export interface RefreshTokenRepositoryPort {
  createHashedToken(input: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<RefreshToken>;
  findByTokenOrHashWithUser(
    token: string,
    tokenHash: string,
  ): Promise<RefreshTokenWithUser | null>;
  revokeById(id: string): Promise<RefreshToken>;
  revokeByTokenOrHash(token: string, tokenHash: string): Promise<number>;
}
