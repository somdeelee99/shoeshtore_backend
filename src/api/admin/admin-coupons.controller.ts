import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CouponInput, CouponsService } from '../../modules/coupons/coupons.service';

@ApiTags('Admin / Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  list(@Query() query: PaginationDto & { status?: string }) {
    return this.coupons.list(query);
  }

  @Post()
  create(@Body() body: CouponInput) {
    return this.coupons.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<CouponInput>) {
    return this.coupons.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coupons.remove(id);
  }
}
