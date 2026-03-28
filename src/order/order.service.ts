import { BadRequestException, Injectable, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get all products
      const productIds = dto.items.map((item) => item.productId);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      // 2. Validate all products exist
      if (products.length !== productIds.length) {
        throw new BadRequestException('Some products do not exist');
      }

      // 3. Validate stock + calculate total
      let total = 0;

      for (const item of dto.items) {
        const product = products.find((p) => p.id === item.productId);

        if (!product) continue;

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}`,
          );
        }

        total += product.price * item.quantity;
      }

      // 4. Create order
      const order = await tx.order.create({
        data: {
          userId,
          total,
        },
      });

      // 5. Create order items
      for (const item of dto.items) {
        const product = products.find((p) => p.id === item.productId);

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: product!.price,
          },
        });

        // 6. Update stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return order;
    });
  }

  @Get()
  async findAll(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
    });
  }
}
