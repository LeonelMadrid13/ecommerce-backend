import { CreateProductDto } from './create-product.dto.js';
import { PartialType } from '@nestjs/swagger';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
