import { Test, TestingModule } from '@nestjs/testing';
import {
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

  const mockProductService: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthGuard: any = {
    canActivate: jest.fn(),
  };

  const mockRolesGuard: any = {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('admin can create products', async () => {
    mockJwtAuthGuard.canActivate.mockReturnValue(true);
    mockRolesGuard.canActivate.mockReturnValue(true);
    mockProductService.create.mockResolvedValue({
      id: 'product-1',
      name: 'Laptop',
      price: 1500,
      stock: 10,
    });

    await request(app.getHttpServer())
      .post('/products')
      .send({ name: 'Laptop', price: 1500, stock: 10 })
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBe('product-1');
        expect(body.name).toBe('Laptop');
      });

    expect(mockProductService.create).toHaveBeenCalledWith({
      name: 'Laptop',
      price: 1500,
      stock: 10,
    });
  });

  it('non-admin cannot create products', async () => {
    mockJwtAuthGuard.canActivate.mockReturnValue(true);
    mockRolesGuard.canActivate.mockImplementation(() => {
      throw new ForbiddenException('Forbidden resource');
    });

    await request(app.getHttpServer())
      .post('/products')
      .send({ name: 'Mouse', price: 50, stock: 5 })
      .expect(403);

    expect(mockProductService.create).not.toHaveBeenCalled();
  });

  it('protected routes reject unauthorized users', async () => {
    mockJwtAuthGuard.canActivate.mockImplementation(() => {
      throw new UnauthorizedException();
    });

    await request(app.getHttpServer())
      .post('/products')
      .send({ name: 'Keyboard', price: 120, stock: 8 })
      .expect(401);

    expect(mockProductService.create).not.toHaveBeenCalled();
  });
});
