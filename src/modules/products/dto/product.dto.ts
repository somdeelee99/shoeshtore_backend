import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class VariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: '40' })
  @IsString()
  size: string;

  @ApiProperty({ example: 'ດຳ' })
  @IsString()
  color: string;

  @ApiPropertyOptional({ example: '#111827' })
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiProperty({ example: 2490000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 'SKU-NK-270-40-BLK' })
  @IsOptional()
  @IsString()
  sku?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Nike Air Max 270' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Nike' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2490000 })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 2990000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  comparePrice?: number;

  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DRAFT'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'DRAFT'])
  status?: 'ACTIVE' | 'DRAFT';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'ລາຍການ URL ຮູບພາບ' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ type: [VariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DRAFT'] })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsIn(['ACTIVE', 'DRAFT'])
  status?: 'ACTIVE' | 'DRAFT';

  @ApiPropertyOptional({ enum: ['newest', 'price-asc', 'price-desc', 'best-selling', 'rating'], default: 'newest' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'ໄຂ່ຂະໜາດ ເຊັ່ນ 40,41,42' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  sizes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  featured?: string;
}

export class ProductLookupDto {
  @ApiPropertyOptional({ description: 'ຮັບ product id ຫຼື slug' })
  @IsOptional()
  @IsString()
  key?: string;
}
