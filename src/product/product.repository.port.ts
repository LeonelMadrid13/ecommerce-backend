import type { Product } from '@prisma/client';

import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export type ProductPublic = Pick<Product, 'id' | 'name' | 'price' | 'stock'>;

export interface ProductRepositoryPort {
  create(data: CreateProductDto): Promise<Product>;
  findMany(limit: number, offset: number): Promise<ProductPublic[]>;
  findById(id: string): Promise<ProductPublic | null>;
  exists(id: string): Promise<boolean>;
  update(id: string, data: UpdateProductDto): Promise<Product>;
  remove(id: string): Promise<Product>;
}
