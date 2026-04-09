import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type RefreshTokenMockRepo = {
  create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findUnique: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findFirst: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  updateMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  update: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  delete: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
};

const mockPrisma: { refreshToken: RefreshTokenMockRepo } = {
  refreshToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login('user-id', 'test@example.com', 'USER');

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(typeof result.refresh_token).toBe('string');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id',
        revoked: false,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-id', email: 'test@example.com', role: 'USER' },
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: { revoked: true },
      });
    });
    it('should throw UnauthorizedException for invalid token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh('invalid-refresh-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      await expect(service.refresh('expired-refresh-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        revoked: true,
      });
      await expect(service.refresh('revoked-refresh-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});
      await service.logout('refresh-token-to-revoke');

      const firstCallArgs = mockPrisma.refreshToken.updateMany.mock
        .calls[0]?.[0] as
        | {
            where: { OR: Array<{ token: string }> };
            data: { revoked: boolean };
          }
        | undefined;

      expect(firstCallArgs).toBeDefined();
      expect(firstCallArgs?.data).toEqual({ revoked: true });
      expect(firstCallArgs?.where.OR[1]).toEqual({
        token: 'refresh-token-to-revoke',
      });
      expect(typeof firstCallArgs?.where.OR[0]?.token).toBe('string');
    });
  });
});
