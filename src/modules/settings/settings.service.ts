import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

const DEFAULT_SETTINGS: Record<string, string> = {
  storeName: 'ShoeStore',
  storeEmail: 'shoestore.la@gmail.com',
  storePhone: '020 5555 1234',
  storeAddress: 'ຖະໜົນລ້ານຊ້າງ, ນະຄອນຫຼວງວຽງຈັນ',
  storeLogo: '',
  currency: 'LAK',
  defaultLocale: 'lo',
  shippingFeeStandard: '30000',
  shippingFeeExpress: '60000',
  shippingFeeSameDay: '120000',
  freeShippingThreshold: '500000',
  supportPhone: '020 5555 1234',
  maintenanceMode: 'false',
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaults() {
    const existing = await this.prisma.setting.findMany();
    const missing = Object.entries(DEFAULT_SETTINGS).filter(([key]) => !existing.some((s) => s.key === key));
    if (missing.length) {
      await this.prisma.setting.createMany({ data: missing.map(([key, value]) => ({ key, value })), skipDuplicates: true });
    }
  }

  async getAll() {
    await this.ensureDefaults();
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async update(values: Record<string, string>) {
    await this.ensureDefaults();
    await this.prisma.$transaction(
      Object.entries(values).map(([key, value]) =>
        this.prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } }),
      ),
    );
    return this.getAll();
  }

  /** Public payload used by the app (shipping fees, support contact...). */
  async publicConfig() {
    const all = await this.getAll();
    return {
      storeName: all.storeName,
      currency: all.currency,
      supportPhone: all.supportPhone,
      storeEmail: all.storeEmail,
      shippingFees: {
        STANDARD: Number(all.shippingFeeStandard),
        EXPRESS: Number(all.shippingFeeExpress),
        SAME_DAY: Number(all.shippingFeeSameDay),
      },
      freeShippingThreshold: Number(all.freeShippingThreshold),
      maintenanceMode: all.maintenanceMode === 'true',
    };
  }
}
