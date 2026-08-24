import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { BalancesModule } from '../balances/balances.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { PlansModule } from '../plans/plans.module.js';
import { OverviewController } from './overview.controller.js';
import { OverviewService } from './overview.service.js';

@Module({
  imports: [
    AuthModule,
    ActivityModule,
    BalancesModule,
    LedgersModule,
    PlansModule,
  ],
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class OverviewModule {}
