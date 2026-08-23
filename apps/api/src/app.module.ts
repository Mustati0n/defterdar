import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './health/health.module.js';
import { LedgersModule } from './ledgers/ledgers.module.js';
import { PlansModule } from './plans/plans.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: ['../../.env', '.env'],
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ limit: 100, ttl: 60_000 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    LedgersModule,
    PlansModule,
  ],
})
export class AppModule {}
