import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { QUEUES } from '../queue/queue.module.js';
import { ORDER_JOBS, ProcessOrderPayload } from '../queue/jobs/order.jobs.js';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.ORDERS) private readonly ordersQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const mergedItems = this.mergeItems(dto);

    if (mergedItems.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        total: 0,
        status: 'PENDING',
        orderItems: {
          createMany: {
            data: mergedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: 0,
            })),
          },
        },
      },
    });

    await this.ordersQueue.add(
      ORDER_JOBS.PROCESS,
      { orderId: order.id } satisfies ProcessOrderPayload,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { orderId: order.id, status: order.status };
  }

  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
    });
  }

  async findById(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private mergeItems(dto: CreateOrderDto) {
    return Object.values(
      dto.items.reduce(
        (acc, item) => {
          if (!acc[item.productId]) {
            acc[item.productId] = { ...item };
          } else {
            acc[item.productId].quantity += item.quantity;
          }
          return acc;
        },
        {} as Record<string, { productId: string; quantity: number }>,
      ),
    );
  }
}
