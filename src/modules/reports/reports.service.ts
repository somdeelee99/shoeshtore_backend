import { Injectable } from '@nestjs/common';
import { dateRange } from '../../common/utils/helpers';
import { PrismaService } from '../../core/prisma/prisma.service';

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const growth = (current: number, previous: number) =>
  previous === 0 ? (current > 0 ? 100 : 0) : Number((((current - previous) / previous) * 100).toFixed(1));

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** All KPI cards + charts for the Dashboard screen. */
  async dashboard(query: { from?: string; to?: string }) {
    const { from, to } = dateRange(query);
    const span = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - span);
    const prevTo = new Date(from.getTime() - 1);

    const baseWhere = { createdAt: { gte: from, lte: to } };
    const prevWhere = { createdAt: { gte: prevFrom, lte: prevTo } };

    const [orders, prevOrders, customers, prevCustomers, products, pendingOrders, chartOrders, statusGroups, prevStatus] =
      await Promise.all([
        this.prisma.order.findMany({ where: baseWhere, select: { total: true, status: true, paymentStatus: true } }),
        this.prisma.order.findMany({ where: prevWhere, select: { total: true } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
        this.prisma.user.count({ where: { role: 'CUSTOMER', ...prevWhere } }),
        this.prisma.product.count(),
        this.prisma.order.count({ where: { status: 'PENDING' } }),
        this.prisma.order.findMany({
          where: baseWhere,
          select: { createdAt: true, total: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.order.groupBy({ by: ['status'], where: baseWhere, _count: true }),
        this.prisma.order.groupBy({ by: ['status'], where: prevWhere, _count: true }),
      ]);

    const paid = (rows: { total: any }[]) => rows.reduce((s, o) => s + Number(o.total), 0);
    const revenue = paid(orders);
    const prevRevenue = paid(prevOrders);

    // daily revenue series
    const buckets = new Map<string, { revenue: number; orders: number }>();
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 864e5)) {
      buckets.set(dayKey(d), { revenue: 0, orders: 0 });
    }
    for (const o of chartOrders) {
      const key = dayKey(new Date(o.createdAt));
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.revenue += Number(o.total);
        bucket.orders += 1;
      }
    }
    const revenueChart = [...buckets.entries()].map(([date, v]) => ({ date, ...v }));

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { createdAt: { gte: from, lte: to } } },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });
    const productIds = topProducts.map((p) => p.productId);
    const productDetails = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } },
    });

    const categoryGroups = await this.prisma.product.groupBy({ by: ['categoryId'], _count: true });
    const categories = await this.prisma.category.findMany({ where: { id: { in: categoryGroups.map((c) => c.categoryId) } } });

    const recentOrders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { customer: { select: { name: true, avatar: true } }, items: { take: 1 } },
    });

    const statusCount = (groups: { status: string; _count: number }[], status: string) =>
      groups.find((g) => g.status === status)?._count ?? 0;

    return {
      range: { from: dayKey(from), to: dayKey(to) },
      kpis: {
        revenue: { value: revenue, growth: growth(revenue, prevRevenue) },
        orders: { value: orders.length, growth: growth(orders.length, prevOrders.length) },
        customers: { value: customers, growth: growth(Math.max(customers - prevCustomers, 0), prevCustomers) },
        products: { value: products, growth: 0 },
        pendingOrders,
      },
      revenueChart,
      orderStatusDistribution: ['PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED', 'CANCELLED'].map((status) => ({
        status,
        count: statusCount(statusGroups as any, status),
        previous: statusCount(prevStatus as any, status),
      })),
      topProducts: topProducts.map((tp) => ({
        productId: tp.productId,
        name: productDetails.find((p) => p.id === tp.productId)?.name ?? '-',
        thumbnail: productDetails.find((p) => p.id === tp.productId)?.images[0]?.url ?? null,
        quantity: tp._sum.quantity ?? 0,
        revenue: Number(tp._sum.price ?? 0) * (tp._sum.quantity ?? 0),
      })),
      categoryDistribution: categoryGroups.map((c) => ({
        category: categories.find((x) => x.id === c.categoryId)?.name ?? 'ອື່ນໆ',
        count: c._count,
      })),
      recentOrders,
    };
  }

  async salesByCategory(query: { from?: string; to?: string }) {
    const { from, to } = dateRange(query);
    const items = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: from, lte: to } } },
      include: { product: { select: { categoryId: true } } },
    });
    const categories = await this.prisma.category.findMany();
    const map = new Map<string, number>();
    for (const i of items) {
      const id = i.product.categoryId;
      map.set(id, (map.get(id) ?? 0) + Number(i.price) * i.quantity);
    }
    return [...map.entries()].map(([categoryId, revenue]) => ({
      categoryId,
      category: categories.find((c) => c.id === categoryId)?.name ?? '-',
      revenue,
    }));
  }

  async revenueReport(query: { from?: string; to?: string; groupBy?: 'day' | 'month' }) {
    const { from, to } = dateRange(query);
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });
    const keyOf = (d: Date) => (query.groupBy === 'month' ? d.toISOString().slice(0, 7) : dayKey(d));
    const map = new Map<string, { period: string; revenue: number; orders: number; items: number }>();
    for (const o of orders) {
      const key = keyOf(new Date(o.createdAt));
      const row = map.get(key) ?? { period: key, revenue: 0, orders: 0, items: 0 };
      row.revenue += Number(o.total);
      row.orders += 1;
      row.items += o.items.reduce((s, i) => s + i.quantity, 0);
      map.set(key, row);
    }
    return [...map.values()];
  }
}
