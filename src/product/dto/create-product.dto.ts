import { IsString, IsNumber, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Gaming laptop 16GB RAM' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1500, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  stock: number;
}
