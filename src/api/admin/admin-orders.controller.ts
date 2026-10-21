import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  OrderQueryDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UpdateTrackingDto,
} from '../../modules/orders/dto/order.dto';
import { OrdersService } from '../../modules/orders/orders.service';

@ApiTags('Admin / Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: OrderQueryDto) {
    return this.orders.adminList(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.orders.adminFindOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @CurrentUser() user: AuthUser) {
    return this.orders.updateStatus(id, dto, user.id);
  }

  @Patch(':id/payment')
  updatePayment(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.orders.updatePaymentStatus(id, dto.paymentStatus);
  }

  @Patch(':id/tracking')
  updateTracking(@Param('id') id: string, @Body() dto: UpdateTrackingDto) {
    return this.orders.updateTracking(id, dto.trackingNumber);
  }
}
