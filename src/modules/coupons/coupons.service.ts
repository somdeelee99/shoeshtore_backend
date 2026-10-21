import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { buildMeta, PaginationDto, skipOf } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface CouponInput {
  code: string;
  name: string;
  type?: 'PERCENT' | 'FIXED';
  value: number;
  minSpend?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  startAt: string | Date;
  endAt: string | Date;
  status?: boolean;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationDto & { status?: string }) {
    const where: Prisma.CouponWhereInput = {
      ...(query.status === 'active' ? { status: true, endAt: { gt: new Date() } } : {}),
      ...(query.status === 'expired' ? { endAt: { lte: new Date() } } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search, mode: 'insensitive' } }, { name: { contains: query.search, mode: 'insensitive' } }] } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skipOf(query),
        take: Number(query.limit ?? 20),
      }),
    ]);
    return { data: items, meta: buildMeta(total, query) };
  }

  create(input: CouponInput) {
    return this.prisma.coupon.create({
      data: {
        ...input,
        code: input.code.toUpperCase(),
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
      },
    });
  }

  async update(id: string, input: Partial<CouponInput>) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('ບໍ່ພົບຄູປອງ');
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...input,
        ...(input.code ? { code: input.code.toUpperCase() } : {}),
        ...(input.startAt ? { startAt: new Date(input.startAt) } : {}),
        ...(input.endAt ? { endAt: new Date(input.endAt) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'ລຶບຄູປອງສຳເລັດ' };
  }

  async availableForCustomer() {
    return this.prisma.coupon.findMany({
      where: { status: true, startAt: { lte: new Date() }, endAt: { gte: new Date() } },
      orderBy: { endAt: 'asc' },
    });
  }

  async validate(code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.status) throw new BadRequestException('ຄູປອງບໍ່ຖືກຕ້ອງ');
    if (new Date() > coupon.endAt) throw new BadRequestException('ຄູປອງໝົດອາຍຸແລ້ວ');
    if (Number(coupon.minSpend) > subtotal) throw new BadRequestException('ຍອດຊື້ຍັງບໍ່ຮອດຂັ້ນຕ່ຳ');
    const discount =
      coupon.type === 'PERCENT'
        ? Math.min((subtotal * Number(coupon.value)) / 100, Number(coupon.maxDiscount ?? Infinity))
        : Number(coupon.value);
    return { coupon, discount: Math.min(discount, subtotal) };
  }
}
