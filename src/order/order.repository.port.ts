import type { Order, OrderItem } from '@prisma/client';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export type OrderCreateItemInput = {
  productId: string;
  quantity: number;
};

export type OrderWithItems = Order & { orderItems: OrderItem[] };

export interface OrderRepositoryPort {
  createPendingWithItems(
    userId: string,
    items: OrderCreateItemInput[],
  ): Promise<Order>;
  findAllByUser(userId: string): Promise<Order[]>;
  findByIdForUser(userId: string, id: string): Promise<OrderWithItems | null>;
}
