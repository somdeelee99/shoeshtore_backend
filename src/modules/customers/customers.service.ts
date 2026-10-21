import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { buildMeta, PaginationDto, skipOf } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationDto & { status?: string }) {
    const where: Prisma.UserWhereInput = {
      role: 'CUSTOMER',
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skipOf(query),
        take: Number(query.limit ?? 20),
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          status: true,
          provider: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
    ]);
    const spend = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: { customerId: { in: users.map((u) => u.id) }, status: 'DELIVERED' },
      _sum: { total: true },
    });
    return {
      data: users.map((u) => ({
        ...u,
        orderCount: u._count.orders,
        _count: undefined,
        totalSpent: Number(spend.find((s) => s.customerId === u.id)?._sum.total ?? 0),
      })),
      meta: buildMeta(total, query),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      include: {
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { items: true } },
      },
    });
    if (!user) throw new NotFoundException('ບໍ່ພົບລູກຄ້າ');
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async setStatus(id: string, status: 'ACTIVE' | 'BLOCKED') {
    await this.prisma.user.update({ where: { id }, data: { status } });
    return { message: status === 'ACTIVE' ? 'ປົດລະງັບບັນຊີແລ້ວ' : 'ລະງັບບັນຊີແລ້ວ' };
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'ລຶບລູກຄ້າສຳເລັດ' };
  }
}
