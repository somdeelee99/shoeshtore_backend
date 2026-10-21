import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ShippingMethod } from '../../generated/prisma/client';
import { buildMeta, skipOf } from '../../common/dto/pagination.dto';
import { dateRange, orderCode } from '../../common/utils/helpers';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';

const SHIPPING_FEES: Record<ShippingMethod, number> = {
  STANDARD: 30000,
  EXPRESS: 60000,
  SAME_DAY: 120000,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'ລໍຖ້າຢືນຢັນ',
  CONFIRMED: 'ຢືນຢັນແລ້ວ',
  PACKING: 'ກຳລັງກຽມສົ່ງ',
  SHIPPING: 'ກຳລັງຂົນສົ່ງ',
  DELIVERED: 'ສຳເລັດ',
  CANCELLED: 'ຍົກເລີກ',
};

const orderInclude = {
  customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
  items: true,
  history: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ---------------------------------- admin --------------------------------- */

  async adminList(query: OrderQueryDto) {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus as any } : {}),
      ...(query.from || query.to ? { createdAt: { gte: dateRange(query).from, lte: dateRange(query).to } } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { recipient: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items, counts] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          items: { take: 3 },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: skipOf(query),
        take: Number(query.limit ?? 20),
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
    ]);

    return {
      data: items.map((o) => ({ ...o, itemCount: o._count.items, _count: undefined })),
      meta: {
        ...buildMeta(total, query),
        statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      },
    };
  }

  async adminFindOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('ບໍ່ພົບຄຳສັ່ງຊື້');
    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, actorId?: string) {
    const order = await this.adminFindOne(id);
    if (order.status === 'CANCELLED' && dto.status !== 'CANCELLED') {
      throw new BadRequestException('ຄຳສັ່ງຊື້ທີ່ຍົກເລີກແລ້ວ ບໍ່ສາມາດປ່ຽນສະຖານະໄດ້');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: dto.status,
          ...(dto.status === 'DELIVERED' ? { paymentStatus: order.paymentMethod === 'COD' ? 'PAID' : order.paymentStatus } : {}),
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: dto.status, note: dto.note ?? `ປ່ຽນສະຖານະໂດຍຜູ້ດູແລ` },
      });

      if (dto.status === 'CANCELLED') {
        // restore stock
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.inventoryLog.create({
            data: {
              variantId: item.variantId,
              type: 'IN',
              quantity: item.quantity,
              note: `ຄືນສະຕັອກ ເນື່ອງຈາກຍົກເລີກ ${order.code}`,
              userId: actorId,
            },
          });
        }
      }

      if (dto.status === 'DELIVERED') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { soldCount: { increment: item.quantity } },
          });
        }
      }
      return updated;
    });
  }

  async updatePaymentStatus(id: string, status: 'UNPAID' | 'PAID' | 'REFUNDED') {
    const order = await this.adminFindOne(id);
    const updated = await this.prisma.order.update({ where: { id: order.id }, data: { paymentStatus: status } });
    await this.prisma.orderStatusHistory.create({
      data: { orderId: order.id, status: order.status, note: `ປັບປຸງການຊຳລະເງິນ: ${status}` },
    });
    return updated;
  }

  async updateTracking(id: string, trackingNumber: string) {
    const order = await this.adminFindOne(id);
    return this.prisma.order.update({ where: { id: order.id }, data: { trackingNumber } });
  }

  /* --------------------------------- mobile --------------------------------- */

  async create(customerId: string, dto: CreateOrderDto) {
    const address = dto.addressId
      ? await this.prisma.address.findFirst({ where: { id: dto.addressId, userId: customerId } })
      : null;

    if (dto.addressId && !address) throw new BadRequestException('ບໍ່ພົບທີ່ຢູ່ຈັດສົ່ງ');
    const recipient = dto.recipient ?? address?.recipient;
    const phone = dto.phone ?? address?.phone;
    const shippingAddress =
      dto.shippingAddress ??
      (address ? `${address.detail}, ${address.village ?? ''} ${address.district}, ${address.province}` : undefined);
    if (!recipient || !phone || !shippingAddress) {
      throw new BadRequestException('ກະລຸນາໃສ່ຂໍ້ມູນຜູ້ຮັບ ແລະ ທີ່ຢູ່ຈັດສົ່ງ');
    }

    return this.prisma.$transaction(async (tx) => {
      const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      let subtotal = 0;
      const stockUpdates: { variantId: string; quantity: number }[] = [];

      for (const line of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          include: { images: { take: 1, orderBy: { sortOrder: 'asc' } }, variants: true },
        });
        if (!product || product.status !== 'ACTIVE') throw new BadRequestException('ສິນຄ້າບໍ່ມີໃນລະບົບ');

        const variant =
          product.variants.find((v) => (line.variantId ? v.id === line.variantId : false)) ??
          product.variants.find((v) => v.size === line.size && (!line.color || v.color === line.color)) ??
          (product.variants.length === 1 ? product.variants[0] : null);

        if (!variant) throw new BadRequestException(`ກະລຸນາເລືອກຂະໜາດ/ສີ ຂອງ ${product.name}`);
        if (variant.stock < line.quantity) {
          throw new BadRequestException(`${product.name} (ເບີ ${variant.size}) ສະຕັອກບໍ່ພຽງພໍ (ຍັງເຫຼືອ ${variant.stock})`);
        }

        const price = Number(variant.price);
        subtotal += price * line.quantity;
        stockUpdates.push({ variantId: variant.id, quantity: line.quantity });
        items.push({
          product: { connect: { id: product.id } },
          variant: { connect: { id: variant.id } },
          name: product.name,
          image: product.images[0]?.url,
          size: variant.size,
          color: variant.color,
          price,
          quantity: line.quantity,
        });
      }

      // coupon
      let discount = 0;
      let couponCode: string | undefined;
      if (dto.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: dto.couponCode.toUpperCase() } });
        if (!coupon || !coupon.status) throw new BadRequestException('ຄູປອງບໍ່ຖືກຕ້ອງ');
        if (new Date() > coupon.endAt || new Date() < coupon.startAt) throw new BadRequestException('ຄູປອງໝົດອາຍຸ');
        if (Number(coupon.minSpend) > subtotal) {
          throw new BadRequestException(`ຕ້ອງຊື້ຂັ້ນຕ່ຳ ${Number(coupon.minSpend).toLocaleString()} ₭`);
        }
        discount =
          coupon.type === 'PERCENT'
            ? Math.min((subtotal * Number(coupon.value)) / 100, Number(coupon.maxDiscount ?? Infinity))
            : Number(coupon.value);
        discount = Math.min(discount, subtotal);
        couponCode = coupon.code;
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }

      const shippingFee = SHIPPING_FEES[dto.shippingMethod] ?? SHIPPING_FEES.STANDARD;
      const total = Math.max(0, subtotal + shippingFee - discount);

      const order = await tx.order.create({
        data: {
          code: orderCode(),
          customerId,
          paymentMethod: dto.paymentMethod,
          shippingMethod: dto.shippingMethod,
          subtotal,
          shippingFee,
          discount,
          total,
          couponCode,
          note: dto.note,
          recipient,
          phone,
          shippingAddress,
          items: { create: items as any },
          history: { create: { status: 'PENDING', note: 'ສ້າງຄຳສັ່ງຊື້' } },
        },
        include: orderInclude,
      });

      for (const s of stockUpdates) {
        await tx.productVariant.update({ where: { id: s.variantId }, data: { stock: { decrement: s.quantity } } });
        await tx.inventoryLog.create({
          data: { variantId: s.variantId, type: 'OUT', quantity: s.quantity, note: `ຕັດສະຕັອກ ${order.code}` },
        });
      }
      // clear cart rows that were purchased
      await tx.cartItem.deleteMany({ where: { userId: customerId, productId: { in: dto.items.map((i) => i.productId) } } });

      await tx.notification.create({
        data: {
          userId: customerId,
          title: 'ສັ່ງຊື້ສຳເລັດ 🎉',
          body: `ຄຳສັ່ງຊື້ ${order.code} ຍອດລວມ ${Number(order.total).toLocaleString()} ₭`,
          type: 'ORDER',
          data: { orderId: order.id, code: order.code },
        },
      });

      await tx.chatConversation.upsert({
        where: { customerId },
        update: {},
        create: { customerId },
      });

      return order;
    });
  }

  async myOrders(customerId: string, query: OrderQueryDto) {
    const where: Prisma.OrderWhereInput = {
      customerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { code: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [total, items, counts] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: skipOf(query),
        take: Number(query.limit ?? 10),
      }),
      this.prisma.order.groupBy({ by: ['status'], where: { customerId }, _count: true }),
    ]);
    return {
      data: items.map((o) => ({
        ...o,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        statusLabel: STATUS_LABEL[o.status],
      })),
      meta: {
        ...buildMeta(total, query),
        statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      },
    };
  }

  async myOrderDetail(customerId: string, key: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: key }, { code: key }], customerId },
      include: { items: true, history: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException('ບໍ່ພົບຄຳສັ່ງຊື້');
    return { ...order, statusLabel: STATUS_LABEL[order.status] };
  }

  async cancelByCustomer(customerId: string, key: string) {
    const order = await this.prisma.order.findFirst({ where: { OR: [{ id: key }, { code: key }] } });
    if (!order) throw new NotFoundException('ບໍ່ພົບຄຳສັ່ງຊື້');
    if (order.customerId !== customerId) throw new ForbiddenException('ບໍ່ມີສິດຍົກເລີກຄຳສັ່ງຊື້ນີ້');
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('ຄຳສັ່ງຊື້ນີ້ບໍ່ສາມາດຍົກເລີກໄດ້ (ກຳລັງຂົນສົ່ງແລ້ວ)');
    }
    return this.updateStatus(order.id, { status: 'CANCELLED', note: 'ລູກຄ້າຍົກເລີກ' });
  }

  async confirmReceived(customerId: string, key: string) {
    const order = await this.prisma.order.findFirst({ where: { OR: [{ id: key }, { code: key }], customerId } });
    if (!order) throw new NotFoundException('ບໍ່ພົບຄຳສັ່ງຊື້');
    if (order.status !== 'SHIPPING') throw new BadRequestException('ຄຳສັ່ງຊື້ຍັງບໍ່ຢູ່ໃນຂັ້ນຕອນຂົນສົ່ງ');
    return this.updateStatus(order.id, { status: 'DELIVERED', note: 'ລູກຄ້າຢືນຢັນຮັບສິນຄ້າ' });
  }

  /** Delivery timeline for the tracking screen. */
  async tracking(customerId: string, key: string) {
    const order = await this.myOrderDetail(customerId, key);
    const steps = ['PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED'];
    const currentIndex = Math.max(0, steps.indexOf(order.status));
    return {
      code: order.code,
      status: order.status,
      statusLabel: order.statusLabel,
      trackingNumber: order.trackingNumber,
      recipient: order.recipient,
      phone: order.phone,
      shippingAddress: order.shippingAddress,
      estimatedDelivery: new Date(new Date(order.createdAt).getTime() + 3 * 864e5),
      steps: steps.map((s, i) => ({
        status: s,
        label: STATUS_LABEL[s],
        done: i <= currentIndex && order.status !== 'CANCELLED',
        at: order.history.find((h) => h.status === s)?.createdAt ?? null,
      })),
      history: order.history,
    };
  }
}
