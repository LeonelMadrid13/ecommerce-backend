import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import {
  PRODUCT_REPOSITORY,
  type ProductRepositoryPort,
} from './product.repository.port.js';

@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepositoryPort,
  ) {}

  create(data: CreateProductDto) {
    if (data.price <= 0) {
      throw new BadRequestException('Price must be greater than 0');
    }
    return this.productRepository.create(data);
  }

  findAll(limit = 10, offset = 0) {
    return this.productRepository.findMany(limit, offset);
  }

  async findOne(id: string) {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, data: UpdateProductDto) {
    if (data.price !== undefined && data.price <= 0) {
      throw new BadRequestException('Price must be greater than 0');
    }

    const exists = await this.productRepository.exists(id);

    if (!exists) {
      throw new NotFoundException('Product not found');
    }

    return this.productRepository.update(id, data);
  }

  async remove(id: string) {
    const exists = await this.productRepository.exists(id);

    if (!exists) {
      throw new NotFoundException('Product not found');
    }

    return this.productRepository.remove(id);
  }
}
