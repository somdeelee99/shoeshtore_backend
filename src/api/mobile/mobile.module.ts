import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { CategoriesModule } from '../../modules/categories/categories.module';
import { CouponsModule } from '../../modules/coupons/coupons.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { OrdersModule } from '../../modules/orders/orders.module';
import { ProductsModule } from '../../modules/products/products.module';
import { SettingsModule } from '../../modules/settings/settings.module';
import { ShopModule } from '../../modules/shop/shop.module';
import { AppAuthController } from './app-auth.controller';
import { AppCatalogController } from './app-catalog.controller';
import { AppExtrasController } from './app-extras.controller';
import { AppOrdersController } from './app-orders.controller';
import { AppShopController } from './app-shop.controller';

/** Everything under /api/app/* — consumed by the Flutter application only. */
@Module({
  imports: [
    AuthModule,
    ProductsModule,
    CategoriesModule,
    ShopModule,
    OrdersModule,
    CouponsModule,
    NotificationsModule,
    SettingsModule,
  ],
  controllers: [AppAuthController, AppCatalogController, AppShopController, AppOrdersController, AppExtrasController],
})
export class MobileApiModule {}
