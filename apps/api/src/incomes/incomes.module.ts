import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { IncomesController } from './incomes.controller.js';
import { IncomesService } from './incomes.service.js';
import { PlansModule } from '../plans/plans.module.js';

@Module({
  imports: [AuthModule, LedgersModule, PlansModule],
  controllers: [IncomesController],
  providers: [IncomesService],
})
export class IncomesModule {}
