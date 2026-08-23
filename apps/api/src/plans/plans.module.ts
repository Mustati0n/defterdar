import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { LedgerPlansController } from './ledger-plans.controller.js';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';

@Module({
  imports: [AuthModule, LedgersModule],
  controllers: [LedgerPlansController, PlansController],
  providers: [PlansService],
})
export class PlansModule {}
