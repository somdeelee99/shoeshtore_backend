import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CategoriesService } from '../../modules/categories/categories.service';
import { CouponsService } from '../../modules/coupons/coupons.service';
import { ProductQueryDto } from '../../modules/products/dto/product.dto';
import { ProductsService } from '../../modules/products/products.service';
import { SettingsService } from '../../modules/settings/settings.service';
import { ShopService } from '../../modules/shop/shop.service';
import { ValidateCouponDto } from '../../modules/shop/dto/shop.dto';

class ReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

@ApiTags('App / Catalog')
@Controller('app')
export class AppCatalogController {
  constructor(
    private readonly products: ProductsService,
    private readonly categories: CategoriesService,
    private readonly shop: ShopService,
    private readonly coupons: CouponsService,
    private readonly settings: SettingsService,
  ) {}

  @Public()
  @Get('home')
  home() {
    return this.shop.home();
  }

  @Public()
  @Get('config')
  config() {
    return this.settings.publicConfig();
  }

  @Public()
  @Get('categories')
  categoriesList() {
    return this.categories.listAll(true);
  }

  @Public()
  @Get('products')
  productList(@Query() query: ProductQueryDto) {
    return this.products.mobileList(query);
  }

  @Public()
  @Get('products/brands')
  brands() {
    return this.products.brands();
  }

  @Public()
  @Get('products/best-sellers')
  bestSellers(@Query('limit') limit?: string) {
    return this.products.bestSellers(Number(limit ?? 8));
  }

  @Public()
  @Get('products/:key')
  productDetail(@Param('key') key: string) {
    return this.products.mobileFindOne(key);
  }

  @Public()
  @Get('products/:key/related')
  related(@Param('key') key: string, @Query('limit') limit?: string) {
    return this.products.related(key, Number(limit ?? 6));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('products/:id/reviews')
  review(@Param('id') id: string, @Body() dto: ReviewDto, @CurrentUser() user: AuthUser) {
    return this.products.addReview(id, user.id, dto.rating, dto.comment);
  }

  @Public()
  @Get('checkout/options')
  checkoutOptions() {
    return { shipping: this.shop.shippingOptions(), payments: this.shop.paymentMethods() };
  }

  @Public()
  @Get('coupons')
  availableCoupons() {
    return this.coupons.availableForCustomer();
  }

  @Public()
  @Post('coupons/validate')
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.coupons.validate(dto.code, dto.subtotal);
  }
}
