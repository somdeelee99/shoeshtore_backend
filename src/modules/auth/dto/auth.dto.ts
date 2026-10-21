import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MinLength, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@shoestore.com', description: 'Email ຫຼື ເບີໂທ' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(6, { message: 'ລະຫັດຜ່ານຢ່າງໜ້ອຍ 6 ໂຕອັກສອນ' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'ສົມໃຈ ວັນນະສິນ' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'customer@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '02055551234' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Customer@123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: ['LOCAL', 'GOOGLE', 'APPLE'], default: 'LOCAL' })
  @IsOptional()
  @IsIn(['LOCAL', 'GOOGLE', 'APPLE'])
  provider?: 'LOCAL' | 'GOOGLE' | 'APPLE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  socialToken?: string;
}

export class RequestOtpDto {
  @ApiProperty({ example: '02055551234' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '02055551234' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'OTP ຕ້ອງມີ 6 ໂຕ' })
  code: string;

  @ApiPropertyOptional({ example: 'ສົມໃຈ' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
