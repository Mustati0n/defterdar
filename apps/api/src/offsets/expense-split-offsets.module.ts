import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BalancesModule } from '../balances/balances.module.js';
import { LedgersModule } from '../ledgers/ledgers.module.js';
import { ExpenseSplitOffsetsController } from './expense-split-offsets.controller.js';
import { ExpenseSplitOffsetsService } from './expense-split-offsets.service.js';

@Module({
  imports: [AuthModule, BalancesModule, LedgersModule],
  controllers: [ExpenseSplitOffsetsController],
  providers: [ExpenseSplitOffsetsService],
})
export class ExpenseSplitOffsetsModule {}
