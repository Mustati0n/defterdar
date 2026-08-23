import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BalancesModule } from '../balances/balances.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [AuthModule, BalancesModule, LedgersModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
