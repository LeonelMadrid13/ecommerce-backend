import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrisma = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw BadRequestException if price is 0', async () => {
      try {
        await service.create({ name: 'Test', price: 0, stock: 10 });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect((err as BadRequestException).message).toBe(
          'Price must be greater than 0',
        );
      }
    });

    it('should throw BadRequestException if price is negative', async () => {
      try {
        await service.create({ name: 'Test', price: -5, stock: 10 });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('should call prisma.product.create with correct data', async () => {
      const dto = { name: 'Laptop', price: 1500, stock: 10 };
      const expected = { id: 'uuid-1', ...dto };

      mockPrisma.product.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(expected);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const products = [
        { id: 'uuid-1', name: 'Laptop', price: 1500, stock: 10 },
      ];

      mockPrisma.product.findMany.mockResolvedValue(products);

      const result = await service.findAll(10, 0);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        select: { id: true, name: true, price: true, stock: true },
      });
      expect(result).toEqual(products);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a product if found', async () => {
      const product = { id: 'uuid-1', name: 'Laptop', price: 1500, stock: 10 };

      mockPrisma.product.findUnique.mockResolvedValue(product);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(product);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      try {
        await service.findOne('non-existent');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
        expect((err as NotFoundException).message).toBe('Product not found');
      }
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should throw BadRequestException if price is updated to 0', async () => {
      try {
        await service.update('uuid-1', { price: 0 });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      try {
        await service.update('non-existent', { name: 'New Name' });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('should update product if it exists and data is valid', async () => {
      const existing = { id: 'uuid-1', name: 'Laptop', price: 1500, stock: 10 };
      const dto = { name: 'Gaming Laptop' };
      const updated = { ...existing, ...dto };

      mockPrisma.product.findUnique.mockResolvedValue(existing);
      mockPrisma.product.update.mockResolvedValue(updated);

      const result = await service.update('uuid-1', dto);

      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: dto,
      });
      expect(result).toEqual(updated);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      try {
        await service.remove('non-existent');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('should delete product if it exists', async () => {
      const existing = { id: 'uuid-1', name: 'Laptop', price: 1500, stock: 10 };

      mockPrisma.product.findUnique.mockResolvedValue(existing);
      mockPrisma.product.delete.mockResolvedValue(existing);

      const result = await service.remove('uuid-1');

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
      expect(result).toEqual(existing);
    });
  });
});
