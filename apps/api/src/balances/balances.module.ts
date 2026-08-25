import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { BalanceCalculator } from './balance-calculator.js';
import { BalancesController } from './balances.controller.js';
import { BalancesService } from './balances.service.js';
import { FinancialProjectionService } from './financial-projection.service.js';
import { PlansModule } from '../plans/plans.module.js';
@Module({
  imports: [AuthModule, LedgersModule, PlansModule],
  controllers: [BalancesController],
  providers: [BalanceCalculator, FinancialProjectionService, BalancesService],
  exports: [BalanceCalculator, FinancialProjectionService, BalancesService],
})
export class BalancesModule {}
