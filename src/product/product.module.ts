import { Module } from '@nestjs/common';
import { ProductService } from './product.service.js';
import { ProductController } from './product.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [ProductService, RolesGuard],
  controllers: [ProductController],
})
export class ProductModule {}
