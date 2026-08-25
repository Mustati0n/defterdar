import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BalancesModule } from '../balances/balances.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { SettlementsController } from './settlements.controller.js';
import { SettlementsService } from './settlements.service.js';
import { PlansModule } from '../plans/plans.module.js';

@Module({
  imports: [AuthModule, BalancesModule, LedgersModule, PlansModule],
  controllers: [SettlementsController],
  providers: [SettlementsService],
})
export class SettlementsModule {}
