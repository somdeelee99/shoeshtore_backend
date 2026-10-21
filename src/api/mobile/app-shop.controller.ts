import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddToCartDto, AddressDto, ToggleWishlistDto, UpdateCartItemDto } from '../../modules/shop/dto/shop.dto';
import { ShopService } from '../../modules/shop/shop.service';

@ApiTags('App / Cart, Wishlist & Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app')
export class AppShopController {
  constructor(private readonly shop: ShopService) {}

  @Get('cart')
  cart(@CurrentUser() user: AuthUser) {
    return this.shop.cart(user.id);
  }

  @Post('cart')
  addToCart(@CurrentUser() user: AuthUser, @Body() dto: AddToCartDto) {
    return this.shop.addToCart(user.id, dto);
  }

  @Patch('cart/:id')
  updateCart(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCartItemDto) {
    return this.shop.updateCartItem(user.id, id, dto.quantity);
  }

  @Delete('cart/:id')
  removeCart(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shop.removeCartItem(user.id, id);
  }

  @Delete('cart')
  clearCart(@CurrentUser() user: AuthUser) {
    return this.shop.clearCart(user.id);
  }

  @Get('wishlist')
  wishlist(@CurrentUser() user: AuthUser) {
    return this.shop.wishlist(user.id);
  }

  @Post('wishlist/toggle')
  toggleWishlist(@CurrentUser() user: AuthUser, @Body() dto: ToggleWishlistDto) {
    return this.shop.toggleWishlist(user.id, dto.productId);
  }

  @Get('addresses')
  addresses(@CurrentUser() user: AuthUser) {
    return this.shop.addresses(user.id);
  }

  @Post('addresses')
  createAddress(@CurrentUser() user: AuthUser, @Body() dto: AddressDto) {
    return this.shop.createAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  updateAddress(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddressDto) {
    return this.shop.updateAddress(user.id, id, dto);
  }

  @Delete('addresses/:id')
  removeAddress(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shop.removeAddress(user.id, id);
  }
}
