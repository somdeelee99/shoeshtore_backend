import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { generateOtp } from '../../common/utils/helpers';
import { ChangePasswordDto, LoginDto, RegisterDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { TokenService } from './token.service';

const publicUser = (u: any) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  avatar: u.avatar,
  role: u.role,
  status: u.status,
  provider: u.provider,
  createdAt: u.createdAt,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  /** Admin panel login — only ADMIN / STAFF accounts. */
  async adminLogin(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.identifier }, { phone: dto.identifier }] },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    if (!['ADMIN', 'STAFF'].includes(user.role)) throw new UnauthorizedException('ບັນຊີນີ້ບໍ່ມີສິດເຂົ້າລະບົບຜູ້ດູແລ');
    if (user.status === 'BLOCKED') throw new UnauthorizedException('ບັນຊີຖືກລະງັບ');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    return { user: publicUser(user), ...(await this.tokens.issue(user, 'admin')) };
  }

  /** Mobile app login (email / phone + password). */
  async customerLogin(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { AND: [{ OR: [{ email: dto.identifier }, { phone: dto.identifier }] }, { role: 'CUSTOMER' }] },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    if (user.status === 'BLOCKED') throw new UnauthorizedException('ບັນຊີຖືກລະງັບ');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    return { user: publicUser(user), ...(await this.tokens.issue(user, 'app')) };
  }

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone && !dto.socialToken) {
      throw new BadRequestException('ກະລຸນາໃສ່ອີເມວ ຫຼື ເບີໂທ');
    }
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [...(dto.email ? [{ email: dto.email }] : []), ...(dto.phone ? [{ phone: dto.phone }] : [])],
      },
    });
    if (existing) throw new BadRequestException('ອີເມວ ຫຼື ເບີໂທນີ້ຖືກໃຊ້ແລ້ວ');

    const provider = dto.provider ?? 'LOCAL';
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        provider,
        // Social sign-in accounts get a random unusable password
        passwordHash: await bcrypt.hash(dto.password || `${dto.socialToken}-${Date.now()}`, 10),
        role: 'CUSTOMER',
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: user.id,
        title: 'ຍິນດີຕ້ອນຮັບ!',
        body: `ສະຫວັດດີ ${user.name} ທ່ານສ້າງບັນຊີສຳເລັດແລ້ວ 🎉`,
        type: 'SYSTEM',
      },
    });
    return { user: publicUser(user), ...(await this.tokens.issue(user, 'app')) };
  }

  /** Phone OTP login (screen 7 of the app flow). Demo: OTP is returned in dev mode. */
  async requestOtp(dto: RequestOtpDto) {
    const code = generateOtp();
    await this.prisma.otpCode.create({
      data: { phone: dto.phone, code, expiresAt: new Date(Date.now() + 5 * 60_000) },
    });
    const isDev = process.env.NODE_ENV !== 'production';
    return {
      phone: dto.phone,
      expiresIn: 300,
      // In production this is sent through an SMS gateway instead.
      devCode: isDev ? code : undefined,
      message: 'ສົ່ງລະຫັດ OTP ໄປຍັງເບີໂທຂອງທ່ານແລ້ວ',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone: dto.phone, code: dto.code, consumed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new BadRequestException('ລະຫັດ OTP ບໍ່ຖືກຕ້ອງ');
    if (otp.expiresAt < new Date()) throw new BadRequestException('ລະຫັດ OTP ໝົດອາຍຸແລ້ວ');
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    const isNew = !user;
    if (!user) {
      user = await this.prisma.user.create({
        data: { name: dto.name ?? `ລູກຄ້າ ${dto.phone.slice(-4)}`, phone: dto.phone, role: 'CUSTOMER', provider: 'LOCAL' },
      });
    }
    return { user: publicUser(user), isNew, ...(await this.tokens.issue(user, 'app')) };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.tokens.verifyRefresh(refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status === 'BLOCKED') throw new UnauthorizedException('ບັນຊີຖືກລະງັບ');
      return this.tokens.issue(user, payload.scope);
    } catch {
      throw new UnauthorizedException('Refresh token ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ');
    }
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return publicUser(user);
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; avatar?: string }) {
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    return publicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash && !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('ລະຫັດຜ່ານເດີມບໍ່ຖືກຕ້ອງ');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    return { message: 'ປ່ຽນລະຫັດຜ່ານສຳເລັດ' };
  }
}
