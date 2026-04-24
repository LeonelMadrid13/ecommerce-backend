import { Module } from '@nestjs/common';

import { ProductService } from './product.service.js';
import { ProductController } from './product.controller.js';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository.js';
import { PRODUCT_REPOSITORY } from './product.repository.port.js';

@Module({
  providers: [
    ProductService,
    PrismaProductRepository,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
  controllers: [ProductController],
})
export class ProductModule {}
