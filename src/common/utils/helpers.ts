import { BadRequestException } from '@nestjs/common';

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

export function orderCode(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${`${d.getMonth() + 1}`.padStart(2, '0')}${`${d.getDate()}`.padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD${stamp}${rand}`;
}

export function dateRange(query: { from?: string; to?: string }) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 29 * 864e5);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new BadRequestException('ຮູບແບບວັນທີບໍ່ຖືກຕ້ອງ (YYYY-MM-DD)');
  }
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function generateOtp(): string {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}
