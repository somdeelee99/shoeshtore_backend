import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';

export interface TokenUser {
  id: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issue(user: TokenUser, scope: 'admin' | 'app') {
    const payload = { sub: user.id, role: user.role, scope };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '7d') as SignOptions['expiresIn'],
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d') as SignOptions['expiresIn'],
    });
    return { accessToken, refreshToken, tokenType: 'Bearer', scope };
  }

  async verifyRefresh(token: string) {
    return this.jwt.verifyAsync<{ sub: string; role: 'ADMIN' | 'STAFF' | 'CUSTOMER'; scope: 'admin' | 'app' }>(token, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });
  }
}
