import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ProductsService } from '../../modules/products/products.service';
import { ReportsService } from '../../modules/reports/reports.service';

@ApiTags('Admin / Dashboard & Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller('admin')
export class AdminDashboardController {
  constructor(
    private readonly reports: ReportsService,
    private readonly products: ProductsService,
  ) {}

  @Get('dashboard')
  dashboard(@Query() query: { from?: string; to?: string }) {
    return this.reports.dashboard(query);
  }

  @Get('reports/revenue')
  revenue(@Query() query: { from?: string; to?: string; groupBy?: 'day' | 'month' }) {
    return this.reports.revenueReport(query);
  }

  @Get('reports/sales-by-category')
  salesByCategory(@Query() query: { from?: string; to?: string }) {
    return this.reports.salesByCategory(query);
  }

  @Get('reports/export')
  async export(@Query() query: { from?: string; to?: string }, @Res() res: Response) {
    const rows = await this.reports.revenueReport(query);
    const csv = ['period,revenue,orders,items', ...rows.map((r) => `${r.period},${r.revenue},${r.orders},${r.items}`)].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue-report.csv"');
    res.send(`\uFEFF${csv}`);
  }

  @Get('products/low-stock')
  lowStock(@Query('threshold') threshold?: string) {
    return this.products.lowStock(Number(threshold ?? 5));
  }
}
