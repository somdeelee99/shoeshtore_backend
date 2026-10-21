import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AddToCartDto, AddressDto } from './dto/shop.dto';

const SHIPPING_FEES = { STANDARD: 30000, EXPRESS: 60000, SAME_DAY: 120000 };

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  /* ----------------------------------- home ---------------------------------- */

  async home() {
    const [categories, banners, featured, newArrivals, bestSellers, settings] = await Promise.all([
      this.prisma.category.findMany({
        where: { status: true },
        orderBy: { sortOrder: 'asc' },
        take: 8,
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.setting.findMany({ where: { key: { startsWith: 'banner' } } }),
      this.prisma.product.findMany({
        where: { status: 'ACTIVE', featured: true },
        take: 6,
        include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { soldCount: 'desc' },
        take: 8,
        include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.setting.findMany(),
    ]);

    const mapProduct = (p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      price: p.price,
      comparePrice: p.comparePrice,
      rating: p.rating,
      reviewCount: p.reviewCount,
      thumbnail: p.images[0]?.url ?? null,
      discount:
        p.comparePrice && Number(p.comparePrice) > Number(p.price)
          ? Math.round(((Number(p.comparePrice) - Number(p.price)) / Number(p.comparePrice)) * 100)
          : 0,
    });

    return {
      banners: banners.length
        ? banners.map((b) => ({ title: b.key, image: b.value }))
        : [
            { title: 'New Season', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200' },
            { title: 'Air Max Day', image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1200' },
          ],
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        productCount: c._count.products,
      })),
      featured: featured.map(mapProduct),
      newArrivals: newArrivals.map(mapProduct),
      bestSellers: bestSellers.map(mapProduct),
      storeName: settings.find((s) => s.key === 'storeName')?.value ?? 'ShoeStore',
      shippingFees: SHIPPING_FEES,
    };
  }

  /* ----------------------------------- cart ---------------------------------- */

  async cart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
        variant: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    const subtotal = items.reduce((s, i) => s + Number(i.variant?.price ?? i.product.price) * i.quantity, 0);
    return {
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        name: i.product.name,
        image: i.product.images[0]?.url ?? null,
        size: i.variant?.size ?? null,
        color: i.variant?.color ?? null,
        price: Number(i.variant?.price ?? i.product.price),
        stock: i.variant?.stock ?? 0,
        quantity: i.quantity,
        lineTotal: Number(i.variant?.price ?? i.product.price) * i.quantity,
      })),
      summary: { itemCount: items.reduce((s, i) => s + i.quantity, 0), subtotal, shippingFee: subtotal > 0 ? 30000 : 0, total: subtotal + (subtotal > 0 ? 30000 : 0) },
    };
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { variants: true },
    });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('ບໍ່ພົບສິນຄ້າ');
    const variant = dto.variantId
      ? product.variants.find((v) => v.id === dto.variantId)
      : product.variants[0];
    if (!variant) throw new BadRequestException('ກະລຸນາເລືອກຂະໜາດ/ສີ');
    if (variant.stock < dto.quantity) throw new BadRequestException('ສະຕັອກບໍ່ພຽງພໍ');

    await this.prisma.cartItem.upsert({
      where: { userId_productId_variantId: { userId, productId: dto.productId, variantId: variant.id } },
      update: { quantity: { increment: dto.quantity } },
      create: { userId, productId: dto.productId, variantId: variant.id, quantity: dto.quantity },
    });
    return this.cart(userId);
  }

  async updateCartItem(userId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, userId } });
    if (!item) throw new NotFoundException('ບໍ່ພົບລາຍການໃນກະຕ່າ');
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.cart(userId);
  }

  async removeCartItem(userId: string, itemId: string) {
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
    return this.cart(userId);
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { message: 'ລຶບກະຕ່າສຳເລັດ' };
  }

  /* --------------------------------- wishlist -------------------------------- */

  async wishlist(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.product.name,
      price: Number(i.product.price),
      comparePrice: Number(i.product.comparePrice ?? 0),
      rating: i.product.rating,
      thumbnail: i.product.images[0]?.url ?? null,
    }));
  }

  async toggleWishlist(userId: string, productId: string) {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { added: false };
    }
    await this.prisma.wishlistItem.create({ data: { userId, productId } });
    return { added: true };
  }

  /* --------------------------------- addresses ------------------------------- */

  async addresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: AddressDto) {
    if (dto.isDefault) await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    const count = await this.prisma.address.count({ where: { userId } });
    return this.prisma.address.create({ data: { ...dto, userId, isDefault: dto.isDefault ?? count === 0 } });
  }

  async updateAddress(userId: string, id: string, dto: Partial<AddressDto>) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('ບໍ່ພົບທີ່ຢູ່');
    if (dto.isDefault) await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async removeAddress(userId: string, id: string) {
    await this.prisma.address.deleteMany({ where: { id, userId } });
    return { message: 'ລຶບທີ່ຢູ່ສຳເລັດ' };
  }

  /* --------------------------------- checkout -------------------------------- */

  shippingOptions() {
    return [
      { id: 'STANDARD', name: 'Standard Delivery', eta: '3-5 ວັນ', fee: SHIPPING_FEES.STANDARD },
      { id: 'EXPRESS', name: 'Express Delivery', eta: '1-2 ວັນ', fee: SHIPPING_FEES.EXPRESS },
      { id: 'SAME_DAY', name: 'Same Day Delivery', eta: 'ພາຍໃນວັນ', fee: SHIPPING_FEES.SAME_DAY },
    ];
  }

  paymentMethods() {
    return [
      { id: 'COD', name: 'Cash on Delivery', icon: 'cash' },
      { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: 'bank' },
      { id: 'E_WALLET', name: 'E-Wallet (BCEL One, M-Money)', icon: 'wallet' },
      { id: 'CREDIT_CARD', name: 'Credit / Debit Card (VISA)', icon: 'card' },
    ];
  }
}
