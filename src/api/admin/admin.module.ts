import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { CategoriesModule } from '../../modules/categories/categories.module';
import { CouponsModule } from '../../modules/coupons/coupons.module';
import { CustomersModule } from '../../modules/customers/customers.module';
import { InventoryModule } from '../../modules/inventory/inventory.module';
import { OrdersModule } from '../../modules/orders/orders.module';
import { ProductsModule } from '../../modules/products/products.module';
import { ReportsModule } from '../../modules/reports/reports.module';
import { SettingsModule } from '../../modules/settings/settings.module';
import { UploadsModule } from '../../modules/uploads/uploads.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminChatController } from './admin-chat.controller';
import { AdminCouponsController } from './admin-coupons.controller';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminSettingsController } from './admin-settings.controller';

/** Everything under /api/admin/* — consumed by the Nuxt admin website only. */
@Module({
  imports: [
    AuthModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    CustomersModule,
    InventoryModule,
    CouponsModule,
    ReportsModule,
    SettingsModule,
    UploadsModule,
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminProductsController,
    AdminCategoriesController,
    AdminOrdersController,
    AdminCustomersController,
    AdminInventoryController,
    AdminCouponsController,
    AdminChatController,
    AdminSettingsController,
  ],
})
export class AdminApiModule {}
