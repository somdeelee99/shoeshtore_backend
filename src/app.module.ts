import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminApiModule } from './api/admin/admin.module';
import { MobileApiModule } from './api/mobile/mobile.module';
import { ChatModule } from './modules/chat/chat.module';
import { PrismaModule } from './core/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    PrismaModule,
    ChatModule,
    // ---- Two isolated API surfaces -------------------------------
    // Website (Nuxt admin panel)
    AdminApiModule,
    // Mobile application (Flutter + GetX)
    MobileApiModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
