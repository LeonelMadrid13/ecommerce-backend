import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';

import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { UserService } from '../src/user/user.service.js';

describe('Auth E2E', () => {
  let app: INestApplication;

  const mockAuthService: any = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockUserService: any = {
    createUser: jest.fn(),
    validateUser: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login should login successfully', async () => {
    mockUserService.validateUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
    });
    mockAuthService.login.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        });
      });
  });

  it('POST /auth/login should fail with invalid credentials', async () => {
    mockUserService.validateUser.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'bad@example.com', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /auth/refresh should refresh token successfully', async () => {
    mockAuthService.refresh.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
    });

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: 'valid-token' })
      .expect(200);
  });

  it('POST /auth/refresh should fail for invalid or revoked token', async () => {
    mockAuthService.refresh.mockRejectedValue(
      new UnauthorizedException('Invalid or expired refresh token'),
    );

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: 'revoked-token' })
      .expect(401);
  });
});
