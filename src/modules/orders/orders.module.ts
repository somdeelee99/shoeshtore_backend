import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersService } from './orders.service';

@Module({
  imports: [NotificationsModule],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
