import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ProductService } from './product.service.js';
import { PRODUCT_REPOSITORY } from './product.repository.port.js';

type ProductRepositoryMock = {
  create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findById: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  exists: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  update: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  remove: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
};

const mockProductRepository: ProductRepositoryMock = {
  create: jest.fn(),
  findMany: jest.fn(),
  findById: jest.fn(),
  exists: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PRODUCT_REPOSITORY, useValue: mockProductRepository },
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

    it('should call repository create with correct data', async () => {
      const dto = { name: 'Laptop', price: 1500, stock: 10 };
      const expected = { id: 'uuid-1', ...dto };

      mockProductRepository.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(mockProductRepository.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const products = [
        { id: 'uuid-1', name: 'Laptop', price: 1500, stock: 10 },
      ];

      mockProductRepository.findMany.mockResolvedValue(products);

      const result = await service.findAll(10, 0);

      expect(mockProductRepository.findMany).toHaveBeenCalledWith(10, 0);
      expect(result).toEqual(products);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return a product if found', async () => {
      const product = { id: 'uuid-1', name: 'Laptop', price: 1500, stock: 10 };

      mockProductRepository.findById.mockResolvedValue(product);

      const result = await service.findOne('uuid-1');

      expect(result).toEqual(product);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

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
      mockProductRepository.exists.mockResolvedValue(false);

      try {
        await service.update('non-existent', { name: 'New Name' });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('should update product if it exists and data is valid', async () => {
      const dto = { name: 'Gaming Laptop' };
      const updated = {
        id: 'uuid-1',
        name: 'Gaming Laptop',
        price: 1500,
        stock: 10,
      };

      mockProductRepository.exists.mockResolvedValue(true);
      mockProductRepository.update.mockResolvedValue(updated);

      const result = await service.update('uuid-1', dto);

      expect(mockProductRepository.exists).toHaveBeenCalledWith('uuid-1');
      expect(mockProductRepository.update).toHaveBeenCalledWith('uuid-1', dto);
      expect(result).toEqual(updated);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      mockProductRepository.exists.mockResolvedValue(false);

      try {
        await service.remove('non-existent');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('should delete product if it exists', async () => {
      const existing = {
        id: 'uuid-1',
        name: 'Laptop',
        price: 1500,
        stock: 10,
      };

      mockProductRepository.exists.mockResolvedValue(true);
      mockProductRepository.remove.mockResolvedValue(existing);

      const result = await service.remove('uuid-1');

      expect(mockProductRepository.remove).toHaveBeenCalledWith('uuid-1');
      expect(result).toEqual(existing);
    });
  });
});
