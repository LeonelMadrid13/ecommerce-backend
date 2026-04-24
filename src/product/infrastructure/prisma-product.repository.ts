import { Inject, Injectable } from '@nestjs/common';

import {
  DATABASE_CONNECTION,
  type DatabaseConnection,
} from '../../database/database.tokens.js';
import type { CreateProductDto } from '../dto/create-product.dto.js';
import type { UpdateProductDto } from '../dto/update-product.dto.js';
import type {
  ProductRepositoryPort,
  ProductPublic,
} from '../product.repository.port.js';

@Injectable()
export class PrismaProductRepository implements ProductRepositoryPort {
  private readonly publicSelect = {
    id: true,
    name: true,
    price: true,
    stock: true,
  } as const;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DatabaseConnection,
  ) {}

  create(data: CreateProductDto) {
    return this.db.product.create({ data });
  }

  findMany(limit: number, offset: number) {
    return this.db.product.findMany({
      take: limit,
      skip: offset,
      select: this.publicSelect,
    });
  }

  findById(id: string): Promise<ProductPublic | null> {
    return this.db.product.findUnique({
      where: { id },
      select: this.publicSelect,
    });
  }

  async exists(id: string): Promise<boolean> {
    const product = await this.db.product.findUnique({ where: { id } });
    return Boolean(product);
  }

  update(id: string, data: UpdateProductDto) {
    return this.db.product.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.db.product.delete({
      where: { id },
    });
  }
}
