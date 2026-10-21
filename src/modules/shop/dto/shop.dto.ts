import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class ToggleWishlistDto {
  @ApiProperty()
  @IsString()
  productId: string;
}

export class AddressDto {
  @ApiPropertyOptional({ example: 'ເຮືອນ' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: 'ສົມໃຈ ວັນນະສິນ' })
  @IsString()
  recipient: string;

  @ApiProperty({ example: '020 5555 1234' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'ນະຄອນຫຼວງວຽງຈັນ' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'ຈັນທະບູລີ' })
  @IsString()
  district: string;

  @ApiPropertyOptional({ example: 'ບ້ານ ສີສະຫວາດ' })
  @IsOptional()
  @IsString()
  village?: string;

  @ApiProperty({ example: 'ບ້ານສີສະຫວາດ, ຖະໜົນລ້ານຊ້າງ' })
  @IsString()
  detail: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  code: string;

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  subtotal: number;
}
