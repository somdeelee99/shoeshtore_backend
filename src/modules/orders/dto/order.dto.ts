import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED', 'CANCELLED'] as const;
export const PAYMENT_METHODS = ['COD', 'BANK_TRANSFER', 'E_WALLET', 'CREDIT_CARD'] as const;
export const SHIPPING_METHODS = ['STANDARD', 'EXPRESS', 'SAME_DAY'] as const;

export class OrderItemInputDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: '42' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: 'ດຳ' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiPropertyOptional({ description: 'ID ທີ່ຢູ່ທີ່ບັນທຶກໄວ້ (ຖ້າມີ)' })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() recipient?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shippingAddress?: string;

  @ApiProperty({ enum: PAYMENT_METHODS, default: 'COD' })
  @IsIn(PAYMENT_METHODS as unknown as string[])
  paymentMethod: (typeof PAYMENT_METHODS)[number];

  @ApiProperty({ enum: SHIPPING_METHODS, default: 'STANDARD' })
  @IsIn(SHIPPING_METHODS as unknown as string[])
  shippingMethod: (typeof SHIPPING_METHODS)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class OrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsIn(ORDER_STATUSES as unknown as string[])
  status?: (typeof ORDER_STATUSES)[number];

  @ApiPropertyOptional({ enum: ['UNPAID', 'PAID', 'REFUNDED'] })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  to?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES })
  @IsIn(ORDER_STATUSES as unknown as string[])
  status: (typeof ORDER_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: ['UNPAID', 'PAID', 'REFUNDED'] })
  @IsIn(['UNPAID', 'PAID', 'REFUNDED'])
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
}

export class UpdateTrackingDto {
  @ApiProperty({ example: 'LA123456789' })
  @IsString()
  trackingNumber: string;
}
