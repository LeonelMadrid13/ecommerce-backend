import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  DATABASE_CONNECTION,
  type DatabaseConnection,
} from '../../database/database.tokens.js';
import type {
  OrderProcessingRepositoryPort,
  OrderProcessingTransactionPort,
} from '../order-processing.repository.port.js';

class PrismaOrderProcessingTransaction implements OrderProcessingTransactionPort {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  findOrderByIdWithItems(orderId: string) {
    return this.tx.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
  }

  findProductsByIds(productIds: string[]) {
    return this.tx.product.findMany({
      where: { id: { in: productIds } },
    });
  }

  async decrementStockIfAvailable(productId: string, quantity: number) {
    const updated = await this.tx.product.updateMany({
      where: {
        id: productId,
        stock: { gte: quantity },
      },
      data: { stock: { decrement: quantity } },
    });

    return updated.count > 0;
  }

  async setOrderItemPrice(
    orderId: string,
    productId: string,
    priceAtPurchase: number,
  ) {
    await this.tx.orderItem.update({
      where: {
        orderId_productId: {
          orderId,
          productId,
        },
      },
      data: { priceAtPurchase },
    });
  }

  async confirmOrder(orderId: string, total: number) {
    await this.tx.order.update({
      where: { id: orderId },
      data: { total, status: 'CONFIRMED' },
    });
  }
}

@Injectable()
export class PrismaOrderProcessingRepository implements OrderProcessingRepositoryPort {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DatabaseConnection,
  ) {}

  withTransaction<T>(work: (tx: OrderProcessingTransactionPort) => Promise<T>) {
    return this.db.$transaction((tx) =>
      work(new PrismaOrderProcessingTransaction(tx)),
    );
  }

  async markAsFailed(orderId: string) {
    await this.db.order.update({
      where: { id: orderId },
      data: { status: 'FAILED' },
    });
  }
}
