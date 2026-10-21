import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { buildMeta, PaginationDto, skipOf } from '../../common/dto/pagination.dto';
import { slugify } from '../../common/utils/helpers';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProductDto, ProductQueryDto, UpdateProductDto, VariantDto } from './dto/product.dto';

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { orderBy: [{ size: 'asc' as const }, { color: 'asc' as const }] },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------- admin --------------------------------- */

  async adminList(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brand ? { brand: query.brand } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price'
        ? { price: query.order ?? 'desc' }
        : query.sort === 'name'
          ? { name: query.order ?? 'asc' }
          : { createdAt: query.order ?? 'desc' };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          variants: true,
        },
        orderBy,
        skip: skipOf(query),
        take: Number(query.limit ?? 20),
      }),
    ]);

    return {
      data: items.map((p) => ({
        ...p,
        thumbnail: p.images[0]?.url ?? null,
        stock: p.variants.reduce((s, v) => s + v.stock, 0),
      })),
      meta: buildMeta(total, query),
    };
  }

  async adminFindOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw new NotFoundException('ບໍ່ພົບສິນຄ້າ');
    return product;
  }

  async create(dto: CreateProductDto, userId?: string) {
    const { images = [], variants = [], ...rest } = dto;
    const slug = await this.uniqueSlug(dto.name);
    const sku = dto.sku?.trim() || `SKU-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...rest,
          slug,
          sku,
          images: { create: images.map((url, i) => ({ url, sortOrder: i })) },
          variants: {
            create: variants.map((v, i) => ({
              size: v.size,
              color: v.color,
              colorHex: v.colorHex,
              price: v.price,
              stock: v.stock,
              sku: v.sku?.trim() || `${sku}-${v.size}-${i + 1}`,
            })),
          },
        },
        include: productInclude,
      });

      if (variants.length && userId) {
        await tx.inventoryLog.createMany({
          data: product.variants.map((v) => ({
            variantId: v.id,
            type: 'IN' as const,
            quantity: v.stock,
            note: 'ສ້າງສິນຄ້າໃໝ່',
            userId,
          })),
        });
      }
      return product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.adminFindOne(id);
    const { images, variants, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...rest,
          ...(dto.name ? { slug: await this.uniqueSlug(dto.name, id) } : {}),
        },
      });

      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({ data: images.map((url, i) => ({ productId: id, url, sortOrder: i })) });
      }

      if (variants) {
        const keepIds: string[] = [];
        for (const v of variants as VariantDto[]) {
          if (v.id && current.variants.some((x) => x.id === v.id)) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: { size: v.size, color: v.color, colorHex: v.colorHex, price: v.price, stock: v.stock },
            });
            keepIds.push(v.id);
          } else {
            const created = await tx.productVariant.create({
              data: {
                productId: id,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                price: v.price,
                stock: v.stock,
                sku: v.sku?.trim() || `${current.sku}-${v.size}-${Date.now().toString().slice(-4)}`,
              },
            });
            keepIds.push(created.id);
          }
        }
        await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: keepIds } } });
      }

      return tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
    });
  }

  async remove(id: string) {
    await this.adminFindOne(id);
    const used = await this.prisma.orderItem.count({ where: { productId: id } });
    if (used > 0) {
      // keep history intact: archive instead of hard delete
      await this.prisma.product.update({ where: { id }, data: { status: 'DRAFT' } });
      return { message: 'ສິນຄ້ານີ້ມີໃນປະຫວັດການສັ່ງຊື້ ຈຶ່ງຖືກປ່ຽນເປັນສະຖານະ ຮ່າງ' };
    }
    await this.prisma.product.delete({ where: { id } });
    return { message: 'ລຶບສິນຄ້າສຳເລັດ' };
  }

  /* --------------------------------- mobile --------------------------------- */

  async mobileList(query: ProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brand ? { brand: { in: query.brand.split(',') } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { brand: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.featured === 'true' ? { featured: true } : {}),
      ...(query.minPrice || query.maxPrice
        ? { price: { gte: query.minPrice ?? 0, lte: query.maxPrice ?? 999999999 } }
        : {}),
      ...(query.sizes ? { variants: { some: { size: { in: query.sizes.split(',') } } } } : {}),
    };

    const orderByMap: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      newest: { createdAt: 'desc' },
      'price-asc': { price: 'asc' },
      'price-desc': { price: 'desc' },
      'best-selling': { soldCount: 'desc' },
      rating: { rating: 'desc' },
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          variants: { select: { size: true, stock: true } },
        },
        orderBy: orderByMap[query.sortBy ?? 'newest'] ?? orderByMap.newest,
        skip: skipOf(query),
        take: Number(query.limit ?? 20),
      }),
    ]);

    return {
      data: items.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        brand: p.brand,
        price: p.price,
        comparePrice: p.comparePrice,
        rating: p.rating,
        reviewCount: p.reviewCount,
        soldCount: p.soldCount,
        category: p.category,
        thumbnail: p.images[0]?.url ?? null,
        inStock: p.variants.some((v) => v.stock > 0),
        sizes: [...new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size))],
      })),
      meta: buildMeta(total, query),
    };
  }

  async mobileFindOne(key: string) {
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: key }, { slug: key }], status: 'ACTIVE' },
      include: {
        ...productInclude,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
    if (!product) throw new NotFoundException('ບໍ່ພົບສິນຄ້າ');
    return {
      ...product,
      imageUrls: product.images.map((i) => i.url),
      sizes: [...new Set(product.variants.map((v) => v.size))],
      colors: [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()].map(([name, hex]) => ({
        name,
        hex,
      })),
      inStock: product.variants.some((v) => v.stock > 0),
      reviewBreakdown: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: product.reviews.filter((r) => r.rating === star).length,
      })),
    };
  }

  async brands() {
    const rows = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', brand: { not: null } },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    });
    return rows.map((r) => r.brand).filter(Boolean);
  }

  async related(key: string, limit = 6) {
    const product = await this.prisma.product.findFirst({ where: { OR: [{ id: key }, { slug: key }] } });
    if (!product) return [];
    const items = await this.prisma.product.findMany({
      where: { status: 'ACTIVE', categoryId: product.categoryId, id: { not: product.id } },
      take: Number(limit),
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
    });
    return items.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      comparePrice: p.comparePrice,
      rating: p.rating,
      thumbnail: p.images[0]?.url ?? null,
    }));
  }

  /** Customer review + product rating recalculation. */
  async addReview(productId: string, userId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException('ຄະແນນຕ້ອງ 1-5');
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('ບໍ່ພົບສິນຄ້າ');

    await this.prisma.review.create({ data: { productId, userId, rating, comment } });
    const agg = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count.rating },
    });
    return { message: 'ຂອບໃຈສຳລັບການໃຫ້ຄະແນນ' };
  }

  async bestSellers(limit = 8) {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { soldCount: 'desc' },
      take: Number(limit),
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async lowStock(threshold = 5) {
    const variants = await this.prisma.productVariant.findMany({
      where: { stock: { lte: Number(threshold) } },
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { stock: 'asc' },
      take: 50,
    });
    return variants;
  }

  private async uniqueSlug(name: string, ignoreId?: string) {
    const base = slugify(name) || `product-${Date.now()}`;
    let slug = base;
    let i = 1;
    while (await this.prisma.product.findFirst({ where: { slug, NOT: ignoreId ? { id: ignoreId } : undefined } })) {
      slug = `${base}-${++i}`;
    }
    return slug;
  }
}
