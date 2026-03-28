import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
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
}
