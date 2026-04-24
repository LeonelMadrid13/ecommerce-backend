import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { AuthService } from './auth.service.js';
import { REFRESH_TOKEN_REPOSITORY } from './refresh-token.repository.port.js';

type RefreshTokenRepositoryMock = {
  createHashedToken: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findByTokenOrHashWithUser: jest.Mock<
    (...args: unknown[]) => Promise<unknown>
  >;
  revokeById: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  revokeByTokenOrHash: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
};

const mockRefreshTokenRepository: RefreshTokenRepositoryMock = {
  createHashedToken: jest.fn(),
  findByTokenOrHashWithUser: jest.fn(),
  revokeById: jest.fn(),
  revokeByTokenOrHash: jest.fn(),
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
        {
          provide: REFRESH_TOKEN_REPOSITORY,
          useValue: mockRefreshTokenRepository,
        },
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
      mockRefreshTokenRepository.createHashedToken.mockResolvedValue({});

      const result = await service.login('user-id', 'test@example.com', 'USER');

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(typeof result.refresh_token).toBe('string');
      expect(
        mockRefreshTokenRepository.createHashedToken,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid token', async () => {
      mockRefreshTokenRepository.findByTokenOrHashWithUser.mockResolvedValue({
        id: 'token-id',
        revoked: false,
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-id', email: 'test@example.com', role: 'USER' },
      });
      mockRefreshTokenRepository.revokeById.mockResolvedValue({});
      mockRefreshTokenRepository.createHashedToken.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(mockRefreshTokenRepository.revokeById).toHaveBeenCalledWith(
        'token-id',
      );
    });
    it('should throw UnauthorizedException for invalid token', async () => {
      mockRefreshTokenRepository.findByTokenOrHashWithUser.mockResolvedValue(
        null,
      );

      await expect(service.refresh('invalid-refresh-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      mockRefreshTokenRepository.findByTokenOrHashWithUser.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      await expect(service.refresh('expired-refresh-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      mockRefreshTokenRepository.findByTokenOrHashWithUser.mockResolvedValue({
        revoked: true,
      });
      await expect(service.refresh('revoked-refresh-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      mockRefreshTokenRepository.revokeByTokenOrHash.mockResolvedValue(1);
      await service.logout('refresh-token-to-revoke');

      const firstCallArgs = mockRefreshTokenRepository.revokeByTokenOrHash.mock
        .calls[0] as [string, string] | undefined;

      expect(firstCallArgs).toBeDefined();
      expect(firstCallArgs?.[0]).toBe('refresh-token-to-revoke');
      expect(typeof firstCallArgs?.[1]).toBe('string');
    });
  });
});
