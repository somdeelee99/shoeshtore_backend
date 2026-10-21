import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
  scope: 'admin' | 'app';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, avatar: true },
    });
    if (!user) throw new UnauthorizedException('ບັນຊີນີ້ບໍ່ມີໃນລະບົບ');
    if (user.status === 'BLOCKED') throw new UnauthorizedException('ບັນຊີຖືກລະງັບການໃຊ້ງານ');
    return { ...user, scope: payload.scope };
  }
}
