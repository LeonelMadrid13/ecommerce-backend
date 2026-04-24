import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Job } from 'bullmq';

import { OrderProcessor } from './order.processor.js';
import type { ProcessOrderPayload } from '../queue/jobs/order.jobs.js';
import {
  ORDER_PROCESSING_REPOSITORY,
  type OrderProcessingTransactionPort,
} from './order-processing.repository.port.js';

type OrderProcessingTransactionMock = {
  findOrderByIdWithItems: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  findProductsByIds: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  decrementStockIfAvailable: jest.Mock<
    (...args: unknown[]) => Promise<boolean>
  >;
  setOrderItemPrice: jest.Mock<(...args: unknown[]) => Promise<void>>;
  confirmOrder: jest.Mock<(...args: unknown[]) => Promise<void>>;
};

type OrderProcessingRepositoryMock = {
  withTransaction: jest.Mock<
    (cb: (tx: OrderProcessingTransactionPort) => Promise<void>) => Promise<void>
  >;
  markAsFailed: jest.Mock<(...args: unknown[]) => Promise<void>>;
};

const mockOrderProcessingTx: OrderProcessingTransactionMock = {
  findOrderByIdWithItems: jest.fn(),
  findProductsByIds: jest.fn(),
  decrementStockIfAvailable: jest.fn(),
  setOrderItemPrice: jest.fn(),
  confirmOrder: jest.fn(),
};

const mockOrderProcessingRepository: OrderProcessingRepositoryMock = {
  withTransaction: jest.fn(),
  markAsFailed: jest.fn(),
};

const makeJob = (
  overrides: Partial<Job<ProcessOrderPayload>> = {},
): Job<ProcessOrderPayload> =>
  ({
    name: 'process-order',
    data: { orderId: 'order-uuid' },
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  }) as unknown as Job<ProcessOrderPayload>;

const mockLogger = {
  info: jest.fn<(obj: object, msg?: string) => void>(),
  warn: jest.fn<(obj: object, msg?: string) => void>(),
  error: jest.fn<(obj: object, msg?: string) => void>(),
};

describe('OrderProcessor', () => {
  let processor: OrderProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderProcessor,
        {
          provide: ORDER_PROCESSING_REPOSITORY,
          useValue: mockOrderProcessingRepository,
        },
        { provide: 'PinoLogger:OrderProcessor', useValue: mockLogger },
      ],
    }).compile();

    processor = module.get<OrderProcessor>(OrderProcessor);

    jest.clearAllMocks();
    mockOrderProcessingRepository.withTransaction.mockImplementation(
      async (cb) => cb(mockOrderProcessingTx as OrderProcessingTransactionPort),
    );
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleProcessOrder', () => {
    it('should mark order as FAILED if order does not exist', async () => {
      mockOrderProcessingTx.findOrderByIdWithItems.mockResolvedValue(null);
      mockOrderProcessingRepository.markAsFailed.mockResolvedValue(undefined);

      const job = makeJob();
      await processor.process(job);

      expect(mockOrderProcessingRepository.markAsFailed).toHaveBeenCalledWith(
        'order-uuid',
      );
    });

    it('should skip if order is not in PENDING status', async () => {
      mockOrderProcessingTx.findOrderByIdWithItems.mockResolvedValue({
        id: 'order-uuid',
        status: 'CONFIRMED',
        orderItems: [],
      });

      const job = makeJob();
      await processor.process(job);

      expect(mockOrderProcessingRepository.markAsFailed).not.toHaveBeenCalled();
    });
  });

  it('should mark order as FAILED if products no longer exist', async () => {
    mockOrderProcessingTx.findOrderByIdWithItems.mockResolvedValue({
      id: 'order-uuid',
      status: 'PENDING',
      orderItems: [{ productId: 'product-uuid', quantity: 2 }],
    });
    mockOrderProcessingTx.findProductsByIds.mockResolvedValue([]);
    mockOrderProcessingRepository.markAsFailed.mockResolvedValue(undefined);

    const job = makeJob();
    await processor.process(job);

    expect(mockOrderProcessingRepository.markAsFailed).toHaveBeenCalledWith(
      'order-uuid',
    );
  });

  it('should throw retryable error if stock is insufficient', async () => {
    mockOrderProcessingTx.findOrderByIdWithItems.mockResolvedValue({
      id: 'order-uuid',
      status: 'PENDING',
      orderItems: [{ productId: 'product-uuid', quantity: 10 }],
    });
    mockOrderProcessingTx.findProductsByIds.mockResolvedValue([
      { id: 'product-uuid', name: 'Laptop', price: 1500, stock: 2 },
    ]);

    const job = makeJob();

    await expect(processor.process(job)).rejects.toThrow('Insufficient stock');
    expect(mockOrderProcessingRepository.markAsFailed).not.toHaveBeenCalled();
  });

  it('should throw retryable error if stock changes mid-transaction', async () => {
    mockOrderProcessingTx.findOrderByIdWithItems.mockResolvedValue({
      id: 'order-uuid',
      status: 'PENDING',
      orderItems: [{ productId: 'product-uuid', quantity: 2 }],
    });
    mockOrderProcessingTx.findProductsByIds.mockResolvedValue([
      { id: 'product-uuid', name: 'Laptop', price: 1500, stock: 5 },
    ]);
    mockOrderProcessingTx.decrementStockIfAvailable.mockResolvedValue(false);

    const job = makeJob();

    await expect(processor.process(job)).rejects.toThrow(
      'Stock changed mid-transaction',
    );
    expect(mockOrderProcessingRepository.markAsFailed).not.toHaveBeenCalled();
  });

  it('should confirm order and update stock and prices on success', async () => {
    mockOrderProcessingTx.findOrderByIdWithItems.mockResolvedValue({
      id: 'order-uuid',
      status: 'PENDING',
      orderItems: [{ productId: 'product-uuid', quantity: 2 }],
    });
    mockOrderProcessingTx.findProductsByIds.mockResolvedValue([
      { id: 'product-uuid', name: 'Laptop', price: 1500, stock: 10 },
    ]);
    mockOrderProcessingTx.decrementStockIfAvailable.mockResolvedValue(true);
    mockOrderProcessingTx.setOrderItemPrice.mockResolvedValue(undefined);
    mockOrderProcessingTx.confirmOrder.mockResolvedValue(undefined);

    const job = makeJob();
    await processor.process(job);

    expect(
      mockOrderProcessingTx.decrementStockIfAvailable,
    ).toHaveBeenCalledWith('product-uuid', 2);

    expect(mockOrderProcessingTx.setOrderItemPrice).toHaveBeenCalledWith(
      'order-uuid',
      'product-uuid',
      1500,
    );

    expect(mockOrderProcessingTx.confirmOrder).toHaveBeenCalledWith(
      'order-uuid',
      3000,
    );
  });
});
