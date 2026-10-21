import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
} as any);

const IMG = '/uploads/products';
const img = (name: string) => `${IMG}/${name}.png`;

const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 59), 0, 0);
  return d;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const money = (n: number) => n;

async function main() {
  console.log('🌱  Seeding ShoeStore...');

  /* -------------------------------- clean -------------------------------- */
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.chatConversation.deleteMany(),
    prisma.inventoryLog.deleteMany(),
    prisma.orderStatusHistory.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.review.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.address.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.user.deleteMany(),
    prisma.setting.deleteMany(),
  ]);

  /* --------------------------------- users -------------------------------- */
  const adminHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin@123', 10);
  const customerHash = await bcrypt.hash('Customer@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@shoestore.com',
      phone: '020 5555 0000',
      passwordHash: adminHash,
      role: 'ADMIN',
      avatar: img('avatar-admin'),
    },
  });
  const staff = await prisma.user.create({
    data: {
      name: 'ນາງ ສຸດາ ພົມມະຈັນ',
      email: 'staff@shoestore.com',
      phone: '020 7777 0000',
      passwordHash: adminHash,
      role: 'STAFF',
    },
  });

  const customerSeeds = [
    { name: 'ບຸນມີ ສີພອນ', phone: '020 5555 1234', email: 'bounmy@gmail.com', status: 'ACTIVE' as const },
    { name: 'ສົມໃຈ ວັນນະສິນ', phone: '020 7777 5678', email: 'somchai@gmail.com', status: 'ACTIVE' as const },
    { name: 'ນາງ ດາວວັນ ພົມມະວົງ', phone: '020 8888 9012', email: 'dao@gmail.com', status: 'ACTIVE' as const },
    { name: 'ທ້າວ ຄຳພອນ ໄຊຍະວົງ', phone: '020 9999 3456', email: 'khamphon@gmail.com', status: 'BLOCKED' as const },
    { name: 'ອາລີ ວັນນະລັກ', phone: '020 4444 7890', email: 'alee@gmail.com', status: 'ACTIVE' as const },
    { name: 'ມະລິສາ ແກ້ວມະນີ', phone: '020 3333 2211', email: 'malisa@gmail.com', status: 'ACTIVE' as const },
  ];

  const customers: any[] = [];
  for (const [i, c] of customerSeeds.entries()) {
    customers.push(
      await prisma.user.create({
        data: {
          ...c,
          passwordHash: customerHash,
          role: 'CUSTOMER',
          createdAt: daysAgo(60 - i * 5),
          avatar: img(`avatar-${(i % 4) + 1}`),
        },
      }),
    );
  }

  await prisma.address.createMany({
    data: customers.slice(0, 4).map((c, i) => ({
      userId: c.id,
      label: i === 0 ? 'ເຮືອນ' : 'ຫ້ອງການ',
      recipient: c.name,
      phone: c.phone ?? '020 5555 1234',
      province: 'ນະຄອນຫຼວງວຽງຈັນ',
      district: pick(['ຈັນທະບູລີ', 'ສີສັດຕະນາກ', 'ໄຊເສດຖາ', 'ວຽງຈັນ']),
      village: pick(['ບ້ານ ສີສະຫວາດ', 'ບ້ານ ໂພນສະຫວັນ', 'ບ້ານ ດົງປ່າລານ', 'ບ້ານ ນາຊາຍ']),
      detail: 'ຖະໜົນລ້ານຊ້າງ, ໃກ້ຕະຫຼາດເຈົ້າຟ້າງຸ່ມ',
      isDefault: true,
    })),
  });

  /* ------------------------------ categories ----------------------------- */
  const categorySeeds = [
    { name: 'ເກີບແລ່ນ', key: 'running', desc: 'ເກີບສຳລັບການແລ່ນ ແລະ ອອກກຳລັງກາຍ' },
    { name: 'ເກີບສະໄປເຕີ', key: 'sneakers', desc: 'ເກີບສະໄປເຕີແຟຊັນຕາມຍຸກສະໄໝ' },
    { name: 'ເກີບຕຳແຫນັງ', key: 'basketball', desc: 'ເກີບບາສເກດບອນ ສຳລັບສະໜາມ' },
    { name: 'ເກີບແຕະບານ', key: 'football', desc: 'ເກີບຟຸດບອນສະໜາມແຂງ ແລະ ຫຍຸ້ງ' },
    { name: 'ເກີບລຳລອງ', key: 'casual', desc: 'ເກີບລຳລອງໃສ່ສຳລັບທຸກວັນ' },
    { name: 'ເກີບເດັກນ້ອຍ', key: 'kids', desc: 'ເກີບສຳລັບເດັກນ້ອຍ' },
  ];
  const categories: any[] = [];
  for (const [i, c] of categorySeeds.entries()) {
    categories.push(
      await prisma.category.create({
        data: {
          name: c.name,
          slug: c.key,
          description: c.desc,
          image: img(`category-${c.key}`),
          sortOrder: i,
        },
      }),
    );
  }
  const cat = (key: string) => categories.find((c) => c.slug === key)!.id;

  /* -------------------------------- products ------------------------------ */
  const productSeeds = [
    {
      name: 'Nike Air Max 270',
      brand: 'Nike',
      sku: 'SKU-NK-270',
      category: 'sneakers',
      price: 2490000,
      comparePrice: 2990000,
      image: 'airmax-270',
      featured: true,
      desc: 'Nike Air Max 270 ມາພ້ອມກັບ Air unit ຂະໜາດໃຫຍ່ທີ່ສຸດເທົ່າທີ່ເຄີຍມີ ໃຫ້ຄວາມນຸ່ມສະບາຍຕະຫຼອດມື້',
      colors: [
        { name: 'ດຳ', hex: '#111827' },
        { name: 'ແດງ', hex: '#dc2626' },
        { name: 'ຂາວ', hex: '#f3f4f6' },
      ],
      sizes: ['39', '40', '41', '42', '43'],
    },
    {
      name: 'Adidas Ultraboost',
      brand: 'Adidas',
      sku: 'SKU-AD-UB',
      category: 'running',
      price: 2990000,
      comparePrice: 3490000,
      image: 'ultraboost',
      featured: true,
      desc: 'Adidas Ultraboost ພ້ອມ Boost cushioning ຕອບສະໜອງພະລັງງານທຸກກ້າວເດີນ',
      colors: [
        { name: 'ດຳ', hex: '#111827' },
        { name: 'ຂາວ', hex: '#f3f4f6' },
      ],
      sizes: ['40', '41', '42', '43', '44'],
    },
    {
      name: 'Converse Chuck Taylor',
      brand: 'Converse',
      sku: 'SKU-CV-CT',
      category: 'casual',
      price: 1590000,
      comparePrice: 1890000,
      image: 'converse',
      featured: true,
      desc: 'Converse Chuck Taylor All Star ຄລາສສິກທີ່ຢູ່ຄູ່ກັບທຸກຍຸກສະໄໝ',
      colors: [
        { name: 'ດຳ', hex: '#111827' },
        { name: 'ຂາວ', hex: '#f9fafb' },
      ],
      sizes: ['38', '39', '40', '41', '42'],
    },
    {
      name: 'Puma RS-X',
      brand: 'Puma',
      sku: 'SKU-PM-RSX',
      category: 'sneakers',
      price: 2190000,
      comparePrice: 2590000,
      image: 'puma',
      featured: false,
      desc: 'Puma RS-X ດີໄຊນ໌ຍຸກ 80s ທີ່ກັບມາແຮງ ພ້ອມ RS foam ທີ່ນຸ່ມ',
      colors: [
        { name: 'ຂາວ', hex: '#f3f4f6' },
        { name: 'ຟ້າ', hex: '#2563eb' },
      ],
      sizes: ['40', '41', '42', '43'],
    },
    {
      name: 'New Balance 574',
      brand: 'New Balance',
      sku: 'SKU-NB-574',
      category: 'casual',
      price: 1890000,
      comparePrice: 2190000,
      image: 'newbalance',
      featured: false,
      desc: 'New Balance 574 ລຳລອງທີ່ທົນທານ ໃສ່ໄດ້ທຸກມື້',
      colors: [
        { name: 'ເທົາ', hex: '#9ca3af' },
        { name: 'ດຳ', hex: '#111827' },
      ],
      sizes: ['39', '40', '41', '42', '43', '44'],
    },
    {
      name: 'Nike Air Jordan 1',
      brand: 'Nike',
      sku: 'SKU-NK-AJ1',
      category: 'basketball',
      price: 3490000,
      comparePrice: 3990000,
      image: 'jordan',
      featured: true,
      desc: 'Air Jordan 1 ຕຳນານຂອງວົງການບາສເກດບອນ ດີໄຊນ໌ທີ່ບໍ່ເຄີຍຕົກຍຸກ',
      colors: [
        { name: 'ແດງ', hex: '#dc2626' },
        { name: 'ດຳ', hex: '#111827' },
      ],
      sizes: ['40', '41', '42', '43', '44', '45'],
    },
    {
      name: 'Nike Mercurial Vapor',
      brand: 'Nike',
      sku: 'SKU-NK-MV',
      category: 'football',
      price: 2790000,
      comparePrice: 3200000,
      image: 'mercurial',
      featured: false,
      desc: 'ເກີບບານເຕະ Nike Mercurial Vapor ຄວາມໄວສູງສຸດໃນສະໜາມ',
      colors: [{ name: 'ຂຽວ', hex: '#16a34a' }],
      sizes: ['39', '40', '41', '42', '43'],
    },
    {
      name: 'Nike Air Max Kids',
      brand: 'Nike',
      sku: 'SKU-NK-KD',
      category: 'kids',
      price: 1190000,
      comparePrice: 1490000,
      image: 'kids',
      featured: false,
      desc: 'ເກີບເດັກນ້ອຍ Nike Air Max ນ້ຳໜັກເບົາ ໃສ່ງ່າຍ',
      colors: [{ name: 'ບົວ', hex: '#ec4899' }],
      sizes: ['28', '30', '32', '34'],
    },
  ];

  const products: any[] = [];
  for (const [index, p] of productSeeds.entries()) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sku: p.sku,
        brand: p.brand,
        description: p.desc,
        price: money(p.price),
        comparePrice: money(p.comparePrice),
        costPrice: money(Math.round(p.price * 0.6)),
        categoryId: cat(p.category),
        featured: p.featured,
        status: 'ACTIVE',
        rating: 0,
        soldCount: 0,
        createdAt: daysAgo(40 - index * 3),
        images: {
          create: [
            { url: img(p.image), sortOrder: 0 },
            { url: img(`${p.image}-2`), sortOrder: 1 },
            { url: img(`${p.image}-3`), sortOrder: 2 },
          ],
        },
        variants: {
          create: p.sizes.flatMap((size, si) =>
            p.colors.map((color, ci) => ({
              sku: `${p.sku}-${size}-${ci + 1}`,
              size,
              color: color.name,
              colorHex: color.hex,
              price: money(p.price),
              stock: index === 0 && size === '42' && ci === 0 ? 3 : Math.floor(Math.random() * 22) + 2,
            })),
          ),
        },
      },
      include: { variants: true, images: true },
    });
    products.push(product);
  }

  // one intentionally out-of-stock variant for the inventory screen
  await prisma.productVariant.updateMany({
    where: { productId: products[0].id, size: '41' },
    data: { stock: 0 },
  });

  /* ------------------------------ customers cart -------------------------- */
  await prisma.cartItem.createMany({
    data: [
      { userId: customers[0].id, productId: products[5].id, variantId: products[5].variants[0].id, quantity: 1 },
      { userId: customers[0].id, productId: products[1].id, variantId: products[1].variants[0].id, quantity: 1 },
      { userId: customers[1].id, productId: products[3].id, variantId: products[3].variants[0].id, quantity: 2 },
    ],
  });

  await prisma.wishlistItem.createMany({
    data: products.slice(0, 5).map((p, i) => ({ userId: customers[0].id, productId: p.id })),
    skipDuplicates: true,
  });

  /* --------------------------------- orders -------------------------------- */
  const statuses = ['PENDING', 'CONFIRMED', 'PACKING', 'SHIPPING', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'CANCELLED'] as const;
  const payments = ['COD', 'BANK_TRANSFER', 'E_WALLET', 'CREDIT_CARD'] as const;
  const shippings = ['STANDARD', 'EXPRESS', 'SAME_DAY'] as const;
  const shippingFee: Record<string, number> = { STANDARD: 30000, EXPRESS: 60000, SAME_DAY: 120000 };

  let orderSeq = 0;
  for (let d = 45; d >= 0; d--) {
    const ordersToday = d > 30 ? 1 : Math.random() > 0.35 ? 2 : 1;
    for (let k = 0; k < ordersToday; k++) {
      orderSeq += 1;
      const customer = pick(customers);
      const status = d < 2 ? pick(['PENDING', 'CONFIRMED', 'PACKING'] as const) : pick(statuses);
      const method = pick(payments);
      const ship = pick(shippings);
      const lines = Array.from({ length: Math.random() > 0.6 ? 2 : 1 }).map(() => {
        const product = pick(products);
        const variant: any = pick(product.variants);
        const quantity = Math.floor(Math.random() * 2) + 1;
        return { product, variant, quantity, price: Number(variant.price) };
      });
      const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
      const fee = shippingFee[ship];
      const discount = Math.random() > 0.8 ? Math.round(subtotal * 0.1) : 0;
      const createdAt = daysAgo(d, 8 + Math.floor(Math.random() * 10));

      const order = await prisma.order.create({
        data: {
          code: `ORD${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Vientiane' }).format(createdAt).replace(/-/g, '')}${String(1000 + orderSeq)}`,
          customerId: customer.id,
          status,
          paymentStatus: status === 'DELIVERED' ? 'PAID' : status === 'CANCELLED' ? 'REFUNDED' : 'UNPAID',
          paymentMethod: method,
          shippingMethod: ship,
          subtotal,
          shippingFee: fee,
          discount,
          total: subtotal + fee - discount,
          recipient: customer.name,
          phone: customer.phone ?? '020 5555 1234',
          shippingAddress: 'ບ້ານ ສີສະຫວາດ, ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
          trackingNumber: ['SHIPPING', 'DELIVERED'].includes(status) ? `LA${100000000 + orderSeq}` : null,
          createdAt,
          updatedAt: createdAt,
          items: {
            create: lines.map((l) => ({
              productId: l.product.id,
              variantId: l.variant.id,
              name: l.product.name,
              image: l.product.images[0]?.url,
              size: l.variant.size,
              color: l.variant.color,
              price: l.price,
              quantity: l.quantity,
            })),
          },
          history: {
            create: [
              { status: 'PENDING', note: 'ສ້າງຄຳສັ່ງຊື້', createdAt },
              ...(status !== 'PENDING'
                ? [{ status: 'CONFIRMED' as const, note: 'ຢືນຢັນຄຳສັ່ງຊື້', createdAt: new Date(createdAt.getTime() + 36e5) }]
                : []),
              ...(['SHIPPING', 'DELIVERED'].includes(status)
                ? [{ status: 'SHIPPING' as const, note: 'ສົ່ງໃຫ້ຂົນສົ່ງ', createdAt: new Date(createdAt.getTime() + 3 * 36e5) }]
                : []),
              ...(status === 'DELIVERED'
                ? [{ status: 'DELIVERED' as const, note: 'ສົ່ງສຳເລັດ', createdAt: new Date(createdAt.getTime() + 30 * 36e5) }]
                : []),
            ],
          },
        },
      });

      if (status === 'DELIVERED') {
        for (const l of lines) {
          await prisma.product.update({
            where: { id: l.product.id },
            data: { soldCount: { increment: l.quantity } },
          });
        }
      }

      if (orderSeq % 9 === 0) {
        await prisma.inventoryLog.create({
          data: {
            variantId: (randomVariant(products) as any).id,
            type: pick(['IN', 'OUT', 'ADJUST'] as const),
            quantity: Math.floor(Math.random() * 10) + 1,
            note: 'ປັບປຸງສະຕັອກດ້ວຍມື',
            userId: staff.id,
            createdAt,
          },
        });
      }
    }
  }

  /* --------------------------------- reviews ------------------------------- */
  for (const product of products) {
    const reviewers = customers.slice(0, 4);
    for (const [i, reviewer] of reviewers.entries()) {
      if (Math.random() > 0.55) continue;
      await prisma.review.create({
        data: {
          productId: product.id,
          userId: reviewer.id,
          rating: i % 3 === 0 ? 5 : i % 3 === 1 ? 4 : 5,
          comment: pick([
            'ສິນຄ້າດີຫຼາຍ ຕົງຕາມລາຍລະອຽດ ສົ່ງໄວ',
            'ໃສ່ສະບາຍ ຂະໜາດພໍດີ ແນະນຳເລີຍ',
            'ຄຸນນະພາບດີ ລາຄາຄຸ້ມຄ່າ',
            'ສີສັນງາມ ຕົງກັບຮູບ',
          ]),
          createdAt: daysAgo(Math.floor(Math.random() * 30)),
        },
      });
    }
    const agg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count.rating },
    });
  }

  /* -------------------------------- coupons -------------------------------- */
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        name: 'ສ່ວນຫຼຸດສຳລັບສະມາຊິກໃໝ່',
        type: 'PERCENT',
        value: 10,
        minSpend: 300000,
        maxDiscount: 100000,
        usageLimit: 500,
        usedCount: 42,
        startAt: daysAgo(30),
        endAt: daysAgo(-30),
      },
      {
        code: 'FREESHIP',
        name: 'ສົ່ງຟຣີຄັ້ງທຳອິດ',
        type: 'FIXED',
        value: 30000,
        minSpend: 200000,
        usageLimit: 1000,
        usedCount: 128,
        startAt: daysAgo(20),
        endAt: daysAgo(-10),
      },
      {
        code: 'SALE20',
        name: 'ຕ້ອນຮັບລະດູການໃໝ່',
        type: 'PERCENT',
        value: 20,
        minSpend: 1000000,
        maxDiscount: 400000,
        usageLimit: 200,
        usedCount: 12,
        startAt: daysAgo(5),
        endAt: daysAgo(-25),
      },
      {
        code: 'OLD50',
        name: 'ໂປຣໂມຊັ່ນໝົດອາຍຸ',
        type: 'PERCENT',
        value: 50,
        minSpend: 500000,
        usageLimit: 50,
        usedCount: 50,
        status: false,
        startAt: daysAgo(120),
        endAt: daysAgo(60),
      },
    ],
  });

  /* ---------------------------------- chat --------------------------------- */
  const conv = await prisma.chatConversation.create({
    data: {
      customerId: customers[0].id,
      lastMessage: 'ຂອບໃຈຫຼາຍໆ ຈະລໍຖ້າຮັບສິນຄ້າເດີ້',
      lastMessageAt: new Date(Date.now() - 12 * 60_000),
      unreadForStaff: 1,
    },
  });
  const messages = [
    { senderRole: 'CUSTOMER' as const, senderId: customers[0].id, body: 'ສະບາຍດີ ສອບຖາມເກີບ Nike Air Max 270 ຍັງມີເບີ 42 ບໍ?', at: 45 },
    { senderRole: 'STAFF' as const, senderId: staff.id, body: 'ສະບາຍດີຄະ ຍັງມີຄະ ສີດຳ ເບີ 42 ຍັງເຫຼືອ 10 ຄູ່', at: 40 },
    { senderRole: 'CUSTOMER' as const, senderId: customers[0].id, body: 'ມີສ່ວນຫຼຸດຫຍັງແດ່ຄະ?', at: 30 },
    { senderRole: 'STAFF' as const, senderId: staff.id, body: 'ໃຊ້ຄູປອງ WELCOME10 ຫຼຸດ 10% ໄດ້ເລີຍຄະ 🎉', at: 26 },
    { senderRole: 'CUSTOMER' as const, senderId: customers[0].id, body: 'ຂອບໃຈຫຼາຍໆ ຈະລໍຖ້າຮັບສິນຄ້າເດີ້', at: 12 },
  ];
  for (const m of messages) {
    await prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        body: m.body,
        createdAt: new Date(Date.now() - m.at * 60_000),
      },
    });
  }
  for (const c of customers.slice(1, 4)) {
    await prisma.chatConversation.create({
      data: {
        customerId: c.id,
        lastMessage: 'ສິນຄ້າທີ່ສັ່ງໄປຮອດເມື່ອໃດ?',
        lastMessageAt: daysAgo(Math.floor(Math.random() * 3) + 1),
        unreadForStaff: Math.random() > 0.5 ? 2 : 0,
      },
    });
  }

  /* ----------------------------- notifications ----------------------------- */
  const notifSeeds = [
    { title: 'ມີຄຳສັ່ງຊື້ໃໝ່', body: 'ມີ 3 ຄຳສັ່ງຊື້ລໍຖ້າຢືນຢັນ', type: 'ORDER' },
    { title: 'ສະຕັອກໃກ້ໝົດ', body: 'Nike Air Max 270 (ເບີ 41) ເຫຼືອ 0 ຄູ່', type: 'INVENTORY' },
    { title: 'ລູກຄ້າໃໝ່', body: 'ມະລິສາ ແກ້ວມະນີ ສ້າງບັນຊີໃໝ່', type: 'CUSTOMER' },
  ];
  for (const n of notifSeeds) {
    await prisma.notification.create({ data: { ...n, userId: admin.id, createdAt: daysAgo(0, 9) } });
  }
  await prisma.notification.create({
    data: {
      userId: customers[0].id,
      title: 'ຄຳສັ່ງຊື້ຂອງທ່ານກຳລັງຂົນສົ່ງ 🚚',
      body: 'ຄຳສັ່ງຊື້ຂອງທ່ານອອກຈາກສາງແລ້ວ',
      type: 'ORDER',
    },
  });
  await prisma.notification.create({
    data: {
      userId: customers[0].id,
      title: 'ຄູປອງໃໝ່!',
      body: 'ໃຊ້ WELCOME10 ຮັບສ່ວນຫຼຸດ 10%',
      type: 'PROMOTION',
    },
  });

  /* -------------------------------- settings ------------------------------- */
  await prisma.setting.createMany({
    data: [
      { key: 'storeName', value: 'ShoeStore' },
      { key: 'storeEmail', value: 'shoestore.la@gmail.com' },
      { key: 'storePhone', value: '020 5555 1234' },
      { key: 'storeAddress', value: 'ຖະໜົນລ້ານຊ້າງ, ນະຄອນຫຼວງວຽງຈັນ' },
      { key: 'storeLogo', value: '' },
      { key: 'currency', value: 'LAK' },
      { key: 'defaultLocale', value: 'lo' },
      { key: 'shippingFeeStandard', value: '30000' },
      { key: 'shippingFeeExpress', value: '60000' },
      { key: 'shippingFeeSameDay', value: '120000' },
      { key: 'freeShippingThreshold', value: '500000' },
      { key: 'supportPhone', value: '020 5555 1234' },
      { key: 'maintenanceMode', value: 'false' },
      { key: 'banner1', value: img('banner-1') },
      { key: 'banner2', value: img('banner-2') },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    orders: await prisma.order.count(),
  };
  console.log('✅  Seed completed', counts);
  console.log('👤  Admin  : admin@shoestore.com / Admin@123');
  console.log('👤  Staff  : staff@shoestore.com / Admin@123');
  console.log('🛍️  Customer: bounmy@gmail.com / Customer@123');
}

function randomVariant(products: any[]) {
  return pick(pick(products).variants);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
