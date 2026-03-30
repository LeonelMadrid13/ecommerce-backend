import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { OrderService } from './order.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { IdempotencyGuard } from '../common/guards/idempotency.guard.js';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor.js';
import { Throttle } from '@nestjs/throttler';

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard, IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ global: { ttl: 60000, limit: 20 } })
  create(@Req() req, @Body() dto: CreateOrderDto) {
    const userId = req.user.id;
    return this.orderService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req) {
    const userId = req.user.id;
    return this.orderService.findAll(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOrderById(@Param('id') id: string, @Req() req) {
    const userId = req.user.id;
    return this.orderService.findById(userId, id);
  }
}
