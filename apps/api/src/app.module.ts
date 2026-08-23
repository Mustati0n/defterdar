import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { validateEnvironment } from './config/environment.js';
import { HealthModule } from './health/health.module.js';
import { LedgersModule } from './ledgers/ledgers.module.js';
import { PlansModule } from './plans/plans.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { BalancesModule } from './balances/balances.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { SettlementsModule } from './settlements/settlements.module.js';
import { ExpenseSplitOffsetsModule } from './offsets/expense-split-offsets.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { IncomesModule } from './incomes/incomes.module.js';
import { ExpenseAttachmentsModule } from './attachments/expense-attachments.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { IdempotencyModule } from './idempotency/idempotency.module.js';

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
    ExpensesModule,
    BalancesModule,
    SettlementsModule,
    ExpenseSplitOffsetsModule,
    CategoriesModule,
    IncomesModule,
    ExpenseAttachmentsModule,
    ActivityModule,
    IdempotencyModule,
  ],
})
export class AppModule {}
