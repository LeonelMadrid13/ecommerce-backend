import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Job } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUES } from '../queue/queue.module.js';
import { ORDER_JOBS, ProcessOrderPayload } from '../queue/jobs/order.jobs.js';

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

@Processor(QUEUES.ORDERS)
export class OrderProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
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
      await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { orderItems: true },
        });

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

        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

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
          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });

          if (updated.count === 0) {
            throw new Error(
              `Stock changed mid-transaction for product ${item.productId}`,
            );
          }
        }

        for (const item of order.orderItems) {
          const product = productMap.get(item.productId)!;

          await tx.orderItem.update({
            where: {
              orderId_productId: {
                orderId: order.id,
                productId: item.productId,
              },
            },
            data: { priceAtPurchase: product.price },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: { total, status: 'CONFIRMED' },
        });
      });

      this.logger.info({ orderId }, 'Order confirmed');
    } catch (err) {
      const isNonRetryable = err instanceof NonRetryableError;
      const exhausted = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      if (isNonRetryable || exhausted) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'FAILED' },
        });

        this.logger.error({ orderId, err }, 'Order failed permanently');

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
