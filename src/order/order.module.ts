import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { QUEUES } from '../queue/queue.module.js';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { OrderProcessor } from './order.processor.js';
import { IdempotencyGuard } from '../common/guards/idempotency.guard.js';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor.js';
import { PrismaOrderRepository } from './infrastructure/prisma-order.repository.js';
import { PrismaOrderProcessingRepository } from './infrastructure/prisma-order-processing.repository.js';
import { ORDER_REPOSITORY } from './order.repository.port.js';
import { ORDER_PROCESSING_REPOSITORY } from './order-processing.repository.port.js';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    BullModule.registerQueue({ name: QUEUES.ORDERS }),
  ],
  providers: [
    OrderService,
    PrismaOrderRepository,
    PrismaOrderProcessingRepository,
    {
      provide: ORDER_REPOSITORY,
      useClass: PrismaOrderRepository,
    },
    {
      provide: ORDER_PROCESSING_REPOSITORY,
      useClass: PrismaOrderProcessingRepository,
    },
    OrderProcessor,
    IdempotencyGuard,
    IdempotencyInterceptor,
  ],
  controllers: [OrderController],
})
export class OrderModule {}
