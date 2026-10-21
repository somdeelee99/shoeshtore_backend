import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { AdminApiModule } from './api/admin/admin.module';
import { MobileApiModule } from './api/mobile/mobile.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  const config = app.get(ConfigService);
  const port = Number(config.get('PORT') ?? 4000);

  app.setGlobalPrefix('api');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: (config.get<string>('CORS_ORIGINS') ?? '*').split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // static uploads
  mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // Swagger — two separate documents so web & app teams are not confused
  const adminConfig = new DocumentBuilder()
    .setTitle('ShoeStore — Admin / Website API')
    .setDescription('API ສຳລັບຜູ້ດູແລລະບົບ (Nuxt.js Admin Panel) — /api/admin/*')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const appConfig = new DocumentBuilder()
    .setTitle('ShoeStore — Mobile App API')
    .setDescription('API ສຳລັບແອັບມືຖື (Flutter + GetX) — /api/app/*')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const adminDoc = SwaggerModule.createDocument(app, adminConfig, { include: [AdminApiModule] });
  const appDoc = SwaggerModule.createDocument(app, appConfig, { include: [MobileApiModule] });
  SwaggerModule.setup('docs/admin', app, adminDoc);
  SwaggerModule.setup('docs/app', app, appDoc);

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 ShoeStore API  → http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`📘 Admin docs     → http://localhost:${port}/docs/admin`, 'Bootstrap');
  Logger.log(`📗 Mobile docs    → http://localhost:${port}/docs/app`, 'Bootstrap');
}

void bootstrap();
