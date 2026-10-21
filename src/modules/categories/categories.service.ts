import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { slugify } from '../../common/utils/helpers';

export interface CategoryInput {
  name: string;
  description?: string;
  image?: string;
  status?: boolean;
  sortOrder?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(onlyActive = false) {
    const categories = await this.prisma.category.findMany({
      where: onlyActive ? { status: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return categories.map((c) => ({
      ...c,
      productCount: c._count.products,
      _count: undefined,
    }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('ບໍ່ພົບໝວດໝູ່');
    return category;
  }

  async create(input: CategoryInput) {
    const slug = await this.uniqueSlug(input.name);
    return this.prisma.category.create({ data: { ...input, slug } });
  }

  async update(id: string, input: Partial<CategoryInput>) {
    await this.findOne(id);
    const data: any = { ...input };
    if (input.name) data.slug = await this.uniqueSlug(input.name, id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException('ບໍ່ສາມາດລຶບໄດ້ ເນື່ອງຈາກຍັງມີສິນຄ້າຢູ່ໃນໝວດນີ້');
    await this.prisma.category.delete({ where: { id } });
    return { message: 'ລຶບໝວດໝູ່ສຳເລັດ' };
  }

  private async uniqueSlug(name: string, ignoreId?: string) {
    const base = slugify(name) || `category-${Date.now()}`;
    let slug = base;
    let i = 1;
    while (await this.prisma.category.findFirst({ where: { slug, NOT: ignoreId ? { id: ignoreId } : undefined } })) {
      slug = `${base}-${++i}`;
    }
    return slug;
  }
}
