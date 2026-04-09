import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import request from 'supertest';

import { ProductController } from '../src/product/product.controller.js';
import { ProductService } from '../src/product/product.service.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

describe('Products E2E', () => {
  let app: INestApplication;

  type ProductServiceMock = {
    create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    findAll: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    findOne: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    update: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    remove: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  };

  const mockProductService: ProductServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtAuthGuard.canActivate.mockReturnValue(true);
    mockRolesGuard.canActivate.mockReturnValue(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('create product (valid)', async () => {
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
      .expect(201);
  });

  it('create product (invalid input)', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post('/products')
      .send({ name: 'Laptop', price: 'bad-price', stock: -3 })
      .expect(400);
  });

  it('update product with optimistic locking conflict', async () => {
    mockProductService.update.mockRejectedValue(
      new ConflictException('Version conflict'),
    );

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .patch('/products/product-1')
      .send({ price: 1600 })
      .expect(409);
  });

  it('fetch product list', async () => {
    mockProductService.findAll.mockResolvedValue([
      { id: 'p1', name: 'Laptop', price: 1500, stock: 10 },
      { id: 'p2', name: 'Mouse', price: 50, stock: 100 },
    ]);

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server).get('/products').expect(200);
  });
});
