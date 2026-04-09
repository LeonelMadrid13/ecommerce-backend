import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Job } from 'bullmq';

import { OrderProcessor } from './order.processor.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProcessOrderPayload } from '../queue/jobs/order.jobs.js';

type TxMock = {
  order: {
    findUnique: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    update: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  };
  product: {
    findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    updateMany: jest.Mock<(...args: unknown[]) => Promise<{ count: number }>>;
  };
  orderItem: {
    update: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  };
};

type PrismaMock = TxMock & {
  $transaction: jest.Mock<(cb: (tx: TxMock) => Promise<void>) => Promise<void>>;
};

const mockPrisma: PrismaMock = {
  $transaction: jest.fn(),
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  orderItem: {
    update: jest.fn(),
  },
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
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'PinoLogger:OrderProcessor', useValue: mockLogger },
      ],
    }).compile();

    processor = module.get<OrderProcessor>(OrderProcessor);

    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleProcessOrder', () => {
    it('should mark order as FAILED if order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      mockPrisma.order.update.mockResolvedValue({});

      const job = makeJob();
      await processor.process(job);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-uuid' },
        data: { status: 'FAILED' },
      });
    });

    it('should skip if order is not in PENDING status', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-uuid',
        status: 'CONFIRMED',
        orderItems: [],
      });

      const job = makeJob();
      await processor.process(job);

      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  it('should mark order as FAILED if products no longer exist', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-uuid',
      status: 'PENDING',
      orderItems: [{ productId: 'product-uuid', quantity: 2 }],
    });
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.order.update.mockResolvedValue({});

    const job = makeJob();
    await processor.process(job);

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-uuid' },
      data: { status: 'FAILED' },
    });
  });

  it('should throw retryable error if stock is insufficient', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-uuid',
      status: 'PENDING',
      orderItems: [{ productId: 'product-uuid', quantity: 10 }],
    });
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'product-uuid', name: 'Laptop', price: 1500, stock: 2 },
    ]);

    const job = makeJob();

    await expect(processor.process(job)).rejects.toThrow('Insufficient stock');
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('should throw retryable error if stock changes mid-transaction', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-uuid',
      status: 'PENDING',
      orderItems: [{ productId: 'product-uuid', quantity: 2 }],
    });
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'product-uuid', name: 'Laptop', price: 1500, stock: 5 },
    ]);
    mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });

    const job = makeJob();

    await expect(processor.process(job)).rejects.toThrow(
      'Stock changed mid-transaction',
    );
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('should confirm order and update stock and prices on success', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-uuid',
      status: 'PENDING',
      orderItems: [{ productId: 'product-uuid', quantity: 2 }],
    });
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'product-uuid', name: 'Laptop', price: 1500, stock: 10 },
    ]);
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.orderItem.update.mockResolvedValue({});
    mockPrisma.order.update.mockResolvedValue({});

    const job = makeJob();
    await processor.process(job);

    expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'product-uuid', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });

    expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
      where: {
        orderId_productId: { orderId: 'order-uuid', productId: 'product-uuid' },
      },
      data: { priceAtPurchase: 1500 },
    });

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-uuid' },
      data: { total: 3000, status: 'CONFIRMED' },
    });
  });
});
