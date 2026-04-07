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
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor.js';
import { IdempotencyGuard } from '../common/guards/idempotency.guard.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OrderService } from './order.service.js';
import { Throttle } from '@nestjs/throttler';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @ApiOperation({ summary: 'Create an order' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Throttle({ global: { ttl: 60000, limit: 20 } })
  create(@Req() req, @Body() dto: CreateOrderDto) {
    const userId = req.user.id;
    return this.orderService.create(userId, dto);
  }

  @ApiOperation({ summary: 'Get all orders for current user' })
  @ApiBearerAuth()
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req) {
    const userId = req.user.id;
    return this.orderService.findAll(userId);
  }

  @ApiOperation({ summary: 'Get order by ID' })
  @ApiBearerAuth()
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOrderById(@Param('id') id: string, @Req() req) {
    const userId = req.user.id;
    return this.orderService.findById(userId, id);
  }
}
