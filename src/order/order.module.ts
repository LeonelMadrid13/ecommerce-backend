import { Module } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';

@Module({
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrderModule {}
