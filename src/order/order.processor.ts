import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Job } from 'bullmq';

import { QUEUES } from '../queue/queue.module.js';
import { ORDER_JOBS, ProcessOrderPayload } from '../queue/jobs/order.jobs.js';
import {
  ORDER_PROCESSING_REPOSITORY,
  type OrderProcessingRepositoryPort,
} from './order-processing.repository.port.js';

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

@Processor(QUEUES.ORDERS)
export class OrderProcessor extends WorkerHost {
  constructor(
    @Inject(ORDER_PROCESSING_REPOSITORY)
    private readonly orderProcessingRepository: OrderProcessingRepositoryPort,
    @InjectPinoLogger(OrderProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<ProcessOrderPayload>): Promise<void> {
    if (job.name === ORDER_JOBS.PROCESS) {
      await this.handleProcessOrder(job);
    }
  }

  private async handleProcessOrder(
    job: Job<ProcessOrderPayload>,
  ): Promise<void> {
    const { orderId } = job.data;

    this.logger.info(
      { orderId, attempt: job.attemptsMade + 1 },
      'Processing order',
    );

    try {
      await this.orderProcessingRepository.withTransaction(async (tx) => {
        const order = await tx.findOrderByIdWithItems(orderId);

        if (!order) {
          throw new NonRetryableError(`Order ${orderId} not found`);
        }

        if (order.status !== 'PENDING') {
          this.logger.warn(
            { orderId, status: order.status },
            'Order already processed, skipping',
          );
          return;
        }

        const productIds = order.orderItems.map((i) => i.productId);

        const products = await tx.findProductsByIds(productIds);

        const foundIds = new Set(products.map((p) => p.id));
        const missing = productIds.filter((id) => !foundIds.has(id));

        if (missing.length > 0) {
          throw new NonRetryableError(
            `Products no longer exist: ${missing.join(', ')}`,
          );
        }

        const productMap = new Map(products.map((p) => [p.id, p]));

        let total = 0;

        for (const item of order.orderItems) {
          const product = productMap.get(item.productId)!;

          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product "${product.name}"`);
          }

          total += product.price * item.quantity;
        }

        for (const item of order.orderItems) {
          const updated = await tx.decrementStockIfAvailable(
            item.productId,
            item.quantity,
          );

          if (!updated) {
            throw new Error(
              `Stock changed mid-transaction for product ${item.productId}`,
            );
          }
        }

        for (const item of order.orderItems) {
          const product = productMap.get(item.productId)!;

          await tx.setOrderItemPrice(order.id, item.productId, product.price);
        }

        await tx.confirmOrder(orderId, total);
      });

      this.logger.info({ orderId }, 'Order confirmed');
    } catch (err) {
      const isNonRetryable = err instanceof NonRetryableError;
      const exhausted = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      if (isNonRetryable || exhausted) {
        await this.orderProcessingRepository.markAsFailed(orderId);

        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error({ orderId, errMessage }, 'Order failed permanently');

        return;
      }

      this.logger.warn(
        { orderId, attempt: job.attemptsMade + 1 },
        'Order attempt failed, retrying',
      );

      throw err;
    }
  }
}
