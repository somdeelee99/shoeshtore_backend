import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { buildMeta, PaginationDto, skipOf } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationDto & { productId?: string; lowOnly?: string }) {
    const where: Prisma.ProductVariantWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.lowOnly === 'true' ? { stock: { lte: 5 } } : {}),
      ...(query.search
        ? {
            OR: [
              { sku: { contains: query.search, mode: 'insensitive' } },
              { product: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.productVariant.count({ where }),
      this.prisma.productVariant.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } } },
        },
        orderBy: { stock: 'asc' },
        skip: skipOf(query),
        take: Number(query.limit ?? 20),
      }),
    ]);
    return {
      data: items.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        stock: v.stock,
        price: v.price,
        product: { id: v.product.id, name: v.product.name, thumbnail: v.product.images[0]?.url ?? null },
        status: v.stock === 0 ? 'OUT_OF_STOCK' : v.stock <= 5 ? 'LOW_STOCK' : 'IN_STOCK',
      })),
      meta: buildMeta(total, query),
    };
  }

  async summary() {
    const [variants, logs] = await Promise.all([
      this.prisma.productVariant.aggregate({ _sum: { stock: true } }),
      this.prisma.inventoryLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { variant: { include: { product: { select: { name: true } } } }, user: { select: { name: true } } },
      }),
    ]);
    const [inStock, lowStock, outOfStock] = await Promise.all([
      this.prisma.productVariant.count({ where: { stock: { gt: 5 } } }),
      this.prisma.productVariant.count({ where: { stock: { gt: 0, lte: 5 } } }),
      this.prisma.productVariant.count({ where: { stock: 0 } }),
    ]);
    return { totalUnits: variants._sum.stock ?? 0, inStock, lowStock, outOfStock, recentLogs: logs };
  }

  async adjust(variantId: string, type: 'IN' | 'OUT' | 'ADJUST', quantity: number, note?: string, userId?: string) {
    if (quantity <= 0) throw new BadRequestException('ຈຳນວນຕ້ອງຫຼາຍກວ່າ 0');
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('ບໍ່ພົບຕົວແປສິນຄ້າ');

    const nextStock = type === 'IN' ? variant.stock + quantity : type === 'OUT' ? variant.stock - quantity : quantity;
    if (nextStock < 0) throw new BadRequestException('ສະຕັອກບໍ່ພຽງພໍສຳລັບການຕັດອອກ');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({ where: { id: variantId }, data: { stock: nextStock } });
      await tx.inventoryLog.create({
        data: { variantId, type, quantity, note: note ?? 'ປັບປຸງສະຕັອກດ້ວຍມື', userId },
      });
      return updated;
    });
  }

  async logs(query: PaginationDto & { variantId?: string }) {
    const where = query.variantId ? { variantId: query.variantId } : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.inventoryLog.count({ where }),
      this.prisma.inventoryLog.findMany({
        where,
        include: { variant: { include: { product: { select: { name: true } } } }, user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: skipOf(query),
        take: Number(query.limit ?? 20),
      }),
    ]);
    return { data: items, meta: buildMeta(total, query) };
  }
}
