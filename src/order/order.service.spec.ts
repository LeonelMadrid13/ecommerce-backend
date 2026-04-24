import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';

import { OrderService } from './order.service.js';
import { QUEUES } from '../queue/queue.module.js';
import { ORDER_JOBS } from '../queue/jobs/order.jobs.js';
import { ORDER_REPOSITORY } from './order.repository.port.js';

type OrderRepositoryMock = {
  createPendingWithItems: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findAllByUser: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findByIdForUser: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
};

type QueueMock = {
  add: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
};

const mockOrderRepository: OrderRepositoryMock = {
  createPendingWithItems: jest.fn(),
  findAllByUser: jest.fn(),
  findByIdForUser: jest.fn(),
};

const mockQueue: QueueMock = {
  add: jest.fn(),
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: ORDER_REPOSITORY, useValue: mockOrderRepository },
        { provide: getQueueToken(QUEUES.ORDERS), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if items array is empty', async () => {
      try {
        await service.create('user-id', { items: [] });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect((err as BadRequestException).message).toBe(
          'Order must contain at least one item',
        );
      }
    });

    it('should create a PENDING order and enqueue a job', async () => {
      const userId = 'user-uuid';
      const dto = {
        items: [{ productId: 'product-uuid', quantity: 2 }],
      };
      const createdOrder = {
        id: 'order-uuid',
        userId,
        total: 0,
        status: 'PENDING',
      };

      mockOrderRepository.createPendingWithItems.mockResolvedValue(
        createdOrder,
      );
      mockQueue.add.mockResolvedValue(undefined);

      const result = await service.create(userId, dto);

      expect(result).toEqual({
        orderId: createdOrder.id,
        status: 'PENDING',
      });

      const createArgs =
        mockOrderRepository.createPendingWithItems.mock.calls[0];
      expect(createArgs).toBeDefined();
      expect(createArgs?.[0]).toBe(userId);

      expect(mockQueue.add).toHaveBeenCalledWith(
        ORDER_JOBS.PROCESS,
        { orderId: createdOrder.id },
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('should merge duplicate items before creating order', async () => {
      const userId = 'user-uuid';
      const dto = {
        items: [
          { productId: 'product-uuid', quantity: 1 },
          { productId: 'product-uuid', quantity: 2 },
        ],
      };
      const createdOrder = {
        id: 'order-uuid',
        userId,
        total: 0,
        status: 'PENDING',
      };

      mockOrderRepository.createPendingWithItems.mockResolvedValue(
        createdOrder,
      );
      mockQueue.add.mockResolvedValue(undefined);

      await service.create(userId, dto);

      const itemsArg = mockOrderRepository.createPendingWithItems.mock
        .calls[0]?.[1] as
        | Array<{ productId: string; quantity: number }>
        | undefined;

      expect(itemsArg).toEqual([{ productId: 'product-uuid', quantity: 3 }]);
    });
  });

  describe('findAll', () => {
    it('should return all orders for a user', async () => {
      const orders = [
        { id: 'order-uuid', userId: 'user-uuid', total: 0, status: 'PENDING' },
      ];

      mockOrderRepository.findAllByUser.mockResolvedValue(orders);

      const result = await service.findAll('user-uuid');

      expect(mockOrderRepository.findAllByUser).toHaveBeenCalledWith(
        'user-uuid',
      );
      expect(result).toEqual(orders);
    });
  });

  describe('findById', () => {
    it('should return an order if found', async () => {
      const order = {
        id: 'order-uuid',
        userId: 'user-uuid',
        total: 1500,
        status: 'CONFIRMED',
        orderItems: [],
      };

      mockOrderRepository.findByIdForUser.mockResolvedValue(order);

      const result = await service.findById('user-uuid', 'order-uuid');

      expect(mockOrderRepository.findByIdForUser).toHaveBeenCalledWith(
        'user-uuid',
        'order-uuid',
      );
      expect(result).toEqual(order);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockOrderRepository.findByIdForUser.mockResolvedValue(null);

      try {
        await service.findById('user-uuid', 'non-existent');
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
        expect((err as NotFoundException).message).toBe('Order not found');
      }
    });
  });
});
