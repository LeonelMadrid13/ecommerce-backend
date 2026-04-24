import { Inject, Injectable } from '@nestjs/common';

import {
  DATABASE_CONNECTION,
  type DatabaseConnection,
} from '../../database/database.tokens.js';
import type {
  OrderCreateItemInput,
  OrderRepositoryPort,
} from '../order.repository.port.js';

@Injectable()
export class PrismaOrderRepository implements OrderRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DatabaseConnection,
  ) {}

  createPendingWithItems(userId: string, items: OrderCreateItemInput[]) {
    return this.db.order.create({
      data: {
        userId,
        total: 0,
        status: 'PENDING',
        orderItems: {
          createMany: {
            data: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtPurchase: 0,
            })),
          },
        },
      },
    });
  }

  findAllByUser(userId: string) {
    return this.db.order.findMany({
      where: { userId },
    });
  }

  findByIdForUser(userId: string, id: string) {
    return this.db.order.findFirst({
      where: { id, userId },
      include: { orderItems: true },
    });
  }
}
