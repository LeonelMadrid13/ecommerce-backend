import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';

import { ProductController } from '../src/product/product.controller.js';
import { ProductService } from '../src/product/product.service.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

describe('Authorization E2E (TDD)', () => {
  let app: INestApplication;

  type ProductServiceMock = {
    create: jest.Mock<(...args: any[]) => any>;
    findAll: jest.Mock<(...args: any[]) => any>;
    findOne: jest.Mock<(...args: any[]) => any>;
    update: jest.Mock<(...args: any[]) => any>;
    remove: jest.Mock<(...args: any[]) => any>;
  };

  const mockProductService: ProductServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const jwtCanActivate = jest.fn();
  const rolesCanActivate = jest.fn();

  const mockJwtAuthGuard: Pick<CanActivate, 'canActivate'> = {
    canActivate: jwtCanActivate as CanActivate['canActivate'],
  };

  const mockRolesGuard: Pick<CanActivate, 'canActivate'> = {
    canActivate: rolesCanActivate as CanActivate['canActivate'],
  };

  beforeAll(async () => {
    const builder = Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: mockProductService }],
    });

    builder.overrideGuard(JwtAuthGuard).useValue(mockJwtAuthGuard);
    builder.overrideGuard(RolesGuard).useValue(mockRolesGuard);

    const moduleFixture: TestingModule = await builder.compile();

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

  it('admin can create products', async () => {
    jwtCanActivate.mockReturnValue(true);
    rolesCanActivate.mockReturnValue(true);
    mockProductService.create.mockResolvedValue({
      id: 'product-1',
      name: 'Laptop',
      price: 1500,
      stock: 10,
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/products')
      .send({ name: 'Laptop', price: 1500, stock: 10 })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ id: 'product-1', name: 'Laptop' }),
        );
      });

    expect(mockProductService.create).toHaveBeenCalledWith({
      name: 'Laptop',
      price: 1500,
      stock: 10,
    });
  });

  it('non-admin cannot create products', async () => {
    jwtCanActivate.mockReturnValue(true);
    rolesCanActivate.mockImplementation(() => {
      throw new ForbiddenException('Forbidden resource');
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/products')
      .send({ name: 'Mouse', price: 50, stock: 5 })
      .expect(403);

    expect(mockProductService.create).not.toHaveBeenCalled();
  });

  it('protected routes reject unauthorized users', async () => {
    jwtCanActivate.mockImplementation(() => {
      throw new UnauthorizedException();
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/products')
      .send({ name: 'Keyboard', price: 120, stock: 8 })
      .expect(401);

    expect(mockProductService.create).not.toHaveBeenCalled();
  });
});
