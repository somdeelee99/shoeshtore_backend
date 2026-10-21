import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateOrderDto, OrderQueryDto } from '../../modules/orders/dto/order.dto';
import { OrdersService } from '../../modules/orders/orders.service';

@ApiTags('App / Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app/orders')
export class AppOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  @Get()
  myOrders(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) {
    return this.orders.myOrders(user.id, query);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.myOrderDetail(user.id, id);
  }

  @Get(':id/tracking')
  tracking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.tracking(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.cancelByCustomer(user.id, id);
  }

  @Post(':id/confirm-received')
  confirmReceived(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.confirmReceived(user.id, id);
  }
}
