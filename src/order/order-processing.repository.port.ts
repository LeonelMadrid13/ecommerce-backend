import type { Order, OrderItem, Product } from '@prisma/client';

export const ORDER_PROCESSING_REPOSITORY = Symbol(
  'ORDER_PROCESSING_REPOSITORY',
);

export type OrderForProcessing = Order & { orderItems: OrderItem[] };

export type ProductForProcessing = Pick<
  Product,
  'id' | 'name' | 'price' | 'stock'
>;

export interface OrderProcessingTransactionPort {
  findOrderByIdWithItems(orderId: string): Promise<OrderForProcessing | null>;
  findProductsByIds(productIds: string[]): Promise<ProductForProcessing[]>;
  decrementStockIfAvailable(
    productId: string,
    quantity: number,
  ): Promise<boolean>;
  setOrderItemPrice(
    orderId: string,
    productId: string,
    priceAtPurchase: number,
  ): Promise<void>;
  confirmOrder(orderId: string, total: number): Promise<void>;
}

export interface OrderProcessingRepositoryPort {
  withTransaction<T>(
    work: (tx: OrderProcessingTransactionPort) => Promise<T>,
  ): Promise<T>;
  markAsFailed(orderId: string): Promise<void>;
}
