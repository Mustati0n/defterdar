import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';
import { ExpenseSplitCalculator } from './expense-split-calculator.js';
import { PlansModule } from '../plans/plans.module.js';
@Module({
  imports: [AuthModule, LedgersModule, PlansModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpenseSplitCalculator],
})
export class ExpensesModule {}
